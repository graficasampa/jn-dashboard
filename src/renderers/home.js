import { renderAudience, initAudienceCharts } from './audience.js';

// Formatos monetários — sempre R$ 5.000,00
const R     = n => n == null ? '—' : 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const N     = n => n == null ? '—' : n.toLocaleString('pt-BR');
const PCT   = (a, b) => b ? ((a / b) * 100).toFixed(0) + '%' : '—';
const ROAS  = r => r == null ? '—' : r.toFixed(1) + '×';

// Cores por desempenho
const roasClr  = r => r == null ? '' : `color:${r >= 10 ? 'var(--grn)' : r >= 3 ? 'var(--amb)' : 'var(--red)'}`;
const gadsClr  = r => r == null ? '' : `color:${r >= 10 ? 'var(--ads)' : r >= 3 ? 'var(--amb)' : 'var(--red)'}`;

// Abreviado apenas para labels do gráfico (espaço limitado)
const chartLbl = v => v >= 1000 ? 'R$' + (v / 1000).toFixed(0) + 'k' : 'R$' + v.toFixed(0);

let _index        = null;
let _activePeriod = 'current';
let _activeView   = 'painel';   // 'painel' | 'audiencia'

// ── período ────────────────────────────────────────────────
function filterMonths(months, period) {
  if (!months.length) return months;
  if (period === 'current') return [months[months.length - 1]];
  if (period === 'all')     return months;
  return months.slice(-parseInt(period));
}

function periodRange(filtered) {
  if (!filtered.length) return '';
  if (filtered.length === 1) {
    const m = filtered[0];
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const [, mo, y] = today.split('/');
    if (m.value === `${y}-${mo}`) return `01/${mo}/${y} – ${today}`;
    return m.label;
  }
  return `${filtered[0].short} – ${filtered[filtered.length - 1].short}`;
}

// ── agregação ───────────────────────────────────────────────
function agg(months) {
  return months.reduce((a, m) => ({
    revenue:        a.revenue        + (m.ga4?.revenue        || 0),
    orders:         a.orders         + (m.ga4?.orders         || 0),
    sessions:       a.sessions       + (m.ga4?.sessions       || 0),
    users:          a.users          + (m.ga4?.users          || 0),
    newUsers:       a.newUsers       + (m.ga4?.newUsers       || 0),
    returningUsers: a.returningUsers + (m.ga4?.returningUsers || 0),
    addToCart:      a.addToCart      + (m.ga4?.addToCart      || 0),
    itemsPurchased: a.itemsPurchased + (m.ga4?.itemsPurchased || 0),
    gadsSpend:      a.gadsSpend      + (m.gads?.spend         || 0),
    gadsConv:       a.gadsConv       + (m.gads?.conversions   || 0),
    metaSpend:      a.metaSpend      + (m.meta?.spend         || 0),
    metaPurch:      a.metaPurch      + (m.meta?.purchases     || 0),
    totalInv:       a.totalInv       + (m.derived?.totalInvestment || 0),
  }), {
    revenue:0, orders:0, sessions:0, users:0, newUsers:0, returningUsers:0,
    addToCart:0, itemsPurchased:0, gadsSpend:0, gadsConv:0,
    metaSpend:0, metaPurch:0, totalInv:0
  });
}

