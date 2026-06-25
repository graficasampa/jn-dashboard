// ══════════════════════════════════════════════════════════════
//  JN Gráfica · Sincronização Google Sheets
//  Cole este código em: planilha → Extensões → Apps Script
//
//  Estrutura da planilha:
//    📊 Histórico  → 1 linha por mês, acumula para sempre
//    Jun/26        → aba completa do mês (GA4 + Meta + G.Ads)
//    Mai/26, Abr/26, ...  → idem para cada mês
// ══════════════════════════════════════════════════════════════

const CONFIG = {
  spreadsheetId: '1Ew8htcY-2TxEFaCELAoYFxvPKvPrmFut1KM29RZoV5o',
  baseUrl:       'https://jn-dash.vercel.app',
  month:         '2026-06',   // ← mês padrão (usa sincronizar())
};

// Todos os meses disponíveis — mais antigo primeiro
const TODOS_OS_MESES = [
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
];

// ── ENTRADA PRINCIPAL — sincroniza 1 mês (CONFIG.month) ───────
function sincronizar() {
  sincronizarMes(CONFIG.month);
}

// ── Sincroniza TODOS os meses históricos (chame 1× para popular) ─
function sincronizarTodos() {
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  TODOS_OS_MESES.forEach(month => {
    try {
      Logger.log(`Sincronizando ${month}…`);
      _sincronizarMesInterno(ss, month);
    } catch (e) {
      Logger.log(`ERRO em ${month}: ${e.message}`);
    }
  });
  _registrarConfig(ss, 'Todos os meses');
  Logger.log('sincronizarTodos() concluído.');
}

// ── Sincroniza 1 mês passado como parâmetro ───────────────────
function sincronizarMes(month) {
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  _sincronizarMesInterno(ss, month);
  _registrarConfig(ss, mesLabel(month));
  Logger.log(`Sincronização de ${mesLabel(month)} concluída.`);
}

function _sincronizarMesInterno(ss, month) {
  const label = mesLabel(month);
  const ga4   = buscarJSON(`${CONFIG.baseUrl}/data/${month}/ga4.json`);
  const meta  = buscarJSON(`${CONFIG.baseUrl}/data/${month}/meta.json`);
  const gads  = buscarJSON(`${CONFIG.baseUrl}/data/${month}/gads.json`);

  atualizarHistorico(ss, ga4, meta, gads, month);
  escreverMes(ss, ga4, meta, gads, label);
}

function _registrarConfig(ss, labelMes) {
  const cfg = obterOuCriarAba(ss, '⚙ Config');
  cfg.getRange('A1').setValue('Última sincronização');
  cfg.getRange('B1').setValue(new Date()).setNumberFormat('dd/mm/yyyy HH:mm');
  cfg.getRange('A2').setValue('Mês sincronizado');
  cfg.getRange('B2').setValue(labelMes);
  SpreadsheetApp.flush();
}

