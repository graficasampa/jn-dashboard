import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '492019962';

if (!process.env.GA4_CREDENTIALS) {
  console.error('❌  GA4_CREDENTIALS env var não encontrada');
  process.exit(1);
}

const credentials = JSON.parse(process.env.GA4_CREDENTIALS);
const client = new BetaAnalyticsDataClient({ credentials });
const property = `properties/${PROPERTY_ID}`;

// ── Período: mês atual no horário de Brasília (UTC-3) ─────────────────────
const now = new Date();
const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
const year  = brt.getUTCFullYear();
const month = brt.getUTCMonth() + 1;
const mp    = String(month).padStart(2, '0');
const monthKey  = `${year}-${mp}`;
const startDate = `${year}-${mp}-01`;
const todayDay  = brt.getUTCDate();
const endDate   = `${year}-${mp}-${String(todayDay).padStart(2, '0')}`;
const MONTH_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DOW_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DOW_FULL  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

console.log(`📊 GA4 → ${monthKey}  (${startDate} → ${endDate})`);

// ── helpers ───────────────────────────────────────────────────────────────
const rv = (row, i) => parseFloat(row.metricValues[i]?.value  || 0);
const dv = (row, i) => row.dimensionValues[i]?.value || '';
const round2 = v => Math.round(v * 100) / 100;
function fmtDur(seconds) {
  const s = Math.round(seconds), m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

async function report(dims, mets, opts = {}) {
  const [res] = await client.runReport({
    property,
    dimensions: dims.map(n => ({ name: n })),
    metrics:    mets.map(n => ({ name: n })),
    dateRanges: [{ startDate, endDate }],
    limit: opts.limit || 100,
    ...(opts.orderBys ? { orderBys: opts.orderBys } : {}),
  });
  return res;
}

// ── CSS channel map ───────────────────────────────────────────────────────
const CH = {
  'Organic Search': { cls:'ch-org', color:'var(--grn)' },
  'Direct':         { cls:'ch-dir', color:'#0369A1' },
  'Cross-network':  { cls:'ch-ppc', color:'#C2410C' },
  'Paid Search':    { cls:'ch-ppc', color:'#EA580C' },
  'Referral':       { cls:'ch-ref', color:'#92400E' },
  'Organic Social': { cls:'ch-soc', color:'#9333EA' },
  'Paid Social':    { cls:'ch-soc', color:'var(--red)', warn: true },
  'Display':        { cls:'ch-non', color:'var(--t3)', warn: true },
  'Paid Other':     { cls:'ch-non', color:'var(--t3)', warn: true },
  'Unassigned':     { cls:'ch-non', color:'var(--t3)' },
};
const chMap = n => CH[n] || { cls:'ch-non', color:'var(--t3)' };

// ── main ──────────────────────────────────────────────────────────────────
async function main() {
  const [
    summaryRes, dailyRes, channelRes, deviceRevRes, deviceSessRes,
    citiesRes, productRes, retentionRes, pagesRes, sourcesRes,
    eventsRes, dowRes,
  ] = await Promise.all([
    // totais globais (sem dimensão)
    report([], ['totalRevenue','transactions','sessions','screenPageViews',
                'engagementRate','averageSessionDuration','bounceRate','activeUsers']),
    // diário
    report(['date'], ['totalRevenue','transactions','sessions'], {
      orderBys: [{ dimension: { dimensionName:'date' }, desc: false }],
    }),
    // canais
    report(['sessionDefaultChannelGroup'], ['totalRevenue','transactions','sessions'], {
      orderBys: [{ metric: { metricName:'totalRevenue' }, desc: true }],
    }),
    // dispositivos — receita
    report(['deviceCategory'], ['totalRevenue','transactions']),
    // dispositivos — sessões
    report(['deviceCategory'], ['sessions']),
    // cidades
    report(['city'], ['totalRevenue','transactions','sessions'], {
      limit: 50,
      orderBys: [{ metric: { metricName:'totalRevenue' }, desc: true }],
    }),
    // produtos
    report(['itemName'], ['itemRevenue','itemsPurchased'], {
      limit: 100,
      orderBys: [{ metric: { metricName:'itemRevenue' }, desc: true }],
    }),
    // retenção
    report(['newVsReturning'], ['totalRevenue','transactions','sessions','activeUsers']),
    // páginas
    report(['pagePath'], ['screenPageViews','activeUsers','userEngagementDuration','bounceRate'], {
      limit: 20,
      orderBys: [{ metric: { metricName:'screenPageViews' }, desc: true }],
    }),
    // fontes/meios
    report(['sessionSource','sessionMedium'], ['sessions','totalRevenue','transactions','bounceRate'], {
      limit: 20,
      orderBys: [{ metric: { metricName:'sessions' }, desc: true }],
    }),
    // eventos
    report(['eventName'], ['eventCount'], {
      limit: 30,
      orderBys: [{ metric: { metricName:'eventCount' }, desc: true }],
    }),
    // dia da semana
    report(['dayOfWeek'], ['totalRevenue'], {
      orderBys: [{ dimension: { dimensionName:'dayOfWeek' }, desc: false }],
    }),
  ]);

  // ── Totais ──────────────────────────────────────────────────────────────
  const sr = summaryRes.rows?.[0];
  const totalRevenue   = sr ? rv(sr, 0) : 0;
  const totalOrders    = sr ? rv(sr, 1) : 0;
  const totalSessions  = sr ? rv(sr, 2) : 0;
  const totalPageviews = sr ? rv(sr, 3) : 0;
  const engRate        = sr ? rv(sr, 4) * 100 : 0;
  const avgDur         = sr ? rv(sr, 5) : 0;
  const bounceRate     = sr ? rv(sr, 6) * 100 : 0;
  const activeUsers    = sr ? rv(sr, 7) : 0;
  const avgTicket      = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const convRate       = totalSessions > 0 ? (totalOrders / totalSessions) * 100 : 0;

  // ── Diário ──────────────────────────────────────────────────────────────
  const dailyRevenue = [];
  const dailySessions = [];
  let peakRevenue = 0, peakDateStr = '';
  dailyRes.rows?.forEach(row => {
    const ds   = dv(row, 0); // YYYYMMDD
    const day  = String(parseInt(ds.slice(6), 10)).padStart(2, '0');
    const rev  = rv(row, 0);
    const ords = Math.round(rv(row, 1));
    const sess = Math.round(rv(row, 2));
    dailyRevenue.push({ day, revenue: Math.round(rev), orders: ords });
    dailySessions.push(sess);
    if (rev > peakRevenue) { peakRevenue = rev; peakDateStr = ds; }
  });

  // ── Dia da semana ────────────────────────────────────────────────────────
  const dowRevenue = new Array(7).fill(0);
  dowRes.rows?.forEach(row => {
    dowRevenue[parseInt(dv(row, 0), 10)] = Math.round(rv(row, 0));
  });

  // ── Canais ───────────────────────────────────────────────────────────────
  const channels = (channelRes.rows || []).map(row => {
    const name = dv(row, 0);
    const rev  = rv(row, 0);
    const ord  = Math.round(rv(row, 1));
    const sess = Math.round(rv(row, 2));
    const cm   = chMap(name);
    const warn = cm.warn || (rev === 0 && name.toLowerCase().includes('paid'));
    return {
      name:      warn && name.includes('Social') ? `${name} ⚠` : (warn ? `${name} ⚠` : name),
      cls:       cm.cls,
      revenue:   rev,
      orders:    ord,
      avgTicket: ord > 0 ? round2(rev / ord) : null,
      pct:       totalRevenue > 0 ? round2((rev / totalRevenue) * 100) : 0,
      sessions:  sess || null,
      warn:      !!warn,
    };
  });

  const channelSessions = channels
    .filter(c => c.sessions)
    .sort((a, b) => (b.sessions || 0) - (a.sessions || 0))
    .slice(0, 7)
    .map(c => {
      const baseName = c.name.replace(' ⚠', '');
      return { name: baseName, cls: c.cls, color: chMap(baseName).color, sessions: c.sessions };
    });

  // ── Dispositivos ─────────────────────────────────────────────────────────
  const DEVICE_ICONS  = { desktop:'🖥', mobile:'📱', tablet:'📲' };
  const DEVICE_COLORS = { desktop:'var(--blu)', mobile:'var(--grn)', tablet:'var(--t3)' };
  const DEVICE_NAMES  = { desktop:'Desktop', mobile:'Mobile', tablet:'Tablet' };

  let totalDevRev = 0;
  const devRevRaw = (deviceRevRes.rows || []).map(row => {
    const cat = dv(row, 0).toLowerCase();
    const rev = rv(row, 0), ord = Math.round(rv(row, 1));
    totalDevRev += rev;
    return { cat, rev, ord };
  });
  const devSessMap = {};
  (deviceSessRes.rows || []).forEach(row => {
    devSessMap[dv(row, 0).toLowerCase()] = Math.round(rv(row, 0));
  });

  const devicesRevenue = devRevRaw.sort((a, b) => b.rev - a.rev).map(d => ({
    name:      DEVICE_NAMES[d.cat] || d.cat,
    orders:    d.ord,
    revenue:   d.rev,
    pct:       totalDevRev > 0 ? round2((d.rev / totalDevRev) * 100) : 0,
    avgTicket: d.ord > 0 ? round2(d.rev / d.ord) : 0,
    color:     DEVICE_COLORS[d.cat] || 'var(--t3)',
  }));

  const devices = Object.entries(devSessMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, sess]) => ({
      name:     `${DEVICE_ICONS[cat] || '💻'} ${DEVICE_NAMES[cat] || cat}`,
      sessions: sess,
      pct:      totalSessions > 0 ? round2((sess / totalSessions) * 100) : 0,
    }));

  // ── Cidades ───────────────────────────────────────────────────────────────
  const cities = (citiesRes.rows || []).slice(0, 15).map((row, i) => {
    const name = dv(row, 0), rev = rv(row, 0),
          ord  = Math.round(rv(row, 1)), sess = Math.round(rv(row, 2));
    return {
      rank: i + 1, name, revenue: rev, orders: ord, sessions: sess,
      avgTicket: ord > 0 ? round2(rev / ord) : 0,
      pct: totalRevenue > 0 ? round2((rev / totalRevenue) * 100) : 0,
    };
  });

  const topCitiesSessions = [...(citiesRes.rows || [])]
    .sort((a, b) => rv(b, 2) - rv(a, 2))
    .slice(0, 4)
    .map(row => ({ name: dv(row, 0), sessions: Math.round(rv(row, 2)) }));

  // ── Produtos ──────────────────────────────────────────────────────────────
  const totalProductsCount = productRes.rowCount || (productRes.rows || []).length;
  let top50Revenue = 0;
  const top50Products = (productRes.rows || []).slice(0, 50).map(row => {
    const name = dv(row, 0), rev = rv(row, 0), qty = Math.round(rv(row, 1));
    top50Revenue += rev;
    return [name, round2(rev), qty];
  });
  const itemsSold = top50Products.reduce((s, [,, q]) => s + q, 0);

  // ── Eventos / Funil ───────────────────────────────────────────────────────
  const eventMap = {};
  (eventsRes.rows || []).forEach(row => { eventMap[dv(row, 0)] = Math.round(rv(row, 0)); });

  const formStarts  = eventMap['form_start']  || 0;
  const formSubmits = eventMap['form_submit']  || eventMap['submit'] || 0;
  const formRate    = formStarts > 0 ? (formSubmits / formStarts) * 100 : 0;

  const funnelBase = Math.round(activeUsers) || 1;
  const funnelCounts = [
    funnelBase,
    eventMap['view_item']       || 0,
    eventMap['add_to_cart']     || 0,
    eventMap['begin_checkout']  || 0,
    Math.round(totalOrders),
  ];
  const funnel = [
    { step:1, name:'Usuários totais no site',                count:funnelCounts[0], pct:100,  base:true },
    { step:2, name:'Visualizaram produto (view_item)',        count:funnelCounts[1], pct:round2((funnelCounts[1]/funnelBase)*100), base:false },
    { step:3, name:'Adicionaram ao carrinho',                 count:funnelCounts[2], pct:round2((funnelCounts[2]/funnelBase)*100), note:'add_to_cart', base:false },
    { step:4, name:'Iniciaram checkout',                      count:funnelCounts[3], pct:round2((funnelCounts[3]/funnelBase)*100), note:`${round2((funnelCounts[3]/(funnelCounts[2]||1))*100)}% do carrinho`, base:false },
    { step:5, name:'Concluíram o pedido',                     count:funnelCounts[4], pct:round2((funnelCounts[4]/funnelBase)*100), note:`${round2((funnelCounts[4]/(funnelCounts[3]||1))*100)}% do checkout ✓`, highlight:true, base:false },
  ];

  const SKIP_EVT = new Set(['session_start','user_engagement','first_visit','page_view','scroll','gtm.dom','gtm.load']);
  const events = (eventsRes.rows || [])
    .filter(row => !SKIP_EVT.has(dv(row, 0)))
    .slice(0, 7)
    .map(row => ({
      name:      dv(row, 0),
      count:     Math.round(rv(row, 0)),
      highlight: dv(row, 0) === 'purchase',
    }));

  // ── Retenção ──────────────────────────────────────────────────────────────
  const retMap = {};
  (retentionRes.rows || []).forEach(row => {
    retMap[dv(row, 0)] = {
      revenue: rv(row, 0), orders: Math.round(rv(row, 1)),
      sessions: Math.round(rv(row, 2)), users: Math.round(rv(row, 3)),
    };
  });
  const mkRet = (m) => ({
    users:          m.users,
    sessions:       m.sessions,
    orders:         m.orders,
    revenue:        Math.round(m.revenue),
    revPct:         totalRevenue > 0 ? round2((m.revenue / totalRevenue) * 100) : 0,
    convRate:       m.sessions > 0 ? round2((m.orders / m.sessions) * 100) : 0,
    revenuePerUser: m.users > 0 ? round2(m.revenue / m.users) : 0,
  });
  const retention = {
    returning: mkRet(retMap['returning'] || { revenue:0, orders:0, sessions:0, users:0 }),
    new:       mkRet(retMap['new']       || { revenue:0, orders:0, sessions:0, users:0 }),
  };

  // ── Páginas ───────────────────────────────────────────────────────────────
  const pages = (pagesRes.rows || []).slice(0, 13).map(row => ({
    path:     dv(row, 0),
    views:    Math.round(rv(row, 1)),
    users:    Math.round(rv(row, 2)),
    duration: fmtDur(rv(row, 2) > 0 ? rv(row, 3) / rv(row, 2) : 0),
    bounce:   round2(rv(row, 4) * 100),
  }));

  // ── Fontes ────────────────────────────────────────────────────────────────
  const sources = (sourcesRes.rows || []).slice(0, 10).map(row => {
    const src    = dv(row, 0), med = dv(row, 1);
    const source = `${src} / ${med}`;
    const sess   = Math.round(rv(row, 0));
    const rev    = rv(row, 1);
    const ord    = Math.round(rv(row, 2));
    const bounce = round2(rv(row, 3) * 100);
    const isPaidNoRev = (med.includes('paid') || med === 'cpc' || med === 'cpm') && rev === 0;
    const warn   = isPaidNoRev ? true : bounce > 80 ? 'amb' : false;
    return { source, sessions: sess, revenue: Math.round(rev), orders: ord, bounce, warn };
  });

  // ── KPIs ─────────────────────────────────────────────────────────────────
  let peakLabel = '';
  if (peakDateStr) {
    const pd = new Date(
      parseInt(peakDateStr.slice(0,4)), parseInt(peakDateStr.slice(4,6))-1, parseInt(peakDateStr.slice(6,8))
    );
    peakLabel = `${parseInt(peakDateStr.slice(6,8))}/Jun (${DOW_SHORT[pd.getDay()]})`;
  }

  const kpis = {
    revenuePerDay:     Math.round(totalRevenue / todayDay),
    revenuePerDayPeak: {
      value: Math.round(peakRevenue),
      date:  peakDateStr ? `${peakDateStr.slice(0,4)}-${peakDateStr.slice(4,6)}-${peakDateStr.slice(6,8)}` : '',
      label: peakLabel,
    },
    itemsSold,
    itemsPerOrder:      totalOrders > 0 ? round2(itemsSold / totalOrders) : 0,
    revenuePerSession:  totalSessions > 0 ? round2(totalRevenue / totalSessions) : 0,
    sessions:           Math.round(totalSessions),
    pageviews:          Math.round(totalPageviews),
    pagesPerSession:    totalSessions > 0 ? round2(totalPageviews / totalSessions) : 0,
    engagementRate:     round2(engRate),
    avgSessionDuration: fmtDur(avgDur),
    bounceRate:         round2(bounceRate),
    returningCustomerRate: retention.returning.revPct,
    returningRevenue:      retention.returning.revenue,
    returningCustomers:    retention.returning.users,
    top50ProductRevenue:   totalRevenue > 0 ? round2((top50Revenue / totalRevenue) * 100) : 0,
    totalProducts:         totalProductsCount,
  };

  // ── Insights automáticos ──────────────────────────────────────────────────
  const topCh     = channels[0];
  const paidSoc   = channels.find(c => c.warn && c.name.includes('Social'));
  const mobDev    = devicesRevenue.find(d => d.name === 'Mobile');
  const bestDow   = dowRevenue.reduce((b, v, i) => v > dowRevenue[b] ? i : b, 1);
  const retRatio  = retention.returning.users > 0 && retention.new.users > 0
    ? round2(retention.returning.revenuePerUser / retention.new.revenuePerUser)
    : 0;

  const insights = [
    {
      type:'pos', tag:'✓ Canal #1',
      title: `${(topCh?.name||'').replace(' ⚠','')} lidera com ${(topCh?.pct||0).toFixed(1)}% da receita`,
      body: `Gerou R$ ${Math.round(topCh?.revenue||0).toLocaleString('pt-BR')} no período. Canal orgânico forte = custo de aquisição baixo.`,
    },
    retention.returning.revPct > 80 ? {
      type:'pos', tag:'★ Fidelização',
      title: `Recorrentes = ${retention.returning.revPct.toFixed(1)}% da receita`,
      body: `Clientes fiéis valem ${retRatio}× mais por usuário. Considere programa de loyalty para ampliar ainda mais este impacto.`,
    } : {
      type:'warn', tag:'⚑ Retenção',
      title: `Recorrentes respondem por apenas ${retention.returning.revPct.toFixed(1)}%`,
      body: `Novos clientes dominam a receita. Implemente e-mail pós-compra e remarketing para converter clientes em recorrentes.`,
    },
    paidSoc ? {
      type:'neg', tag:'⚠ Paid Social',
      title: 'Meta Ads sem receita rastreável no GA4',
      body: `Paid Social registra R$ 0 de receita atribuída. Verifique pixel Meta e consistência do rastreamento de conversões entre plataformas.`,
    } : {
      type:'pos', tag:'✓ Conversão',
      title: `Taxa de conversão de ${convRate.toFixed(1)}% — benchmark: 1–3%`,
      body: `JN Impressão opera bem acima da média do e-commerce. Reflete alta intenção de compra da base e bom UX no funil.`,
    },
    mobDev && mobDev.pct < 5 ? {
      type:'warn', tag:'⚑ Mobile',
      title: `Mobile = apenas ${mobDev.pct.toFixed(1)}% da receita`,
      body: `Sessões mobile representam parcela maior que a receita convertida. Revise velocidade de carregamento e checkout mobile.`,
    } : {
      type:'pos', tag:'✓ Multi-device',
      title: `Receita distribuída entre dispositivos`,
      body: `Boa performance cross-device indica consistência na experiência de compra. Monitore ticket médio por plataforma.`,
    },
    {
      type:'pos', tag:'★ Dia da Semana',
      title: `${DOW_FULL[bestDow]} é o melhor dia — R$ ${dowRevenue[bestDow].toLocaleString('pt-BR')}`,
      body: `Concentre campanhas e promoções nos dias de pico. Fins de semana naturalmente mais fracos em gráfica B2B.`,
    },
    top50Products.length > 0 ? {
      type:'pos', tag:'✓ Portfólio',
      title: `Top 50 produtos = ${kpis.top50ProductRevenue.toFixed(1)}% da receita`,
      body: `"${top50Products[0][0]}" lidera com R$ ${Math.round(top50Products[0][1]).toLocaleString('pt-BR')}. Foque estoque e campanhas nos produtos âncora.`,
    } : {
      type:'warn', tag:'⚑ E-commerce',
      title: 'Dados de produtos não disponíveis',
      body: 'Verifique configuração de Enhanced Ecommerce / GA4 Event: purchase com items array preenchido.',
    },
  ];

  // ── Montagem final ────────────────────────────────────────────────────────
  const output = {
    period: {
      month: monthKey,
      label: `${MONTH_PT[month-1]} ${year}`,
      days:  todayDay,
      range: `01 a ${String(todayDay).padStart(2,'0')}/${mp}`,
    },
    property: { id: PROPERTY_ID, name: 'JNRevenda' },
    summary: {
      revenue:        Math.round(totalRevenue),
      orders:         Math.round(totalOrders),
      avgTicket:      round2(avgTicket),
      conversionRate: round2(convRate),
    },
    kpis, dailyRevenue, dailySessions, dowRevenue, channels, devicesRevenue, devices,
    cities, top50Products, funnel,
    formStats: { starts: formStarts, submits: formSubmits, rate: round2(formRate) },
    retention, pages, sources, channelSessions, topCitiesSessions, events, insights,
  };

  const outDir = join(ROOT, 'public', 'data', monthKey);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'ga4.json'), JSON.stringify(output, null, 2));
  console.log(`✅ public/data/${monthKey}/ga4.json atualizado`);
  writeLastUpdated({ ga4: true });
}

function writeLastUpdated(sources) {
  const luPath = join(ROOT, 'public', 'data', 'lastUpdated.json');
  let existing = {};
  try { existing = JSON.parse(readFileSync(luPath, 'utf-8')); } catch {}
  writeFileSync(luPath, JSON.stringify({
    ...existing,
    ts: new Date().toISOString(),
    month: monthKey,
    sources: { ...(existing.sources || {}), ...sources },
  }, null, 2));
}

main().catch(e => { console.error('❌ GA4 fetch falhou:', e.message); process.exit(1); });
