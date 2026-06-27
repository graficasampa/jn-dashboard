// Análise de Audiência & Estratégia — sub-aba do Painel Executivo

const _R  = n => n == null ? '—' : 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2});
const _R0 = n => n == null ? '—' : 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits:0,maximumFractionDigits:0});
const _N  = n => n == null ? '—' : n.toLocaleString('pt-BR');
const _P  = (v,d=1) => (v==null||isNaN(v)) ? '—' : Number(v).toFixed(d).replace('.',',') + '%';
const _X  = r => (r==null||isNaN(r)||r===0) ? '—' : r.toFixed(1) + '×';
const _rc = r => r==null ? '' : `color:${r>=10?'var(--grn)':r>=3?'var(--amb)':'var(--red)'}`;

// ─── aggregation ─────────────────────────────────────────────────────────────
function computeStats(months) {
  const valid = months.filter(m => m.ga4);
  if (!valid.length) return null;
  const sm = (arr, fn) => arr.reduce((a, m) => a + (fn(m) || 0), 0);
  const sv = fn => sm(valid, fn);

  const totNewUsers  = sv(m => m.ga4.newUsers);
  const totRetUsers  = sv(m => m.ga4.returningUsers);
  const totNewRev    = sv(m => m.ga4.newRevenue);
  const totRetRev    = sv(m => m.ga4.returningRevenue);
  const totNewOrd    = sv(m => m.ga4.newOrders);
  const totRetOrd    = sv(m => m.ga4.returningOrders);
  const totRev       = sv(m => m.ga4.revenue);
  const totOrders    = sv(m => m.ga4.orders);
  const totGadsSpend = sv(m => m.gads?.spend);
  const totGadsConv  = sv(m => m.gads?.conversions);
  const totGadsRev   = sv(m => (m.gads?.spend || 0) * (m.gads?.roas || 0));
  const totMetaSpend = sv(m => m.meta?.spend);
  const totMetaPurch = sv(m => m.meta?.purchases);
  const totMetaRev   = sv(m => (m.meta?.spend || 0) * (m.meta?.roas || 0));
  const totInv       = totGadsSpend + totMetaSpend;

  const retRevPct = totRev > 0 ? totRetRev / totRev * 100 : 0;
  const newRevPct = totRev > 0 ? totNewRev / totRev * 100 : 0;
  const revPerRet = totRetUsers > 0 ? totRetRev / totRetUsers : 0;
  const revPerNew = totNewUsers > 0 ? totNewRev / totNewUsers : 0;
  const revRatio  = revPerNew > 0 ? revPerRet / revPerNew : null;

  const gadsROAS    = totGadsSpend > 0 ? totGadsRev / totGadsSpend : 0;
  const metaROAS    = totMetaSpend > 0 ? totMetaRev / totMetaSpend : 0;
  const gadsCPA     = totGadsConv  > 0 ? totGadsSpend / totGadsConv  : 0;
  const metaCPA     = totMetaPurch > 0 ? totMetaSpend / totMetaPurch : 0;
  const overallROAS = totInv > 0 ? totRev / totInv : 0;

  const sortByRev = [...valid].sort((a, b) => (b.ga4?.revenue || 0) - (a.ga4?.revenue || 0));

  const half      = Math.floor(valid.length / 2);
  const avgNew1st = half > 0 ? sm(valid.slice(0, half), m => m.ga4.newUsers) / half : 0;
  const avgNew2nd = (valid.length - half) > 0 ? sm(valid.slice(half), m => m.ga4.newUsers) / (valid.length - half) : 0;

  return {
    totNewUsers, totRetUsers, totNewRev, totRetRev, totNewOrd, totRetOrd,
    totRev, totOrders, retRevPct, newRevPct, revPerRet, revPerNew, revRatio,
    totGadsSpend, totGadsConv, totGadsRev, totMetaSpend, totMetaPurch, totMetaRev,
    totInv, gadsROAS, metaROAS, gadsCPA, metaCPA, overallROAS,
    bestRevMonth: sortByRev[0],
    avgNew1st, avgNew2nd,
    n: valid.length,
    periodLabel: valid.length > 1
      ? `${valid[0].short}–${valid[valid.length - 1].short}`
      : valid[0]?.short || ''
  };
}