// ── KPI band ────────────────────────────────────────────────
function kpiBandHtml(filtered) {
  if (!filtered.length) return '<p style="padding:20px;color:var(--t3)">Sem dados no período</p>';
  const a    = agg(filtered);
  const roas = a.totalInv > 0 ? a.revenue / a.totalInv : null;

  const cards = [
    {
      label: 'Receita Total',
      value: R(a.revenue),
      sub:   periodRange(filtered),
      big:   true,
      color: 'var(--grn)'
    },
    {
      label: 'Investimento Total',
      value: R(a.totalInv),
      sub:   `G.Ads ${R(a.gadsSpend)} · Meta ${R(a.metaSpend)}`,
      color: 'var(--t1)'
    },
    {
      label: 'ROAS Geral',
      value: roas ? roas.toFixed(1) + '×' : '—',
      sub:   'Receita ÷ Investimento',
      color: roas == null ? 'var(--t2)' : roas >= 10 ? 'var(--grn)' : roas >= 3 ? 'var(--amb)' : 'var(--red)'
    },
    {
      label: 'Conv. G.Ads',
      value: N(a.gadsConv),
      sub:   `Invest. ${R(a.gadsSpend)}`,
      color: 'var(--ads)'
    },
    {
      label: 'Compras Meta',
      value: N(a.metaPurch),
      sub:   `Invest. ${R(a.metaSpend)}`,
      color: 'var(--meta)'
    },
    {
      label: 'Usuários',
      value: N(a.users),
      sub:   `${N(a.newUsers)} novos · ${N(a.returningUsers)} retorno`,
      color: 'var(--t1)'
    },
    {
      label: 'Pedidos',
      value: N(a.orders),
      sub:   `Ticket médio ${R(a.orders ? a.revenue / a.orders : null)}`,
      color: 'var(--t1)'
    },
    {
      label: 'E-commerce',
      value: N(a.itemsPurchased),
      sub:   `${N(a.addToCart)} adicionados ao carrinho`,
      color: 'var(--t1)'
    },
  ];

  return cards.map(c => `
    <div class="hkpi${c.big ? ' hkpi-big' : ''}">
      <div class="hkpi-lbl">${c.label}</div>
      <div class="hkpi-val" style="color:${c.color}">${c.value}</div>
      <div class="hkpi-sub">${c.sub}</div>
    </div>`).join('');
}

// ── linha da tabela ─────────────────────────────────────────
function tableRowHtml(m) {
  const g  = m.gads    || {};
  const me = m.meta    || {};
  const ga = m.ga4     || {};
  const d  = m.derived || {};

  const srcs = ['ga4', 'gads', 'meta'].map(s => {
    const on  = m.sources?.[s];
    const lbl = s === 'ga4' ? 'GA4' : s === 'gads' ? 'ADS' : 'META';
    return `<span class="src-badge ${on ? 'src-on' : 'src-off'}">${lbl}</span>`;
  }).join('');

  return `
    <tr class="hrow" onclick="window.goToMonth('${m.value}')">
      <td class="hrow-month">
        <div class="hrow-name">${m.label}</div>
        <div class="hrow-days">${m.days} dias ${srcs}</div>
      </td>

      <!-- Resumo -->
      <td class="td-rev">${R(ga.revenue)}</td>
      <td>${N(ga.orders)}</td>
      <td>${R(d.totalInvestment)}</td>
      <td style="${roasClr(d.overallROAS)};font-weight:700">${ROAS(d.overallROAS)}</td>

      <!-- Google Ads -->
      <td style="color:var(--ads)">${R(g.spend)}</td>
      <td style="color:var(--ads)">${N(g.conversions)}</td>
      <td style="${gadsClr(g.roas)};font-weight:600">${ROAS(g.roas)}</td>

      <!-- Meta Ads -->
      <td style="color:var(--meta)">${R(me.spend)}</td>
      <td style="color:var(--meta)">${N(me.purchases)}</td>
      <td style="${roasClr(me.roas)};font-weight:600">${ROAS(me.roas)}</td>

      <!-- Audiência -->
      <td>${N(ga.users)}</td>
      <td style="color:var(--blu)">${N(ga.newUsers)}</td>
      <td style="color:var(--grn)">${N(ga.returningUsers)}</td>

      <!-- E-commerce -->
      <td>${N(ga.orders)}</td>
      <td>${N(ga.addToCart)}</td>
      <td>${N(ga.itemsPurchased)}</td>

      <!-- Ação -->
      <td class="td-action">
        <button class="btn-detail" onclick="event.stopPropagation();window.goToMonth('${m.value}')">
          Ver detalhes
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </td>
    </tr>`;
}

