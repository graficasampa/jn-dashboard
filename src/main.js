import './style.css';
import { renderHome, initHomeCharts } from './renderers/home.js';
import { renderGA4, initGA4Charts } from './renderers/ga4.js';
import { renderMeta, initMetaCharts } from './renderers/meta.js';
import { renderGads, initGadsCharts } from './renderers/gads.js';

// ── configuração ─────────────────────────────────────────
let AVAILABLE_MONTHS = [
  { value: '2025-07', label: 'Julho 2025',    short: 'Jul/25', slug: 'julho-2025'    },
  { value: '2025-08', label: 'Agosto 2025',   short: 'Ago/25', slug: 'agosto-2025'   },
  { value: '2025-09', label: 'Setembro 2025', short: 'Set/25', slug: 'setembro-2025' },
  { value: '2025-10', label: 'Outubro 2025',  short: 'Out/25', slug: 'outubro-2025'  },
  { value: '2025-11', label: 'Novembro 2025', short: 'Nov/25', slug: 'novembro-2025' },
  { value: '2025-12', label: 'Dezembro 2025', short: 'Dez/25', slug: 'dezembro-2025' },
  { value: '2026-01', label: 'Janeiro 2026',  short: 'Jan/26', slug: 'janeiro-2026'  },
  { value: '2026-02', label: 'Fevereiro 2026',short: 'Fev/26', slug: 'fevereiro-2026'},
  { value: '2026-03', label: 'Março 2026',    short: 'Mar/26', slug: 'marco-2026'    },
  { value: '2026-04', label: 'Abril 2026',    short: 'Abr/26', slug: 'abril-2026'    },
  { value: '2026-05', label: 'Maio 2026',     short: 'Mai/26', slug: 'maio-2026'     },
  { value: '2026-06', label: 'Junho 2026',    short: 'Jun/26', slug: 'junho-2026'    },
];

const PLATFORMS = [
  {
    id: 'ga4', slug: 'google-analytics',
    name: 'Google Analytics',
    sub: 'GA4 · Prop. 492019962 · JNRevenda',
    logoBg: '#FFF3E0',
    logo: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="15" width="5" height="7" rx="1" fill="#F9AB00"/><rect x="9.5" y="10" width="5" height="12" rx="1" fill="#E37400"/><rect x="17" y="3" width="5" height="19" rx="1" fill="#E37400"/></svg>`,
    subnav:     ['Resumo','Vendas & Receita','Top Produtos','Funil & Retenção','Tráfego','Insights'],
    subnav_ids: ['resumo','vendas','produtos','funil','trafego','insights'],
  },
  {
    id: 'meta', slug: 'meta-ads',
    name: 'Meta Ads',
    sub: 'JN Impressão · ID 489839481099112',
    logoBg: '#E7F3FF',
    logo: `<svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    subnav:     ['Visão Geral','Conversas','Campanhas','Top Anúncios','Criativos','Insights'],
    subnav_ids: ['meta-ads','meta-conversas','meta-ads','meta-ads','meta-ads','meta-ads'],
  },
  {
    id: 'gads', slug: 'google-ads',
    name: 'Google Ads',
    sub: 'JN Impressão · Conta 4987645148',
    logoBg: '#fff',
    logo: `<img src="/google-ads-logo.svg" width="22" height="22" style="object-fit:contain;display:block">`,
    subnav:     ['Resumo','Gasto Diário','Campanhas','Keywords','Insights'],
    subnav_ids: ['gads-resumo','gads-diario','gads-campanhas','gads-keywords','gads-insights'],
  }
];

const SLUG_TO_PLATFORM = Object.fromEntries(PLATFORMS.map(p => [p.slug, p.id]));
const PLATFORM_SLUG    = Object.fromEntries(PLATFORMS.map(p => [p.id, p.slug]));
let MONTH_BY_SLUG      = Object.fromEntries(AVAILABLE_MONTHS.map(m => [m.slug, m.value]));
let MONTH_BY_VALUE     = Object.fromEntries(AVAILABLE_MONTHS.map(m => [m.value, m]));

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const SLUG_MONTHS = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function monthMeta(value, fallback = {}) {
  const [year, month] = String(value).split('-').map(Number);
  const i = month - 1;
  return {
    value,
    label: fallback.label || `${MONTH_NAMES[i] || value} ${year}`,
    short: fallback.short || `${MONTH_SHORT[i] || String(month).padStart(2, '0')}/${String(year).slice(2)}`,
    slug: fallback.slug || `${SLUG_MONTHS[i] || String(month).padStart(2, '0')}-${year}`,
  };
}

function refreshMonthMaps() {
  MONTH_BY_SLUG  = Object.fromEntries(AVAILABLE_MONTHS.map(m => [m.slug, m.value]));
  MONTH_BY_VALUE = Object.fromEntries(AVAILABLE_MONTHS.map(m => [m.value, m]));
}