// ─── insights dinâmicos ────────────────────────────────────────────────────────
function generateInsights(st) {
  const trendUp  = st.avgNew2nd >= st.avgNew1st;
  const trendPct = st.avgNew1st > 0 ? Math.abs((st.avgNew2nd - st.avgNew1st) / st.avgNew1st * 100) : 0;
  const gadsPct  = st.totInv > 0 ? st.totGadsSpend / st.totInv * 100 : 0;
  const metaPct  = 100 - gadsPct;

  return [
    {
      type: 'warn', tag: 'Ação Prioritária',
      title: `Reimpacte a base ativa: cada recorrente vale ${_X(st.revRatio)} mais — foco aqui tem o maior ROI`,
      body: `Com ${_P(st.retRevPct)} da receita vinda de quem já comprou, campanhas de remarketing e recompra têm retorno muito superior à aquisição pura. Priorize: (1) remarketing de clientes há +60 dias sem compra, (2) recuperação de carrinho abandonado, (3) upsell/cross-sell por e-mail ou WhatsApp, (4) campanhas de reativação no Meta e Google com lista de compradores.`
    },
    {
      type: 'pos', tag: 'Retenção',
      title: `Clientes recorrentes: ${_P(st.retRevPct)} da receita com ${_P(st.totRetUsers / (st.totRetUsers + st.totNewUsers) * 100)} dos usuários`,
      body: `Média de ${_N(Math.round(st.totRetUsers / st.n))} recorrentes/mês geram ${_R0(st.totRetRev / st.n)}/mês em receita. Valor médio por recorrente: ${_R(st.revPerRet)} vs ${_R(st.revPerNew)} por novo usuário — diferença de ${_X(st.revRatio)}.`
    },
    {
      type: 'warn', tag: 'Canais de Mídia',
      title: `G.Ads ROAS ${_X(st.gadsROAS)} (alvo estimado) · Meta ROAS ${_X(st.metaROAS)} (real) · ${_P(gadsPct, 0)} / ${_P(metaPct, 0)} do budget`,
      body: `G.Ads: ${_R0(st.totGadsSpend)} investidos, CPA ~${_R(st.gadsCPA)}, ${_N(st.totGadsConv)} conv. atribuídas. Meta: ${_R0(st.totMetaSpend)} investidos, CPA ${_R(st.metaCPA)}, ${_N(st.totMetaPurch)} compras rastreadas. Dica: ative conversão real no G.Ads para dados mais precisos.`
    },
    {
      type: 'pos', tag: 'Melhor Mês',
      title: st.bestRevMonth
        ? `${st.bestRevMonth.label}: ${_R0(st.bestRevMonth.ga4?.revenue)} — pico do período`
        : 'Sem dados suficientes',
      body: st.bestRevMonth
        ? `${_N(st.bestRevMonth.ga4?.orders)} pedidos · ticket médio ${_R(st.bestRevMonth.ga4?.avgTicket)} · ROAS geral ${_X(st.bestRevMonth.derived?.overallROAS)} · invest. ${_R0(st.bestRevMonth.derived?.totalInvestment)}. Analisar o que impulsionou este mês (sazonalidade, campanhas, criativos) e replicar estratégia.`
        : ''
    },
    {
      type: trendUp ? 'pos' : 'warn', tag: 'Aquisição de Novos',
      title: `Novos usuários ${trendUp ? 'crescendo' : 'em queda'}: ${trendPct.toFixed(0)}% na 2ª metade do período`,
      body: `1ª metade do período: ~${_N(Math.round(st.avgNew1st))} novos/mês → 2ª metade: ~${_N(Math.round(st.avgNew2nd))} novos/mês. ${trendUp ? 'Sinal positivo — manter esforços de topo de funil e testar novos públicos lookalike.' : 'Revisar criativos, públicos e landing pages de aquisição. Testar novos formatos e segmentações para reverter a queda.'}`
    },
    {
      type: 'warn', tag: 'ROAS Consolidado',
      title: `ROAS do período: ${_X(st.overallROAS)} — ${_R0(st.totRev)} gerados com ${_R0(st.totInv)} investidos`,
      body: `${st.n} meses analisados. ${st.overallROAS >= 10 ? 'Excelente retorno — aumentar budget com cautela, monitorando margem e CAC.' : st.overallROAS >= 5 ? 'Bom retorno. Identificar os meses e campanhas de maior ROAS e amplificar o que funciona.' : 'ROAS abaixo do ideal. Revisar segmentações, criativos e funil de conversão. Focar mais em base ativa antes de ampliar aquisição.'}`
    }
  ];
}

