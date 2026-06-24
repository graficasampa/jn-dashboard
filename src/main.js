import './style.css';
import { renderGA4, initGA4Charts } from './renderers/ga4.js';
import { renderMeta } from './renderers/meta.js';
import { renderGads, initGadsCharts } from './renderers/gads.js';

let state = {
  month: '2026-06',
  platform: 'ga4',
  data: {}
};

const AVAILABLE_MONTHS = [
  { value: '2026-06', label: 'Junho 2026', days: 23 }
];

const PLATFORMS = [
  {
    id: 'ga4',
    name: 'Google Analytics',
    sub: 'GA4 · Prop. 492019962 · JNRevenda',
    logoBg: '#FFF3E0',
    logo: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="15" width="5" height="7" rx="1" fill="#F9AB00"/><rect x="9.5" y="10" width="5" height="12" rx="1" fill="#E37400"/><rect x="17" y="3" width="5" height="19" rx="1" fill="#E37400"/></svg>`,
    subnav: ['Resumo','Vendas & Receita','Top Produtos','Funil & Retenção','Tráfego','Insights'],
    subnav_ids: ['resumo','vendas','produtos','funil','trafego','insights'],
    disabled: false
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    sub: 'JN Impressão · ID 489839481099112',
    logoBg: '#E7F3FF',
    logo: `<svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    subnav: ['Visão Geral','KPIs','Campanhas','Top Anúncios','Criativos','Insights'],
    subnav_ids: ['meta-ads','meta-ads','meta-ads','meta-ads','meta-ads','meta-ads'],
    disabled: false
  },
  {
    id: 'gads',
    name: 'Google Ads',
    sub: 'JN Impressão · Conta 4987645148',
    logoBg: '#fff',
    logo: `<svg width="22" height="22" viewBox="0 0 48 48" fill="none"><path d="M33.86 4.77L15.49 36.55l-7.86-4.54 18.37-31.78 7.86 4.54z" fill="#FBBC04"/><path d="M48 36.55H15.49l-2.28-3.95 9.22-15.97 2.28 3.95-6.94 12.02H48v3.95z" fill="#4285F4"/><circle cx="7.63" cy="36.55" r="7.63" fill="#34A853"/></svg>`,
    subnav: ['Resumo','Gasto Diário','Campanhas','Keywords','Insights'],
    subnav_ids: ['gads-resumo','gads-diario','gads-campanhas','gads-keywords','gads-insights'],
    disabled: false
  }
];

async function loadData(month, platform) {
  const key = `${month}/${platform}`;
  if (state.data[key]) return state.data[key];
  const res = await fetch(`/data/${month}/${platform}.json`);
  if (!res.ok) throw new Error(`Dados não encontrados: ${key}`);
  const data = await res.json();
  state.data[key] = data;
  return data;
}

function renderPlatformBar() {
  const bar = document.getElementById('platformBar');
  bar.innerHTML = PLATFORMS.map(p => `
    <button
      class="psel${p.id === state.platform ? ' active' : ''}${p.disabled ? ' psel-disabled' : ''}"
      id="psel-${p.id}"
      ${p.disabled ? 'disabled' : `onclick="switchPlatform('${p.id}')"`}
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
  const platform = PLATFORMS.find(p => p.id === state.platform);
  if (!platform) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <nav class="sub-nav">
      <div class="sub-nav-inner">
        ${platform.subnav.map((label, i) => `<a href="#${platform.subnav_ids[i]}">${label}</a>`).join('')}
      </div>
    </nav>`;
}

function updateMonthLabel() {
  const m = AVAILABLE_MONTHS.find(m => m.value === state.month);
  document.getElementById('monthLabel').textContent = m ? `${m.label} · ${m.days} dias` : state.month;
}

window.switchPlatform = async function(platformId) {
  if (state.platform === platformId) return;
  state.platform = platformId;
  renderPlatformBar();
  renderSubNav();
  await renderContent();
};

async function renderContent() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--t3)">Carregando...</div>';

  try {
    const data = await loadData(state.month, state.platform);
    if (state.platform === 'ga4') {
      main.innerHTML = renderGA4(data);
      initGA4Charts(data);
    } else if (state.platform === 'meta') {
      main.innerHTML = renderMeta(data);
    } else if (state.platform === 'gads') {
      main.innerHTML = renderGads(data);
      initGadsCharts(data);
    }
  } catch (e) {
    main.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--red)">Erro: ${e.message}</div>`;
  }

  const m = AVAILABLE_MONTHS.find(m => m.value === state.month);
  document.getElementById('ftrPeriod').textContent =
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${m?.label || state.month}`;
}

async function loadLastUpdated() {
  try {
    const res = await fetch('/data/lastUpdated.json');
    if (!res.ok) return;
    const { ts, sources } = await res.json();
    if (!ts) return;

    const badge = document.getElementById('updBadge');
    const text  = document.getElementById('updText');
    const dt    = new Date(ts);

    // Data em horário de Brasília
    const brtOffset = -3 * 60;
    const brt = new Date(dt.getTime() + (brtOffset - dt.getTimezoneOffset()) * 60000);
    const todayBRT  = new Date();
    const todayStr  = todayBRT.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const updStr    = brt.toLocaleDateString('pt-BR');
    const hhmm      = brt.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

    let label;
    if (updStr === todayStr) {
      label = `Atualizado hoje às ${hhmm}`;
    } else {
      const yesterday = new Date(todayBRT);
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = yesterday.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      label = updStr === yestStr
        ? `Atualizado ontem às ${hhmm}`
        : `Atualizado em ${updStr.slice(0,5)} às ${hhmm}`;
    }

    // Indicar fontes parciais
    const sourceList = Object.entries(sources || {}).filter(([,v]) => v).map(([k]) => k.toUpperCase());
    if (sourceList.length > 0 && sourceList.length < 2) {
      label += ` (${sourceList.join(', ')})`;
    }

    text.textContent = label;
    badge.classList.add('visible');
  } catch {}
}

async function init() {
  updateMonthLabel();
  renderPlatformBar();
  renderSubNav();
  await Promise.all([renderContent(), loadLastUpdated()]);
}

init();
