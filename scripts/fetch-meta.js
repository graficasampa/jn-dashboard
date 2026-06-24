import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TOKEN      = process.env.META_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.META_ACCOUNT_ID || 'act_489839481099112';
const API_VER    = 'v21.0';
const BASE       = `https://graph.facebook.com/${API_VER}`;

if (!TOKEN) {
  console.error('❌  META_ACCESS_TOKEN env var não encontrada');
  process.exit(1);
}

// ── Período: mês atual (BRT UTC-3) ───────────────────────────────────────
const now = new Date();
const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
const year  = brt.getUTCFullYear();
const month = brt.getUTCMonth() + 1;
const mp    = String(month).padStart(2, '0');
const monthKey  = `${year}-${mp}`;
const startDate = `${year}-${mp}-01`;
const todayDay  = brt.getUTCDate();
const endDate   = `${year}-${mp}-${String(todayDay).padStart(2,'0')}`;
const MONTH_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

console.log(`📢 Meta Ads → ${monthKey}  (${startDate} → ${endDate})`);

const round2 = v => Math.round(v * 100) / 100;

async function api(path, params = {}) {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set('access_token', TOKEN);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.error) throw new Error(`Meta API: ${json.error.message}`);
  return json;
}

function getAction(actions, type) {
  return parseFloat(actions?.find(a => a.action_type === type)?.value || 0);
}
function getActionValue(avs, type) {
  return parseFloat(avs?.find(a => a.action_type === type)?.value || 0);
}

