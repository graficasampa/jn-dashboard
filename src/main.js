import './style.css';
import { renderGA4, initGA4Charts } from './renderers/ga4.js';
import { renderMeta } from './renderers/meta.js';

// ── State ─────────────────────────────────────────────────
let state = {
  month: '2026-06',
  platform: 'ga4',
  data: {}
};

const AVAILABLE_MONTHS = [
  { value: '2026-06', label: 'Junho 2026' }
];

const PLATFORMS = [
  {
    id: 'ga4',
    name: 'Google Analytics',
    sub: 'GA4 · Prop. 492019962 · JNRevenda',
    logoBg: '#FFF3E0',
    logo: `<svg width="22" height="22" viewBox="0 0 48 48" fill="none">
      <path d="M29 8C29 5.239 26.761 3 24 3s-5 2.239-5 5v26c0 2.761 2.239 5 5 5s5-2.239 5-5V8z" fill="#F9AB00"/>
      <path d="M8 30c0-2.761 2.239-5 5-5s5 2.239 5 5v5c0 2.761-2.239 5-5 5s-5-2.239-5-5v-5z" fill="#E37400"/>
      <circle cx="40" cy="35" r="5" fill="#E37400"/>
    </svg>`,
    dataFile: 'ga4.json',
    disabled: false
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    sub: 'Conta 489839481099112 · JN Impressão',
    logoBg: '#E7F0FD',
    logo: `<svg width="22" height="22" viewBox="0 0 36 36" fill="none">
      <path d="M18 3C9.716 3 3 9.716 3 18s6.716 15 15 15 15-6.716 15-15S26.284 3 18 3z" fill="#1877F2"/>
      <path d="M21.5 14.5c-1.35 0-2.25.9-2.813 2.25L17.5 19l-1.188-2.25C15.75 15.4 14.85 14.5 13.5 14.5c-2.025 0-3.375 1.575-3.375 3.825 0 2.7 2.138 5.063 7.875 8.175 5.738-3.112 7.875-5.475 7.875-8.175 0-2.25-1.35-3.825-3.375-3.825z" fill="#fff"/>
    </svg>`,
    dataFile: 'meta.json',
    disabled: false
  },
  {
    id: 'gads',
    name: 'Google Ads',
    sub: 'Em breve · Conecte sua conta',
    logoBg: '#fff',
    logo: `<svg width="22" height="22" viewBox="0 0 48 48" fill="none">
      <path d="M33.86 4.77L15.49 36.55l-7.86-4.54 18.37-31.78 7.86 4.54z" fill="#FBBC04"/>
      <path d="M48 36.55H15.49l-2.28-3.95 9.22-15.97 2.28 3.95-6.94 12.02H48v3.95z" fill="#4285F4"/>
      <circle cx="7.63" cy="36.55" r="7.63" fill="#34A853"/>
    </svg>`,
    dataFile: null,
    disabled: true
  }
];

// ── Data loading ──────────────────────────────────────────
async function loadData(month, platform) {
  const key = `${month}/${platform}`;
  if (state.data[key]) return state.data[key];
  const res = await fetch(`/data/${month}/${platform}.json`);
  if (!res.ok) throw new Error(`Data not found: ${key}`);
  const data = await res.json();
  state.data[key] = data;
  return data;
}

// ── Render platform bar ───────────────────────────────────
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

// ── Switch platform ───────────────────────────────────────
window.switchPlatform = async function(platformId) {
  if (state.platform === platformId) return;
  state.platform = platformId;
  renderPlatformBar();
  await renderContent();
};

// ── Render content ────────────────────────────────────────
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
    }
  } catch (e) {
    main.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--red)">Erro ao carregar dados: ${e.message}</div>`;
  }

  // Update footer
  const monthObj = AVAILABLE_MONTHS.find(m => m.value === state.month);
  document.getElementById('ftrPeriod').textContent =
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${monthObj?.label || state.month}`;
}

// ── Month picker ──────────────────────────────────────────
function updateMonthLabel() {
  const monthObj = AVAILABLE_MONTHS.find(m => m.value === state.month);
  document.getElementById('monthLabel').textContent = monthObj?.label || state.month;
}

// ── PDF download ──────────────────────────────────────────
document.getElementById('btnDownload').addEventListener('click', () => {
  window.print();
});

// ── Init ──────────────────────────────────────────────────
async function init() {
  updateMonthLabel();
  renderPlatformBar();
  await renderContent();
}

init();