// ── render ──────────────────────────────────────────────────
export function renderHome(index) {
  _index = index;
  const months   = index.months || [];
  const filtered = filterMonths(months, _activePeriod);

  const viewBtns = [
    { key: 'painel',    label: 'Visão Geral'           },
    { key: 'audiencia', label: 'Audiência & Estratégia' },
  ].map(b => `<button class=”hvb${_activeView === b.key ? ' active' : ''}” onclick=”window.setHomeView('${b.key}')”>${b.label}</button>`).join('');

  const periodBtns = [
    { key: 'current', label: 'Mês atual' },
    { key: '3',       label: '3 meses'   },
    { key: '6',       label: '6 meses'   },
    { key: 'all',     label: 'Tudo'      },
  ].map(b => `<button class=”hfb${_activePeriod === b.key ? ' active' : ''}” onclick=”window.setHomePeriod('${b.key}')”>${b.label}</button>`).join('');

  const topbar = `
    <div class=”home-topbar”>
      <div class=”home-topbar-left”>
        <div class=”home-title”>
          <svg width=”16” height=”16” viewBox=”0 0 24 24” fill=”none”>
            <rect x=”3” y=”3” width=”7” height=”7” rx=”1.5” fill=”var(--blu)” opacity=”.9”/>
            <rect x=”14” y=”3” width=”7” height=”7” rx=”1.5” fill=”var(--blu)” opacity=”.55”/>
            <rect x=”3” y=”14” width=”7” height=”7” rx=”1.5” fill=”var(--blu)” opacity=”.55”/>
            <rect x=”14” y=”14” width=”7” height=”7” rx=”1.5” fill=”var(--blu)” opacity=”.28”/>
          </svg>
          Painel Executivo
        </div>
        <div class=”hvb-group”>${viewBtns}</div>
      </div>
      ${_activeView === 'painel' ? `<div class=”hfb-group”>${periodBtns}</div>` : ''}
    </div>`;

  // ── sub-aba: Audiência & Estratégia ────────────────────────
  if (_activeView === 'audiencia') {
    return `
      <div class=”home-wrap”>
        ${topbar}
        ${renderAudience(index)}
      </div>`;
  }

  // ── sub-aba padrão: Visão Geral ─────────────────────────────
  return `
    <div class=”home-wrap”>

      ${topbar}

      <div class=”hkpi-band” id=”homeKpiBand”>
        ${kpiBandHtml(filtered)}
      </div>

      <div class=”card”>
        <div class=”card-hd”>
          <span class=”card-title”>Receita &amp; Investimento</span>
          <div class=”home-legend”>
            <span class=”hleg”><span class=”hleg-dot” style=”background:var(--grn)”></span>Receita (GA4)</span>
            <span class=”hleg”><span class=”hleg-dot” style=”background:var(--ads)”></span>Google Ads</span>
            <span class=”hleg”><span class=”hleg-dot” style=”background:var(--meta)”></span>Meta Ads</span>
          </div>
        </div>
        <canvas id=”homeChart” height=”200” style=”width:100%”></canvas>
        ${months.length < 2 ? '<p class=”chart-tip”>O gráfico de tendência fica mais expressivo conforme os meses se acumulam.</p>' : ''}
      </div>

      <div class=”card” id=”home-historico”>
        <div class=”card-hd”>
          <span class=”card-title”>Histórico Mensal</span>
          <span class=”card-sub”>Clique em uma linha ou em “Ver detalhes” para abrir o mês completo</span>
        </div>
        <div class=”htable-scroll”>
          <table class=”htable”>
            <thead>
              <tr class=”hthead-group”>
                <th rowspan=”2” class=”th-month”>Mês</th>
                <th colspan=”4” class=”thg thg-sum”>Resumo</th>
                <th colspan=”3” class=”thg thg-gads”>Google Ads</th>
                <th colspan=”3” class=”thg thg-meta”>Meta Ads</th>
                <th colspan=”3” class=”thg thg-aud”>Audiência</th>
                <th colspan=”3” class=”thg thg-eco”>E-commerce</th>
                <th rowspan=”2” class=”th-action”></th>
              </tr>
              <tr class=”hthead-cols”>
                <th>Receita</th><th>Pedidos</th><th>Inv. Total</th><th>ROAS</th>
                <th>Invest.</th><th>Conversões</th><th>ROAS</th>
                <th>Invest.</th><th>Compras</th><th>ROAS</th>
                <th>Usuários</th><th>Novos</th><th>Retorno</th>
                <th>Compradores</th><th>Carrinho</th><th>Itens</th>
              </tr>
            </thead>
            <tbody>
              ${months.slice().reverse().map(tableRowHtml).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>`;
}

// ── gráfico ────────────────────────────────────────────────
export function initHomeCharts(index) {
  _index = index;
  if (_activeView === 'audiencia') {
    initAudienceCharts(index);
  } else {
    _drawChart(index.months || [], _activePeriod);
  }
}