// ─── gráfico 1: usuários por mês (barras empilhadas + linha receita%) ─────────
function drawAudienceChart(canvas, months) {
  if (!canvas || !months.length) return;
  const DPR = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 800;
  const H = 230;
  canvas.width  = W * DPR; canvas.height = H * DPR;
  canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  const retU   = months.map(m => m.ga4?.returningUsers || 0);
  const newU   = months.map(m => m.ga4?.newUsers       || 0);
  const revPct = months.map(m => {
    const rv = m.ga4?.revenue || 1;
    return (m.ga4?.returningRevenue || 0) / rv * 100;
  });
  const labels = months.map(m => m.short);
  const n      = months.length;
  const maxU   = Math.max(...retU.map((r, i) => r + newU[i]), 1) * 1.18;

  const PAD  = { t:20, r:46, b:38, l:58 };
  const CW   = W - PAD.l - PAD.r;
  const CH   = H - PAD.t - PAD.b;
  const slot = CW / (n + 1);
  const bW   = Math.min(slot * 0.58, 32);
  const cx   = i => PAD.l + slot * (i + 0.8);

  ctx.clearRect(0, 0, W, H);

  // Grid + left Y axis (user counts)
  ctx.strokeStyle = '#E8EDF5'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.t + CH * (1 - i / 4);
    ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
    if (i > 0) {
      const v = maxU * i / 4;
      ctx.fillStyle = '#8898BB'; ctx.font = '10px system-ui,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v).toString(), PAD.l - 5, y + 3);
    }
  }

  // Stacked bars per month
  months.forEach((_, i) => {
    const x  = cx(i) - bW / 2;
    const rh = (retU[i] / maxU) * CH;
    const nh = (newU[i] / maxU) * CH;
    const gy = PAD.t + CH - rh;
    const ny = gy - nh;

    // Recorrentes (verde, baixo)
    ctx.fillStyle = '#0A8A58'; ctx.globalAlpha = 0.86;
    if (rh > 0) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, gy, bW, rh, [2,2,0,0]); else ctx.rect(x, gy, bW, rh); ctx.fill(); }

    // Novos (azul, cima)
    ctx.fillStyle = '#1449C8'; ctx.globalAlpha = 0.65;
    if (nh > 0) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, ny, bW, nh, [2,2,0,0]); else ctx.rect(x, ny, bW, nh); ctx.fill(); }

    ctx.globalAlpha = 1;

    // Label X
    ctx.fillStyle = '#4A5670'; ctx.font = '600 10px system-ui,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], cx(i), H - PAD.b + 13);
  });

  // Linha % receita recorrentes (eixo Y direito, laranja)
  ctx.strokeStyle = '#D4620A'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.setLineDash([]);
  let started = false;
  ctx.beginPath();
  revPct.forEach((v, i) => {
    const y = PAD.t + CH * (1 - v / 100);
    if (!started) { ctx.moveTo(cx(i), y); started = true; } else ctx.lineTo(cx(i), y);
  });
  if (started) ctx.stroke();

  // Pontos na linha
  revPct.forEach((v, i) => {
    const y = PAD.t + CH * (1 - v / 100);
    ctx.beginPath(); ctx.arc(cx(i), y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#D4620A'; ctx.fill();
  });

  // Rótulos eixo direito (%)
  ctx.fillStyle = '#D4620A'; ctx.font = '10px system-ui,sans-serif'; ctx.textAlign = 'left';
  [25, 50, 75, 100].forEach(v => {
    ctx.fillText(v + '%', W - PAD.r + 4, PAD.t + CH * (1 - v / 100) + 3);
  });
}