// ══════════════════════════════════════════════════════════════
//  ABA DO MÊS — GA4 + Meta + Google Ads em uma só aba
// ══════════════════════════════════════════════════════════════
function escreverMes(ss, ga4, meta, gads, label) {
  const aba = obterOuCriarAba(ss, label);
  aba.clearContents();
  aba.clearFormats();
  let R = 1;  // linha atual

  const gadsSpend = gads.summary.spend;
  const metaSpend = meta.summary.spend;
  const totalInv  = gadsSpend + metaSpend;
  const revenue   = ga4.summary.revenue;
  const roasGeral = totalInv > 0 ? revenue / totalInv : 0;

  // ── TÍTULO ──────────────────────────────────────────────────
  mesclarTitulo(aba, R++, `JN Gráfica · ${ga4.period.label}   ·   ${ga4.period.range}   ·   ${ga4.period.days} dias`, '#1a1a2e', 14);
  R++;

  // ── RESUMO EXECUTIVO ─────────────────────────────────────────
  secTitle(aba, R++, '📊  RESUMO EXECUTIVO', '#1a73e8');
  R++;
  setRow(aba, R++, ['Receita Total', 'Pedidos', 'Ticket Médio', 'Invest. Total', 'ROAS Geral', 'G.Ads Conv.', 'Meta Compras', 'Meta Conversas WPP'],
    { bg: '#e8f0fe', bold: true, cols: 8 });
  const resumoVals = [revenue, ga4.summary.orders, ga4.summary.avgTicket, totalInv, roasGeral,
    gads.summary.attributedConversions, meta.summary.purchases, meta.summary.conversations || 0];
  setRow(aba, R, resumoVals, { cols: 8 });
  aba.getRange(R, 1).setNumberFormat('"R$"#,##0.00');
  aba.getRange(R, 3).setNumberFormat('"R$"#,##0.00');
  aba.getRange(R, 4).setNumberFormat('"R$"#,##0.00');
  aba.getRange(R, 5).setNumberFormat('0.0"×"');
  aba.getRange(R, 2, 1, 1).setFontSize(16).setFontWeight('bold').setFontColor('#0A8A58');
  aba.getRange(R, 1, 1, 1).setFontSize(14).setFontWeight('bold').setFontColor('#0A8A58');
  R++;
  R++;

  // ══════════════════════════════════════════════════════════════
  //  GOOGLE ANALYTICS 4
  // ══════════════════════════════════════════════════════════════
  secTitle(aba, R++, '📈  GOOGLE ANALYTICS 4   ·   GA4 Prop. 492019962', '#E37400');
  R++;

  twoColSection(aba, R, [
    ['Receita',           revenue,                        'moeda'  ],
    ['Pedidos',           ga4.summary.orders,              'numero' ],
    ['Ticket Médio',      ga4.summary.avgTicket,           'moeda'  ],
    ['Taxa de Conversão', ga4.summary.conversionRate,      'pct'    ],
    ['Sessões',           ga4.kpis.sessions,               'numero' ],
    ['Pageviews',         ga4.kpis.pageviews,              'numero' ],
    ['Itens Vendidos',    ga4.kpis.itemsSold,              'numero' ],
    ['Páginas/Sessão',    ga4.kpis.pagesPerSession,        'numero2'],
    ['Engajamento',       ga4.kpis.engagementRate,         'pct'    ],
    ['Taxa de Rejeição',  ga4.kpis.bounceRate,             'pct'    ],
  ]);
  R += 6;

  // Canais
  R++;
  headerRow(aba, R++, ['Canal', 'Receita', 'Pedidos', 'Ticket Médio', 'Sessões', '% Receita'], '#F9AB00');
  ga4.channels.forEach(c => {
    setRow(aba, R, [c.name, c.revenue, c.orders, c.avgTicket, c.sessions, c.pct / 100], { cols: 6 });
    aba.getRange(R, 2).setNumberFormat('"R$"#,##0.00');
    aba.getRange(R, 4).setNumberFormat('"R$"#,##0.00');
    aba.getRange(R, 6).setNumberFormat('0.0%');
    R++;
  });
  R++;

  // Funil
  headerRow(aba, R++, ['Funil — Etapa', 'Descrição', 'Usuários', '% do Total'], '#F9AB00');
  ga4.funnel.forEach(f => {
    setRow(aba, R, [`Etapa ${f.step}`, f.name, f.count, f.pct / 100], { cols: 4 });
    aba.getRange(R, 4).setNumberFormat('0.0%');
    R++;
  });
  R++;

  // Retenção
  headerRow(aba, R++, ['Retenção', 'Usuários', 'Sessões', 'Pedidos', 'Receita', 'Receita/Usuário'], '#F9AB00');
  [['Usuários em Retorno', ga4.retention.returning], ['Usuários Novos', ga4.retention.new]].forEach(([tipo, r]) => {
    setRow(aba, R, [tipo, r.users, r.sessions, r.orders, r.revenue, r.revenuePerUser], { cols: 6 });
    aba.getRange(R, 5).setNumberFormat('"R$"#,##0.00');
    aba.getRange(R, 6).setNumberFormat('"R$"#,##0.00');
    R++;
  });
  R++;

  // Diário GA4
  if (ga4.dailyRevenue && ga4.dailyRevenue.length) {
    headerRow(aba, R++, ['Dia', 'Sessões', 'Receita', 'Pedidos'], '#F9AB00');
    ga4.dailyRevenue.forEach((d, i) => {
      setRow(aba, R, [`${d.day}/${ga4.period.month.slice(5)}`, ga4.dailySessions[i] || 0, d.revenue, d.orders], { cols: 4 });
      aba.getRange(R, 3).setNumberFormat('"R$"#,##0.00');
      R++;
    });
    R++;
  }

  // Top Produtos
  if (ga4.top50Products && ga4.top50Products.length) {
    headerRow(aba, R++, ['#', 'Produto', 'Receita', 'Qtd.', 'Preço Médio'], '#F9AB00');
    ga4.top50Products.slice(0, 20).forEach((p, i) => {
      const [nome, rec, qtd] = p;
      setRow(aba, R, [i + 1, nome, rec, qtd, qtd > 0 ? rec / qtd : 0], { cols: 5 });
      aba.getRange(R, 3).setNumberFormat('"R$"#,##0.00');
      aba.getRange(R, 5).setNumberFormat('"R$"#,##0.00');
      R++;
    });
    R++;
  }

  // ══════════════════════════════════════════════════════════════
  //  META ADS
  // ══════════════════════════════════════════════════════════════
  secTitle(aba, R++, '📘  META ADS   ·   JN Impressão · ID 489839481099112', '#1877F2');
  R++;

  twoColSection(aba, R, [
    ['Investimento',         meta.summary.spend,                'moeda'  ],
    ['Receita Atribuída',    meta.summary.revenue,              'moeda'  ],
    ['ROAS Geral',           meta.summary.roas,                 'numero2'],
    ['Compras (site)',        meta.summary.purchases,            'numero' ],
    ['Conversas WPP',        meta.summary.conversations || 0,   'numero' ],
    ['Alcance',              meta.summary.reach,                'numero' ],
    ['Impressões',           meta.summary.impressions,          'numero' ],
    ['Cliques',              meta.summary.clicks,               'numero' ],
    ['CPA (custo/compra)',   meta.kpis.cpa || 0,               'moeda'  ],
    ['ROAS Campanhas Venda', meta.kpis.roasSales,              'numero2'],
    ['CPM',                  meta.kpis.cpm,                    'moeda'  ],
    ['CPC',                  meta.kpis.cpc,                    'moeda'  ],
    ['CTR',                  meta.kpis.ctr,                    'pct'    ],
    ['Frequência',           meta.summary.frequency,           'numero2'],
  ]);
  R += 8;

  // Campanhas Meta (pode estar vazia em meses históricos)
  if (meta.campaigns && meta.campaigns.length) {
    headerRow(aba, R++, ['Campanha', 'Status', 'Gasto', 'Receita', 'ROAS', 'Impressões', 'CTR', 'CPR', 'Resultado', 'Tipo'], '#1877F2');
    meta.campaigns.forEach(c => {
      setRow(aba, R, [c.name, c.status === 'ACTIVE' ? 'Ativo' : 'Pausado',
        c.spend, c.revenue || 0, c.roas || 0, c.impressions,
        c.ctr / 100, c.cpr, c.result, c.resultType], { cols: 10 });
      aba.getRange(R, 3).setNumberFormat('"R$"#,##0.00');
      aba.getRange(R, 4).setNumberFormat('"R$"#,##0.00');
      aba.getRange(R, 5).setNumberFormat('0.0');
      aba.getRange(R, 7).setNumberFormat('0.00%');
      aba.getRange(R, 8).setNumberFormat('"R$"#,##0.00');
      R++;
    });
    R++;
  }

  // Top Anúncios Meta
  if (meta.topAds && meta.topAds.length) {
    headerRow(aba, R++, ['#', 'Anúncio', 'Status', 'Gasto', 'ROAS', 'Impressões', 'CTR', 'CPR', 'Resultado'], '#1877F2');
    meta.topAds.forEach(a => {
      setRow(aba, R, [a.rank, a.name, a.status === 'ACTIVE' ? 'Ativo' : 'Pausado',
        a.spend, a.roas || 0, a.impressions, a.ctr / 100, a.cpr, a.result], { cols: 9 });
      aba.getRange(R, 4).setNumberFormat('"R$"#,##0.00');
      aba.getRange(R, 5).setNumberFormat('0.0');
      aba.getRange(R, 7).setNumberFormat('0.00%');
      aba.getRange(R, 8).setNumberFormat('"R$"#,##0.00');
      R++;
    });
    R++;
  }

  // ══════════════════════════════════════════════════════════════
  //  GOOGLE ADS
  // ══════════════════════════════════════════════════════════════
  secTitle(aba, R++, '🟠  GOOGLE ADS   ·   JN Impressão · Conta 4987645148', '#D4620A');
  R++;

  twoColSection(aba, R, [
    ['Investimento (est.)',  gadsSpend,                              'moeda'  ],
    ['Receita Atribuída',   gads.summary.attributedRevenue,          'moeda'  ],
    ['ROAS',                gads.summary.roas,                       'numero2'],
    ['Conversões',          gads.summary.attributedConversions,      'numero' ],
    ['CPA',                 gads.summary.cpa || 0,                   'moeda'  ],
    ['Cliques (est.)',      gads.summary.clicks,                     'numero' ],
    ['Impressões (est.)',   gads.summary.impressions,                'numero' ],
    ['CTR',                 gads.summary.ctr,                        'pct'    ],
    ['CPC',                 gads.summary.cpc || 0,                   'moeda'  ],
    ['Dias Ativos',         gads.summary.activeDays,                 'numero' ],
  ]);
  R += 6;

  // Campanhas G.Ads
  if (gads.campaigns && gads.campaigns.length) {
    headerRow(aba, R++, ['Campanha', 'Tipo', 'Status', 'Gasto', 'Receita', 'ROAS', 'Conversões', 'CPA', 'Cliques', 'CTR'], '#D4620A');
    gads.campaigns.forEach(c => {
      setRow(aba, R, [c.name, c.typeBadge || c.type, c.status === 'ACTIVE' ? 'Ativo' : 'Pausado',
        c.spend, c.revenue || 0, c.roas || 0, c.conversions, c.cpa || 0, c.clicks, (c.ctr || 8.5) / 100], { cols: 10 });
      aba.getRange(R, 4).setNumberFormat('"R$"#,##0.00');
      aba.getRange(R, 5).setNumberFormat('"R$"#,##0.00');
      aba.getRange(R, 6).setNumberFormat('0.0');
      aba.getRange(R, 8).setNumberFormat('"R$"#,##0.00');
      aba.getRange(R, 10).setNumberFormat('0.00%');
      R++;
    });
    R++;
  }

  // Keywords (apenas para meses com dados reais)
  if (gads.keywords && gads.keywords.length) {
    headerRow(aba, R++, ['Keyword', 'Match', 'Gasto', 'Receita', 'ROAS', 'Conv.', 'Cliques', 'CTR', 'CPC'], '#D4620A');
    gads.keywords.forEach(k => {
      setRow(aba, R, [k.keyword, k.matchType, k.spend, k.revenue, k.roas, k.conversions, k.clicks, k.ctr / 100, k.cpc], { cols: 9 });
      aba.getRange(R, 3).setNumberFormat('"R$"#,##0.00');
      aba.getRange(R, 4).setNumberFormat('"R$"#,##0.00');
      aba.getRange(R, 5).setNumberFormat('0.0');
      aba.getRange(R, 8).setNumberFormat('0.00%');
      aba.getRange(R, 9).setNumberFormat('"R$"#,##0.00');
      R++;
    });
    R++;
  }

  // Diário G.Ads (apenas para meses com dados reais)
  if (gads.daily && gads.daily.length) {
    headerRow(aba, R++, ['Dia', 'Custo', 'Cliques', 'Impressões', 'Sessões', 'Receita', 'Conv.'], '#D4620A');
    gads.daily.forEach(d => {
      setRow(aba, R, [`${d.day}/${gads.period.month.slice(5)}`, d.cost, d.clicks, d.impressions, d.sessions, d.revenue, d.conversions], { cols: 7 });
      aba.getRange(R, 2).setNumberFormat('"R$"#,##0.00');
      aba.getRange(R, 6).setNumberFormat('"R$"#,##0.00');
      R++;
    });
  }

  aba.autoResizeColumns(1, 10);
}