function _drawChart(allMonths, period) {
  const canvas = document.getElementById('homeChart');
  if (!canvas || !allMonths.length) return;

  // Sempre renderiza TODOS os meses; período selecionado = destaque, resto = transparente
  const months   = allMonths;
  const selected = new Set(filterMonths(allMonths, period).map(m => m.value));

  const DPR = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = 200;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  const revenues   = months.map(m => m.ga4?.revenue || 0);
  const gadsSpends = months.map(m => m.gads?.spend  || 0);
  const metaSpends = months.map(m => m.meta?.spend  || 0);
  const labels     = months.map(m => m.short || m.label.slice(0, 3));

  const PAD    = { t: 28, r: 16, b: 44, l: 72 };
  const CW     = W - PAD.l - PAD.r;
  const CH     = H - PAD.t - PAD.b;
  const n      = months.length;
  const maxRev = Math.max(...revenues, 1) * 1.2;
  const maxInv = Math.max(...gadsSpends.map((g, i) => g + metaSpends[i]), 1) * 1.2;
  const slotW  = CW / (n + 1);
  const bW     = Math.min(slotW * 0.28, 30);

  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = '#E8EDF5';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.t + CH * (1 - i / 4);
    ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
    ctx.fillStyle  = '#8898BB';
    ctx.font       = '10px system-ui,sans-serif';
    ctx.textAlign  = 'right';
    ctx.fillText(chartLbl(maxRev * i / 4), PAD.l - 6, y + 4);
  }

  months.forEach((m, i) => {
    const active = selected.has(m.value);
    const dimAlpha = 0.18;   // transparência dos meses fora do período
    const cx = PAD.l + slotW * (i + 0.8);

    // Receita (verde)
    const rH = CH * (revenues[i] / maxRev);
    const ry = PAD.t + CH - rH;
    ctx.fillStyle   = '#0A8A58';
    ctx.globalAlpha = active ? 0.88 : dimAlpha;
    _bar(ctx, cx - bW * 1.15, ry, bW, rH);
    if (revenues[i] && active) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0A8A58';
      ctx.font = 'bold 9px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(chartLbl(revenues[i]), cx - bW * 0.6, ry - 5);
    }

    // Google Ads (laranja)
    const gH = CH * (gadsSpends[i] / maxInv) * 0.5;
    const gy = PAD.t + CH - gH;
    ctx.fillStyle   = '#D4620A';
    ctx.globalAlpha = active ? 0.85 : dimAlpha;
    _bar(ctx, cx + 2, gy, bW, gH);

    // Meta (azul) empilhado
    const mH = CH * (metaSpends[i] / maxInv) * 0.5;
    const my = gy - mH;
    ctx.fillStyle   = '#1877F2';
    ctx.globalAlpha = active ? 0.75 : dimAlpha;
    if (mH > 0) _bar(ctx, cx + 2, my, bW, mH);
    ctx.globalAlpha = 1;

    const totalInv = gadsSpends[i] + metaSpends[i];
    if (totalInv && active) {
      ctx.fillStyle = '#D4620A';
      ctx.font = '9px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(chartLbl(totalInv), cx + bW * 0.6 + 2, my - 5);
    }

    // Label X — negrito e mais escuro para meses em destaque
    ctx.fillStyle = active ? '#1a2540' : '#9AAABB';
    ctx.font = active ? 'bold 11px system-ui,sans-serif' : '10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], cx, H - PAD.b + 14);
  });
}

function _bar(ctx, x, y, w, h) {
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, [3, 3, 0, 0]); ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}

// ── filtro de período ────────────────────────────────────────
window.setHomePeriod = function (period) {
  if (!_index || _activeView !== 'painel') return;
  _activePeriod = period;
  const months   = _index.months || [];
  const filtered = filterMonths(months, period);

  document.querySelectorAll('.hfb').forEach(b => {
    const map = { current: 'atual', '3': '3', '6': '6', all: 'Tudo' };
    b.classList.toggle('active', b.textContent.trim().includes(map[period]));
  });

  document.getElementById('homeKpiBand').innerHTML = kpiBandHtml(filtered);
  _drawChart(months, period);
};

// ── troca de sub-aba ─────────────────────────────────────────
window.setHomeView = function (view) {
  if (!_index) return;
  _activeView = view;
  const main = document.getElementById('mainContent');
  if (!main) return;
  main.innerHTML = renderHome(_index);
  initHomeCharts(_index);
};