// ─── gráfico 2: investimento + ROAS ────────────────────────────────────────────
function drawInvestmentChart(canvas, months) {
  if (!canvas || !months.length) return;
  const DPR = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 800;
  const H = 190;
  canvas.width  = W * DPR; canvas.height = H * DPR;
  canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  const gads  = months.map(m => m.gads?.spend || 0);
  const meta  = months.map(m => m.meta?.spend || 0);
  const roasO = months.map(m => m.derived?.overallROAS || 0);
  const roasM = months.map(m => m.meta?.roas || 0);
  const labels = months.map(m => m.short);
  const n = months.length;
  const maxInv  = Math.max(...gads.map((g, i) => g + meta[i]), 1) * 1.2;
  const roasAll = [...roasO, ...roasM].filter(v => v > 0);
  const maxROAS = roasAll.length ? Math.max(...roasAll) * 1.25 : 30;

  const PAD  = { t:20, r:46, b:38, l:58 };
  const CW   = W - PAD.l - PAD.r;
  const CH   = H - PAD.t - PAD.b;
  const slot = CW / (n + 1);
  const bW   = Math.min(slot * 0.58, 32);
  const cx   = i => PAD.l + slot * (i + 0.8);
  const yr   = v => PAD.t + CH * (1 - v / maxROAS);

  ctx.clearRect(0, 0, W, H);

  // Grid + left Y axis (investimento)
  ctx.strokeStyle = '#E8EDF5'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.t + CH * (1 - i / 4);
    ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
    if (i > 0) {
      const v = maxInv * i / 4;
      ctx.fillStyle = '#8898BB'; ctx.font = '10px system-ui,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('R$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0)), PAD.l - 5, y + 3);
    }
  }

  // Barras empilhadas: G.Ads (laranja, baixo) + Meta (azul, cima)
  months.forEach((_, i) => {
    const x  = cx(i) - bW / 2;
    const gh = (gads[i] / maxInv) * CH;
    const mh = (meta[i] / maxInv) * CH;
    const gy = PAD.t + CH - gh;
    const my = gy - mh;

    ctx.fillStyle = '#D4620A'; ctx.globalAlpha = 0.84;
    if (gh > 0) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, gy, bW, gh, [2,2,0,0]); else ctx.rect(x, gy, bW, gh); ctx.fill(); }

    ctx.fillStyle = '#1877F2'; ctx.globalAlpha = 0.76;
    if (mh > 0) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, my, bW, mh, [2,2,0,0]); else ctx.rect(x, my, bW, mh); ctx.fill(); }

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#4A5670'; ctx.font = '600 10px system-ui,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], cx(i), H - PAD.b + 13);
  });

  // Linha ROAS geral (verde, sólida)
  const drawLine = (data, color, dashed) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.setLineDash(dashed ? [5, 3] : []);
    let s = false;
    ctx.beginPath();
    data.forEach((v, i) => {
      if (!v) return;
      if (!s) { ctx.moveTo(cx(i), yr(v)); s = true; } else ctx.lineTo(cx(i), yr(v));
    });
    if (s) ctx.stroke();
    ctx.setLineDash([]);
    data.forEach((v, i) => {
      if (!v) return;
      ctx.beginPath(); ctx.arc(cx(i), yr(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    });
  };

  drawLine(roasO, '#0A8A58', false);
  drawLine(roasM, '#1877F2', true);

  // Rótulos eixo direito (ROAS)
  ctx.fillStyle = '#0A8A58'; ctx.font = '10px system-ui,sans-serif'; ctx.textAlign = 'left';
  [maxROAS / 4, maxROAS / 2, maxROAS * 3 / 4, maxROAS].forEach(v => {
    ctx.fillText(v.toFixed(0) + '×', W - PAD.r + 4, yr(v) + 3);
  });
}