// ── estado ───────────────────────────────────────────────
let state = { view: 'hub', month: '2026-06', platform: 'ga4', data: {} };

async function loadAvailableMonths() {
  try {
    const res = await fetch('/data/index.json');
    if (!res.ok) throw new Error('index não encontrado');
    const index = await res.json();
    const months = (index.months || [])
      .map(m => typeof m === 'string' ? monthMeta(m) : monthMeta(m.value, m))
      .filter(m => m.value)
      .sort((a, b) => a.value.localeCompare(b.value));
    if (months.length) {
      AVAILABLE_MONTHS = months;
      state.month = months[months.length - 1].value;
      refreshMonthMaps();
    }
  } catch {
    refreshMonthMaps();
  }
}

// ── roteamento de URL ────────────────────────────────────
function stateFromPath() {
  const parts = location.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (!parts.length || parts[0] === 'hub') return { view: 'hub' };
  const monthValue = MONTH_BY_SLUG[parts[0]] || parts[0];
  const platform   = SLUG_TO_PLATFORM[parts[1]] || 'ga4';
  return { view: 'month', month: monthValue, platform };
}

function pushURL() {
  let url;
  if (state.view === 'hub') {
    url = '/hub';
  } else {
    const m = MONTH_BY_VALUE[state.month];
    url = `/${m?.slug || state.month}/${PLATFORM_SLUG[state.platform] || state.platform}`;
  }
  if (location.pathname !== url) history.pushState({}, '', url);
}

window.addEventListener('popstate', async () => {
  const s = stateFromPath();
  state.view     = s.view;
  state.month    = s.month    || state.month;
  state.platform = s.platform || state.platform;
  updateHeader();
  renderPlatformBar();
  renderSubNav();
  await renderContent();
});