// ══════════════════════════════════════════════════════════════
//  HISTÓRICO — 1 linha por mês, acumula para sempre
// ══════════════════════════════════════════════════════════════
function atualizarHistorico(ss, ga4, meta, gads, month) {
  const aba = obterOuCriarAba(ss, '📊 Histórico');

  const cabecalho = [
    'Mês', 'Dias', 'Período',
    'Receita (GA4)', 'Pedidos', 'Ticket Médio', 'Conv.%',
    'Sessões', 'Usr. Novos', 'Usr. Retorno',
    'Cart', 'Checkout', 'Compras GA4', 'Itens',
    'G.Ads Invest.', 'G.Ads Receita', 'G.Ads ROAS', 'G.Ads Conv.', 'G.Ads CPA',
    'Meta Invest.', 'Meta Receita', 'Meta ROAS', 'Meta Compras', 'Meta WPP', 'Alcance',
    'Invest. Total', 'ROAS Geral',
  ];
  const N = cabecalho.length;

  if (aba.getRange(1, 1).getValue() !== 'Mês') {
    aba.getRange(1, 1, 1, N).setValues([cabecalho]);
    aba.getRange(1, 1,  1, N).setFontWeight('bold').setFontColor('white');
    aba.getRange(1, 1,  1, 3 ).setBackground('#1a73e8');
    aba.getRange(1, 4,  1, 11).setBackground('#E37400');
    aba.getRange(1, 15, 1, 5 ).setBackground('#D4620A');
    aba.getRange(1, 20, 1, 6 ).setBackground('#1877F2');
    aba.getRange(1, 26, 1, 2 ).setBackground('#0A8A58');
    aba.setFrozenRows(1);
  }

  const gadsSpend = gads.summary.spend;
  const metaSpend = meta.summary.spend;
  const totalInv  = gadsSpend + metaSpend;
  const revenue   = ga4.summary.revenue;
  const labelMes  = mesLabel(month);

  const linha = [
    labelMes, ga4.period.days, ga4.period.range,
    revenue, ga4.summary.orders, ga4.summary.avgTicket, ga4.summary.conversionRate,
    ga4.kpis.sessions, ga4.retention.new.users, ga4.retention.returning.users,
    ga4.funnel[2] ? ga4.funnel[2].count : 0,
    ga4.funnel[3] ? ga4.funnel[3].count : 0,
    ga4.funnel[4] ? ga4.funnel[4].count : 0,
    ga4.kpis.itemsSold,
    gadsSpend, gads.summary.attributedRevenue, gads.summary.roas,
    gads.summary.attributedConversions, gads.summary.cpa || 0,
    metaSpend, meta.summary.revenue, meta.summary.roas, meta.summary.purchases,
    meta.summary.conversations || 0, meta.summary.reach,
    totalInv, totalInv > 0 ? revenue / totalInv : 0,
  ];

  // Atualiza linha existente ou adiciona nova
  const total = aba.getLastRow();
  let alvo = total + 1;
  if (total > 1) {
    const meses = aba.getRange(2, 1, total - 1, 1).getValues().flat();
    const i = meses.indexOf(labelMes);
    if (i !== -1) alvo = i + 2;
  }
  aba.getRange(alvo, 1, 1, N).setValues([linha]);

  // Formatação
  [[4,'R$'],[6,'R$'],[7,'pct'],[15,'R$'],[16,'R$'],[17,'roas'],[19,'R$'],[20,'R$'],[21,'roas'],[26,'R$'],[27,'roas']].forEach(([col, fmt]) => {
    const cell = aba.getRange(alvo, col);
    if (fmt === 'R$')  cell.setNumberFormat('"R$"#,##0.00');
    if (fmt === 'pct') cell.setNumberFormat('0.0"%"');
    if (fmt === 'roas')cell.setNumberFormat('0.0"×"');
  });

  aba.autoResizeColumns(1, N);
}