// ─── render principal ─────────────────────────────────────────────────────────
export function renderAudience(index) {
  const months = (index.months || []).filter(m => m.ga4);
  if (!months.length) return '<div style="padding:48px;text-align:center;color:var(--t3)">Sem dados</div>';

  const st = computeStats(months);
  if (!st) return '';

  const insights = generateInsights(st);
  const gadsPct  = st.totInv > 0 ? st.totGadsSpend / st.totInv * 100 : 0;
  const metaPct  = 100 - gadsPct;

  // Linhas da tabela mensal (mais recente primeiro)
  const rows = [...months].reverse().map(m => {
    if (!m.ga4) return '';
    const tot    = (m.ga4.newUsers || 0) + (m.ga4.returningUsers || 0);
    const retPct = m.ga4.revenue > 0 ? (m.ga4.returningRevenue || 0) / m.ga4.revenue * 100 : 0;
    const rpRet  = m.ga4.returningUsers > 0 ? (m.ga4.returningRevenue || 0) / m.ga4.returningUsers : 0;
    const rpNew  = m.ga4.newUsers       > 0 ? (m.ga4.newRevenue       || 0) / m.ga4.newUsers       : 0;
    const clr    = retPct >= 90 ? 'var(--grn)' : retPct >= 70 ? 'var(--amb)' : 'var(--red)';
    return `<tr>
      <td style="font-weight:700;white-space:nowrap">${m.short}</td>
      <td>${_N(tot)}</td>
      <td style="color:var(--blu)">${_N(m.ga4.newUsers)}</td>
      <td style="color:var(--grn)">${_N(m.ga4.returningUsers)}</td>
      <td style="color:var(--t2)">${_R0(m.ga4.newRevenue)}</td>
      <td style="color:var(--grn);font-weight:700">${_R0(m.ga4.returningRevenue)}</td>
      <td style="color:${clr};font-weight:700">${_P(retPct)}</td>
      <td>${_R(rpNew)}</td>
      <td style="color:var(--grn);font-weight:700">${_R(rpRet)}</td>
    </tr>`;
  }).join('');

  return `
<div style="display:flex;flex-direction:column;gap:18px">

  <!-- cabeçalho do período -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid var(--bdr2)">
    <div>
      <div style="font-size:15px;font-weight:800;color:var(--t1)">Análise de Audiência &amp; Estratégia</div>
      <div style="font-size:11px;color:var(--t3);margin-top:2px">${st.n} meses · ${st.periodLabel} · ${_N(st.totNewUsers + st.totRetUsers)} usuários totais</div>
    </div>
  </div>

  <!-- 4 KPIs hero -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
    <div class="kpi" style="border-left:3px solid var(--grn)">
      <div class="kpi-lbl">Receita — Recorrentes</div>
      <div class="kpi-val grn" style="font-size:24px">${_P(st.retRevPct)}</div>
      <div class="kpi-sub">${_R0(st.totRetRev)} de ${_R0(st.totRev)}</div>
    </div>
    <div class="kpi" style="border-left:3px solid var(--blu)">
      <div class="kpi-lbl">Receita — Novos Usuários</div>
      <div class="kpi-val" style="color:var(--blu);font-size:24px">${_P(st.newRevPct)}</div>
      <div class="kpi-sub">${_R0(st.totNewRev)} de ${_R0(st.totRev)}</div>
    </div>
    <div class="kpi" style="border-left:3px solid var(--grn)">
      <div class="kpi-lbl">Receita / Recorrente</div>
      <div class="kpi-val grn" style="font-size:20px">${_R(st.revPerRet)}</div>
      <div class="kpi-sub">vs ${_R(st.revPerNew)} / novo usuário</div>
    </div>
    <div class="kpi" style="border-left:3px solid var(--amb)">
      <div class="kpi-lbl">Recorrente vale</div>
      <div class="kpi-val" style="color:var(--amb);font-size:24px">${_X(st.revRatio)}</div>
      <div class="kpi-sub">mais em receita que novo usuário</div>
    </div>
  </div>

  <!-- gráfico audiência -->
  <div class="card">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <div>
        <div class="card-ttl">Novos vs. Recorrentes por Mês</div>
        <div class="card-sub" style="margin-bottom:0">Barras = nº de usuários · Linha laranja = % da receita gerada por recorrentes (eixo dir.)</div>
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:11px;color:var(--t2)">
        <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--grn);opacity:.86;display:inline-block"></span>Recorrentes</span>
        <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--blu);opacity:.65;display:inline-block"></span>Novos</span>
        <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:2.5px;background:#D4620A;display:inline-block;border-radius:2px"></span>% receita recorrentes</span>
      </div>
    </div>
    <canvas id="audChart" style="width:100%;display:block"></canvas>
  </div>

  <!-- tabela mensal -->
  <div class="tbl-card">
    <div class="tbl-head"><div class="card-ttl" style="margin-bottom:0">Audiência Detalhada por Mês</div></div>
    <div class="tbl-wrap"><div class="tbl-scroll">
      <table>
        <thead><tr>
          <th style="text-align:left">Mês</th>
          <th>Usuários</th>
          <th style="color:var(--blu)">Novos</th>
          <th style="color:var(--grn)">Recorrentes</th>
          <th>Receita Novos</th>
          <th style="color:var(--grn)">Receita Recorrentes</th>
          <th>% Receita Recorrente</th>
          <th>Receita/Novo</th>
          <th style="color:var(--grn)">Receita/Recorrente</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div></div>
  </div>

  <!-- comparativo canais -->
  <div>
    <div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:10px">Comparativo de Canais de Investimento · ${st.n} meses</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">

      <div class="card" style="border-top:3px solid #D4620A">
        <div style="font-size:12px;font-weight:800;color:#D4620A;margin-bottom:12px;text-transform:uppercase;letter-spacing:.04em">Google Ads</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">Investimento</div><div style="font-size:17px;font-weight:800">${_R0(st.totGadsSpend)}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">Receita Atribuída</div><div style="font-size:17px;font-weight:800">${_R0(st.totGadsRev)}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">ROAS Médio</div><div style="font-size:17px;font-weight:800;${_rc(st.gadsROAS)}">${_X(st.gadsROAS)}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">CPA Médio</div><div style="font-size:17px;font-weight:800">${_R(st.gadsCPA)}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">Conversões</div><div style="font-size:17px;font-weight:800">${_N(st.totGadsConv)}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">% do Budget</div><div style="font-size:17px;font-weight:800">${_P(gadsPct, 0)}</div></div>
        </div>
      </div>

      <div class="card" style="border-top:3px solid #1877F2">
        <div style="font-size:12px;font-weight:800;color:#1877F2;margin-bottom:12px;text-transform:uppercase;letter-spacing:.04em">Meta Ads</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">Investimento</div><div style="font-size:17px;font-weight:800">${_R0(st.totMetaSpend)}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">Receita Atribuída</div><div style="font-size:17px;font-weight:800">${_R0(st.totMetaRev)}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">ROAS Médio</div><div style="font-size:17px;font-weight:800;${_rc(st.metaROAS)}">${_X(st.metaROAS)}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">CPA Médio</div><div style="font-size:17px;font-weight:800">${_R(st.metaCPA)}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">Compras</div><div style="font-size:17px;font-weight:800">${_N(st.totMetaPurch)}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:3px">% do Budget</div><div style="font-size:17px;font-weight:800">${_P(metaPct, 0)}</div></div>
        </div>
      </div>

    </div>
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <div>
          <div class="card-ttl">Investimento &amp; ROAS por Mês</div>
          <div class="card-sub" style="margin-bottom:0">Barras = investimento · Linhas = ROAS geral (verde) e Meta ROAS (azul)</div>
        </div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:11px;color:var(--t2)">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#D4620A;opacity:.84;display:inline-block"></span>G.Ads invest.</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#1877F2;opacity:.76;display:inline-block"></span>Meta invest.</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:2.5px;background:var(--grn);display:inline-block;border-radius:2px"></span>ROAS geral</span>
          <span style="display:flex;align-items:center;gap:4px" style="border-top:2px dashed #1877F2"><span style="width:14px;height:0;display:inline-block;border-top:2.5px dashed #1877F2"></span>ROAS Meta</span>
        </div>
      </div>
      <canvas id="invChart" style="width:100%;display:block"></canvas>
    </div>
  </div>

  <!-- insights estratégicos -->
  <div>
    <div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:10px">Insights Estratégicos</div>
    <div class="ins-grid" style="grid-template-columns:repeat(2,1fr)">
      ${insights.map(ins => `
      <div class="ins ${ins.type}">
        <div class="ins-type">${ins.tag}</div>
        <div class="ins-ttl">${ins.title}</div>
        <div class="ins-body">${ins.body}</div>
      </div>`).join('')}
    </div>
  </div>

</div>`;
}

// ─── inicializar gráficos ─────────────────────────────────────────────────────
export function initAudienceCharts(index) {
  const months = (index.months || []).filter(m => m.ga4);
  const ac = document.getElementById('audChart');
  const ic = document.getElementById('invChart');
  if (ac) drawAudienceChart(ac, months);
  if (ic) drawInvestmentChart(ic, months);
}