async function main() {
  const timeRange = JSON.stringify({ since: startDate, until: endDate });

  // ── 1. Resumo da conta ───────────────────────────────────────────────────
  const insightsFields = 'spend,impressions,clicks,reach,frequency,actions,action_values,cpm,cpc,ctr';
  const [accountInsights, campaignsData] = await Promise.all([
    api(`${ACCOUNT_ID}/insights`, {
      fields: insightsFields,
      time_range: timeRange,
      level: 'account',
    }),
    api(`${ACCOUNT_ID}/campaigns`, {
      fields: `name,status,insights.date_preset(custom){${insightsFields}}`,
      time_range: timeRange,
      limit: 20,
    }),
  ]);

  const ai = accountInsights.data?.[0] || {};
  const spend       = parseFloat(ai.spend || 0);
  const impressions = parseInt(ai.impressions || 0);
  const clicks      = parseInt(ai.clicks || 0);
  const reach       = parseInt(ai.reach || 0);
  const frequency   = parseFloat(ai.frequency || 0);
  const cpm         = parseFloat(ai.cpm || 0);
  const cpc         = parseFloat(ai.cpc || 0);
  const ctr         = parseFloat(ai.ctr || 0);

  const purchases      = getAction(ai.actions, 'purchase');
  const revenue        = getActionValue(ai.action_values, 'purchase');
  const conversations  = getAction(ai.actions, 'onsite_conversion.messaging_conversation_started_7d')
                      || getAction(ai.actions, 'lead');
  const roasSales      = spend > 0 ? round2(revenue / spend) : 0;
  const cpa            = purchases > 0 ? round2(spend / purchases) : 0;
  const costPerMessage = conversations > 0 ? round2(spend / conversations) : 0;

  // ── 2. Campanhas ─────────────────────────────────────────────────────────
  const campaigns = (campaignsData.data || [])
    .filter(c => c.insights?.data?.[0])
    .map(c => {
      const ins     = c.insights.data[0];
      const cSpend  = parseFloat(ins.spend || 0);
      const cImpr   = parseInt(ins.impressions || 0);
      const cClicks = parseInt(ins.clicks || 0);
      const cCtr    = parseFloat(ins.ctr || 0);

      const cPurch   = getAction(ins.actions, 'purchase');
      const cConv    = getAction(ins.actions, 'onsite_conversion.messaging_conversation_started_7d')
                    || getAction(ins.actions, 'lead');
      const cRev     = getActionValue(ins.action_values, 'purchase');
      const cRoas    = cSpend > 0 && cRev > 0 ? round2(cRev / cSpend) : null;

      let resultType, result, cpr;
      if (cPurch > 0) {
        resultType = 'purchases'; result = Math.round(cPurch);
        cpr = cSpend > 0 ? round2(cSpend / cPurch) : 0;
      } else if (cConv > 0) {
        resultType = 'conversations'; result = Math.round(cConv);
        cpr = cSpend > 0 ? round2(cSpend / cConv) : 0;
      } else {
        const eng = getAction(ins.actions, 'post_engagement') || cClicks;
        resultType = 'engagements'; result = Math.round(eng);
        cpr = eng > 0 ? round2(cSpend / eng) : 0;
      }

      return {
        name: c.name,
        status: c.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
        spend: round2(cSpend),
        revenue: cRev > 0 ? round2(cRev) : null,
        roas: cRoas,
        ctr: round2(cCtr),
        cpr,
        result,
        resultType,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  // ── 3. Top Anúncios ───────────────────────────────────────────────────────
  const adsData = await api(`${ACCOUNT_ID}/ads`, {
    fields: `name,status,creative{id},insights.date_preset(custom){spend,impressions,clicks,ctr,actions,action_values}`,
    time_range: timeRange,
    limit: 30,
  });

  const topAds = (adsData.data || [])
    .filter(a => a.insights?.data?.[0])
    .map(a => {
      const ins    = a.insights.data[0];
      const aSpend = parseFloat(ins.spend || 0);
      const aPurch = getAction(ins.actions, 'purchase');
      const aConv  = getAction(ins.actions, 'onsite_conversion.messaging_conversation_started_7d')
                  || getAction(ins.actions, 'lead');
      const aRev   = getActionValue(ins.action_values, 'purchase');
      const aRoas  = aSpend > 0 && aRev > 0 ? round2(aRev / aSpend) : null;

      let resultType, result, cpr;
      if (aPurch > 0) {
        resultType = 'purchases'; result = Math.round(aPurch);
        cpr = aSpend > 0 ? round2(aSpend / aPurch) : 0;
      } else if (aConv > 0) {
        resultType = 'conversations'; result = Math.round(aConv);
        cpr = aSpend > 0 ? round2(aSpend / aConv) : 0;
      } else {
        const clicks = parseInt(ins.clicks || 0);
        resultType = 'engagements'; result = clicks;
        cpr = clicks > 0 ? round2(aSpend / clicks) : 0;
      }

      return {
        adId:        a.id,
        creativeId:  a.creative?.id,
        name:        a.name,
        status:      a.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
        spend:       round2(aSpend),
        roas:        aRoas,
        impressions: parseInt(ins.impressions || 0),
        ctr:         round2(parseFloat(ins.ctr || 0)),
        cpr, result, resultType,
      };
    })
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)
    .map((a, i) => ({ rank: i + 1, ...a }));

  // ── 4. Criativos com preview ───────────────────────────────────────────────
  const top5Ads = topAds.slice(0, 5);
  const previews = await Promise.all(
    top5Ads.map(async a => {
      try {
        const p = await api(`${a.adId}/previews`, { ad_format: 'MOBILE_FEED_STANDARD' });
        const iframeHtml = p.data?.[0]?.body || '';
        const srcMatch = iframeHtml.match(/src="([^"]+)"/);
        return srcMatch ? srcMatch[1].replace(/&amp;/g, '&') : null;
      } catch { return null; }
    })
  );

  const topCreatives = top5Ads.map((a, i) => ({
    name:       a.name,
    spend:      a.spend,
    result:     a.result,
    resultType: a.resultType,
    roas:       a.roas,
    cpr:        a.cpr,
    previewUrl: previews[i] || '',
  }));

  // ── 5. Insights ────────────────────────────────────────────────────────────
  const topCamp = campaigns[0];
  const paused  = campaigns.filter(c => c.status === 'PAUSED').length;

  const insights = [
    roasSales >= 10 ? {
      type:'pos', tag:'★ ROAS',
      title: `ROAS de vendas ${roasSales.toFixed(1)}× — excelente eficiência`,
      body: `R$ 1 investido retornou R$ ${roasSales.toFixed(2)} em receita. Benchmark saudável para gráfica digital: ROAS acima de 8×.`,
    } : {
      type:'warn', tag:'⚑ ROAS',
      title: `ROAS de ${roasSales.toFixed(1)}× — abaixo do benchmark`,
      body: `Meta recomenda ROAS mínimo de 8× para campanhas de e-commerce. Revise criativos, segmentação e orçamento das campanhas de compra.`,
    },
    {
      type:'pos', tag:'✓ Conversas',
      title: `${Math.round(conversations)} conversas no WhatsApp — R$ ${costPerMessage.toFixed(2)}/mensagem`,
      body: `Canal de WhatsApp com custo eficiente. Mensagens humanizadas têm alto potencial de fechar pedidos customizados.`,
    },
    cpa < 10 ? {
      type:'pos', tag:'★ CPA',
      title: `CPA de R$ ${cpa.toFixed(2)} por compra — muito competitivo`,
      body: `Com ticket médio de ~R$ 100, o CPA representa ${((cpa/100)*100).toFixed(1)}% do ticket. Meta para campanhas de venda está bem calibrada.`,
    } : {
      type:'warn', tag:'⚑ CPA',
      title: `CPA de R$ ${cpa.toFixed(2)} — revise criativo ou segmentação`,
      body: `Custo por compra acima de R$ 10 pode comprimir a margem em produtos de ticket menor. Teste novos públicos e criativos.`,
    },
    {
      type: frequency > 3 ? 'warn' : 'pos',
      tag: frequency > 3 ? '⚑ Frequência' : '✓ Alcance',
      title: frequency > 3
        ? `Frequência de ${frequency.toFixed(2)}× — risco de fadiga`
        : `${reach.toLocaleString('pt-BR')} pessoas alcançadas · frequência ${frequency.toFixed(2)}×`,
      body: frequency > 3
        ? 'Público vendo o mesmo anúncio muitas vezes. Renove criativos ou amplie o público para reduzir a saturação.'
        : `Frequência controlada — público recebendo a mensagem sem saturação. CTR de ${ctr.toFixed(2)}% confirma boa receptividade.`,
    },
    topCamp ? {
      type:'pos', tag:'★ Campanha #1',
      title: `"${topCamp.name.substring(0,40)}" — maior gasto`,
      body: `R$ ${topCamp.spend.toLocaleString('pt-BR')} investidos${topCamp.roas ? `, ROAS ${topCamp.roas.toFixed(1)}×` : ''}. ${topCamp.status === 'ACTIVE' ? 'Campanha ativa.' : 'Campanha pausada.'}`,
    } : { type:'warn', tag:'⚑ Campanhas', title:'Sem dados de campanha', body:'Nenhuma campanha com dados de performance no período selecionado.' },
    paused > 0 ? {
      type:'warn', tag:'⚑ Otimização',
      title: `${paused} campanha${paused > 1 ? 's' : ''} pausada${paused > 1 ? 's' : ''} no período`,
      body: `Campanhas pausadas reduzem o alcance total. Avalie se devem ser reativadas com criativos renovados ou budgets ajustados.`,
    } : {
      type:'pos', tag:'✓ Status',
      title: 'Todas as campanhas ativas no período',
      body: 'Cobertura total de campanhas sem interrupções. Monitore indicadores diários para ajustes de bid e orçamento.',
    },
  ];

  // ── Montagem final ────────────────────────────────────────────────────────
  const output = {
    period: {
      label: `${MONTH_PT[month-1]} ${year}`,
      range: `${String(1).padStart(2,'0')}/${mp} – ${String(todayDay).padStart(2,'0')}/${mp}/${year}`,
      days:  todayDay,
    },
    account: { id: ACCOUNT_ID, name: 'JN Impressão' },
    summary: {
      spend, revenue: Math.round(revenue), purchases: Math.round(purchases),
      conversations: Math.round(conversations), reach, frequency,
      impressions, clicks,
    },
    kpis: { cpa, costPerMessage, roasSales, cpm: round2(cpm), cpc: round2(cpc), ctr: round2(ctr) },
    campaigns,
    topAds: topAds.map(({ adId, creativeId, ...rest }) => rest),
    topCreatives,
    insights,
  };

  const outDir = join(ROOT, 'public', 'data', monthKey);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(output, null, 2));
  console.log(`✅ public/data/${monthKey}/meta.json atualizado`);
  writeLastUpdated({ meta: true });
}

function writeLastUpdated(sources) {
  const luPath = join(ROOT, 'public', 'data', 'lastUpdated.json');
  let existing = {};
  try { existing = JSON.parse(readFileSync(luPath, 'utf-8')); } catch {}
  const mp2 = String(new Date().getUTCMonth() + 1).padStart(2, '0');
  writeFileSync(luPath, JSON.stringify({
    ...existing,
    ts: new Date().toISOString(),
    month: monthKey,
    sources: { ...(existing.sources || {}), ...sources },
  }, null, 2));
}

main().catch(e => { console.error('❌ Meta fetch falhou:', e.message); process.exit(1); });