// ── HELPERS ───────────────────────────────────────────────────
function buscarJSON(url) {
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200)
    throw new Error(`Erro ao buscar ${url}: HTTP ${resp.getResponseCode()}`);
  return JSON.parse(resp.getContentText());
}

function obterOuCriarAba(ss, nome) {
  return ss.getSheetByName(nome) || ss.insertSheet(nome);
}

function mesLabel(month) {
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const [ano, mes] = month.split('-');
  return `${meses[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

function mesclarTitulo(aba, linha, texto, cor, tamanho) {
  aba.getRange(linha, 1, 1, 10).merge()
     .setValue(texto)
     .setBackground(cor)
     .setFontColor('white')
     .setFontSize(tamanho || 12)
     .setFontWeight('bold');
}

function secTitle(aba, linha, texto, cor) {
  aba.getRange(linha, 1, 1, 10).merge()
     .setValue(texto)
     .setBackground(cor)
     .setFontColor('white')
     .setFontSize(11)
     .setFontWeight('bold');
}

function headerRow(aba, linha, cols, cor) {
  aba.getRange(linha, 1, 1, cols.length)
     .setValues([cols])
     .setBackground(cor)
     .setFontColor('white')
     .setFontWeight('bold');
}

function setRow(aba, linha, vals, opts) {
  aba.getRange(linha, 1, 1, opts.cols || vals.length).setValues([vals]);
}

// KPIs em 2 colunas lado a lado (label | valor | label | valor)
function twoColSection(aba, linhaInicio, pares) {
  const metade = Math.ceil(pares.length / 2);
  for (let i = 0; i < metade; i++) {
    const esq = pares[i];
    const dir = pares[i + metade];
    const linha = linhaInicio + i;

    aba.getRange(linha, 1).setValue(esq[0]).setFontWeight('bold');
    const ve = aba.getRange(linha, 2).setValue(esq[1]);
    aplicarFormato(ve, esq[2]);

    if (dir) {
      aba.getRange(linha, 4).setValue(dir[0]).setFontWeight('bold');
      const vd = aba.getRange(linha, 5).setValue(dir[1]);
      aplicarFormato(vd, dir[2]);
    }
  }
}

function aplicarFormato(cell, tipo) {
  if (tipo === 'moeda')   cell.setNumberFormat('"R$"#,##0.00');
  if (tipo === 'pct')     cell.setNumberFormat('0.0"%"');
  if (tipo === 'numero2') cell.setNumberFormat('0.00');
}

// ── GATILHO (executar UMA VEZ para ativar o agendamento) ──────
function criarGatilhoDiario() {
  ScriptApp.newTrigger('sincronizar')
    .timeBased().atHour(7).everyDays(1).create();
  Logger.log('Gatilho diário às 7h criado.');
}