// ── carregamento de dados ────────────────────────────────
// Hub: deriva dos mesmos JSONs que as abas de detalhe usam
async function loadHubData() {
  if (state.data['__hub__']) return state.data['__hub__'];

  const months = await Promise.all(AVAILABLE_MONTHS.map(async m => {
    const [ga4, gads, meta] = await Promise.all([
      fetch(`/data/${m.value}/ga4.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/data/${m.value}/gads.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/data/${m.value}/meta.json`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const gadsSpend = gads?.summary?.spend    || 0;
    const metaSpend = meta?.summary?.spend    || 0;
    const totalInv  = gadsSpend + metaSpend;
    const revenue   = ga4?.summary?.revenue   || 0;

    return {
      ...m,
      days: ga4?.period?.days ?? 0,
      sources: { ga4: !!ga4, gads: !!gads, meta: !!meta },
      ga4: ga4 ? {
        revenue,
        orders:         ga4.summary.orders,
        sessions:       ga4.kpis.sessions,
        avgTicket:      ga4.summary.avgTicket,
        users:            (ga4.retention?.new?.users || 0) + (ga4.retention?.returning?.users || 0),
        newUsers:         ga4.retention?.new?.users          || 0,
        returningUsers:   ga4.retention?.returning?.users    || 0,
        newRevenue:       ga4.retention?.new?.revenue        || 0,
        returningRevenue: ga4.retention?.returning?.revenue  || 0,
        newOrders:        ga4.retention?.new?.orders         || 0,
        returningOrders:  ga4.retention?.returning?.orders   || 0,
        addToCart:        ga4.funnel?.[2]?.count             || 0,
        itemsPurchased:   ga4.kpis?.itemsSold                || 0,
      } : null,
      gads: gads ? {
        spend:       gadsSpend,
        conversions: gads.summary.attributedConversions,
        roas:        gads.summary.roas,
        clicks:      gads.summary.clicks,
      } : null,
      meta: meta ? {
        spend:     metaSpend,
        purchases: meta.summary.purchases,
        roas:      meta.summary.roas,
        reach:     meta.summary.reach,
      } : null,
      derived: {
        totalInvestment: totalInv,
        overallROAS:     totalInv > 0 ? revenue / totalInv : null,
      }
    };
  }));

  const result = { months };
  state.data['__hub__'] = result;
  return result;
}

async function loadData() {
  if (state.view === 'hub') return loadHubData();

  const key = `${state.month}/${state.platform}`;
  if (state.data[key]) return state.data[key];
  const res = await fetch(`/data/${state.month}/${state.platform}.json`);
  if (!res.ok) throw new Error(`Dados não encontrados: ${key}`);
  const data = await res.json();
  state.data[key] = data;
  return data;
}

// ── header ───────────────────────────────────────────────
function updateHeader(data) {
  const pill    = document.getElementById('monthLabel');
  const backBtn = document.getElementById('backBtn');
  const platBar = document.querySelector('.platform-bar');

  if (state.view === 'hub') {
    pill.textContent      = 'Visão Geral';
    pill.style.cursor     = '';
    pill.onclick          = null;
    backBtn.style.display = 'none';
    platBar.style.display = 'none';
  } else {
    const days  = data?.period?.days ?? '';
    const label = data?.period?.label ?? (MONTH_BY_VALUE[state.month]?.label || state.month);
    pill.textContent      = days ? `${label} · ${days} dias` : label;
    backBtn.style.display = 'flex';
    platBar.style.display = '';
  }
}

// ── barra de plataformas ─────────────────────────────────
function renderPlatformBar() {
  if (state.view === 'hub') return;
  const bar = document.getElementById('platformBar');
  bar.innerHTML = PLATFORMS.map(p => `
    <button
      class="psel${p.id === state.platform ? ' active' : ''}"
      id="psel-${p.id}"
      onclick="switchPlatform('${p.id}')"
    >
      <div class="psel-logo" style="background:${p.logoBg}${p.id === 'gads' ? ';border:1px solid var(--bdr)' : ''}">${p.logo}</div>
      <div class="psel-info">
        <div class="psel-name">${p.name}</div>
        <div class="psel-sub">${p.sub}</div>
      </div>
    </button>`).join('');
}

function renderSubNav() {
  const container = document.getElementById('subNavContainer');
  if (state.view === 'hub') { container.innerHTML = ''; return; }
  const p = PLATFORMS.find(p => p.id === state.platform);
  if (!p) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <nav class="sub-nav">
      <div class="sub-nav-inner">
        ${p.subnav.map((label, i) => `<a href="#${p.subnav_ids[i]}">${label}</a>`).join('')}
      </div>
    </nav>`;
}

// ── conteúdo ─────────────────────────────────────────────
async function renderContent() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--t3)">Carregando...</div>';

  try {
    const data = await loadData();
    updateHeader(data);

    if (state.view === 'hub') {
      main.innerHTML = renderHome(data);
      initHomeCharts(data);
      document.getElementById('ftrPeriod').textContent =
        `Painel Executivo · Atualizado em ${new Date().toLocaleDateString('pt-BR')}`;
    } else {
      if (state.platform === 'ga4') {
        main.innerHTML = renderGA4(data);
        initGA4Charts(data);
      } else if (state.platform === 'meta') {
        main.innerHTML = renderMeta(data);
        initMetaCharts(data);
      } else if (state.platform === 'gads') {
        main.innerHTML = renderGads(data);
        initGadsCharts(data);
      }
      const label = data?.period?.label ?? (MONTH_BY_VALUE[state.month]?.label || state.month);
      document.getElementById('ftrPeriod').textContent =
        `Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${label}`;
    }
  } catch (e) {
    main.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--red)">Erro: ${e.message}</div>`;
  }
}

// ── navegação ─────────────────────────────────────────────
window.switchPlatform = async function(platformId) {
  if (state.view !== 'month' || state.platform === platformId) return;
  state.platform = platformId;
  pushURL();
  renderPlatformBar();
  renderSubNav();
  await renderContent();
};

window.goToMonth = async function(monthValue) {
  state.month    = monthValue;
  state.view     = 'month';
  state.platform = 'ga4';
  pushURL();
  renderPlatformBar();
  renderSubNav();
  await renderContent();
};

window.goToHub = async function() {
  state.view = 'hub';
  pushURL();
  updateHeader();
  renderSubNav();
  await renderContent();
};

// ── badge "última atualização" ────────────────────────────
async function loadLastUpdated() {
  try {
    const res = await fetch('/data/lastUpdated.json');
    if (!res.ok) return;
    const { ts, sources } = await res.json();
    if (!ts) return;

    const badge = document.getElementById('updBadge');
    const text  = document.getElementById('updText');
    const dt    = new Date(ts);
    const TZ    = 'America/Sao_Paulo';

    const todayStr  = new Date().toLocaleDateString('pt-BR', { timeZone: TZ });
    const updStr    = dt.toLocaleDateString('pt-BR', { timeZone: TZ });
    const hhmm      = dt.toLocaleTimeString('pt-BR', { timeZone: TZ, hour:'2-digit', minute:'2-digit' });
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR', { timeZone: TZ });

    let label;
    if (updStr === todayStr)       label = `Atualizado hoje às ${hhmm}`;
    else if (updStr === yesterday) label = `Atualizado ontem às ${hhmm}`;
    else                           label = `Atualizado em ${updStr.slice(0,5)} às ${hhmm}`;

    const sourceList = Object.entries(sources || {}).filter(([,v]) => v).map(([k]) => k.toUpperCase());
    if (sourceList.length > 0 && sourceList.length < 3) label += ` (${sourceList.join(', ')})`;

    text.textContent = label;
    badge.classList.add('visible');
  } catch {}
}

// ── init ──────────────────────────────────────────────────
async function init() {
  await loadAvailableMonths();
  const s = stateFromPath();
  state.view     = s.view;
  state.month    = s.month    || state.month;
  state.platform = s.platform || state.platform;

  renderPlatformBar();
  renderSubNav();
  await Promise.all([renderContent(), loadLastUpdated()]);
}

init();
