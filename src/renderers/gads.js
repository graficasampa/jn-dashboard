const fmt0 = v => Number(v).toLocaleString('pt-BR', {minimumFractionDigits:0, maximumFractionDigits:0});
const fmt2 = v => Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
const brl  = v => 'R$ ' + fmt2(v);
const brl0 = v => 'R$ ' + fmt0(v);
const pct  = (v, d=1) => Number(v).toFixed(d).replace('.',',') + '%';
const mult = v => Number(v).toFixed(1).replace('.',',') + '×';

// ── Daily cost + conversions chart (canvas) ──────────────────────────────
function drawGadsChart(canvas, daily) {
  const dpr = window.devicePixelRatio || 1;
  const W   = (canvas.parentElement.clientWidth || 900) - 36;
  const H   = 180;
  canvas.width  = W * dpr; canvas.height = H * dpr;
  canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const n   = daily.length;
  const PL=48, PR=12, PT=14, PB=44, CW=W-PL-PR, CH=H-PT-PB;
  const maxCost = Math.max(...daily.map(d => d.cost), 1);
  const maxConv = Math.max(...daily.map(d => d.conversions), 1);
  const sw = CW / n;
  const xm = i => PL + (i + .5) * sw;
  const yc  = v => PT + CH - (v / maxCost) * CH;
  const ycv = v => PT + CH - (v / maxConv) * CH;

  // pause zone shading (days 9–20 = indices 9–19)
  ctx.fillStyle = 'rgba(190,43,43,.04)';
  ctx.fillRect(PL + 9*sw, PT, 11*sw, CH);
  ctx.fillStyle = 'rgba(190,43,43,.08)';
  ctx.font = '9px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#BE2B2B';
  ctx.fillText('campanhas pausadas', PL + 9*sw + 5.5*sw, PT + 10);

  // grid
  [0, .25, .5, .75, 1].forEach(t => {
    ctx.strokeStyle = '#DDE4EE'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PL, PT+CH*(1-t)); ctx.lineTo(PL+CW, PT+CH*(1-t)); ctx.stroke();
    if (t > 0) {
      ctx.fillStyle = '#7A8FA3'; ctx.font = '9px system-ui,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('R$' + (maxCost*t >= 100 ? Math.round(maxCost*t) : (maxCost*t).toFixed(0)), PL-4, PT+CH*(1-t)+3);
    }
  });

  // cost bars
  const bw = sw * .72, gap = sw * .14;
  daily.forEach((d, i) => {
    if (d.cost <= 0) return;
    const bh = (d.cost / maxCost) * CH;
    ctx.fillStyle = d.cost > 100 ? 'rgba(20,73,200,.75)' : 'rgba(20,73,200,.45)';
    ctx.fillRect(PL + i*sw + gap, PT+CH-bh, bw, bh);
  });

  // conversions line
  const hasPts = daily.filter(d => d.conversions > 0);
  if (hasPts.length > 1) {
    ctx.beginPath(); ctx.strokeStyle = '#0A8A58'; ctx.lineWidth = 1.5; ctx.setLineDash([3,3]); ctx.lineJoin = 'round';
    let started = false;
    daily.forEach((d, i) => {
      if (d.conversions > 0 || d.cost > 0) {
        started ? ctx.lineTo(xm(i), ycv(d.conversions)) : (ctx.moveTo(xm(i), ycv(d.conversions)), started=true);
      }
    });
    ctx.stroke(); ctx.setLineDash([]);
  }

  // x labels
  ctx.fillStyle = '#7A8FA3'; ctx.font = '9px system-ui,sans-serif'; ctx.textAlign = 'center';
  [0,3,6,8,12,15,18,21,22].forEach(i => ctx.fillText((i+1)+'.06', xm(i), PT+CH+13));

  // cost labels on active bars
  ctx.font = 'bold 8px system-ui,sans-serif';
  daily.forEach((d, i) => {
    if (d.cost < 10) return;
    ctx.fillStyle = '#1449C8';
    ctx.fillText('R$'+Math.round(d.cost), xm(i), PT+CH-(d.cost/maxCost)*CH-5);
  });
}

export function renderGads(data) {
  const s   = data.summary;
  const k   = data.kpis;
  const maxSpend = Math.max(...data.campaigns.map(c => c.spend));

  const campRows = data.campaigns.map(c => {
    const roasCls  = c.roas >= 10 ? 'tok' : c.roas >= 1 ? '' : 'twarn';
    const cpaCls   = c.cpa  <= 10 ? 'tok' : c.cpa  >= 30 ? 'twarn' : '';
    const typeColor = c.type === 'PERFORMANCE_MAX' ? 'var(--blu)' : '#EA580C';
    return `<tr>
      <td class="ta"><span style="font-size:10px;font-weight:700;color:${typeColor};background:${c.type==='PERFORMANCE_MAX'?'var(--blu-l)':'#FFF4EC'};padding:2px 6px;border-radius:3px;margin-right:6px">${c.typeBadge}</span>${c.name}</td>
      <td class="tbrl">${brl(c.spend)}</td>
      <td class="${roasCls}">${c.roas > 0 ? mult(c.roas) : '<span class="twarn">0×</span>'}</td>
      <td>${fmt0(c.impressions)}</td>
      <td>${fmt0(c.clicks)}</td>
      <td>${pct(c.ctr)}</td>
      <td>${brl(c.cpc)}</td>
      <td class="${c.conversions > 0 ? 'tok' : 'twarn'}">${c.conversions}</td>
      <td class="${cpaCls}">${c.conversions > 0 ? brl(c.cpa) : '—'}</td>
    </tr>`;
  }).join('');

  const kwRows = data.keywords.map((kw, i) => {
    const roasCls = kw.roas >= 10 ? 'tok' : kw.roas > 0 ? '' : kw.spend > 10 ? 'twarn' : '';
    const convCls = kw.conversions > 0 ? 'tok' : kw.spend > 10 ? 'twarn' : '';
    return `<tr>
      <td class="trnk">${i+1}</td>
      <td class="ta">${kw.keyword}</td>
      <td><span style="font-size:10px;padding:1px 5px;background:var(--sur2);border-radius:3px;color:var(--t3)">${kw.matchType}</span></td>
      <td class="tbrl">${brl(kw.spend)}</td>
      <td>${fmt0(kw.clicks)}</td>
      <td>${fmt0(kw.impressions)}</td>
      <td>${pct(kw.ctr)}</td>
      <td>${brl(kw.cpc)}</td>
      <td class="${convCls}">${kw.conversions > 0 ? kw.conversions : '<span class="twarn">0</span>'}</td>
      <td class="${roasCls}">${kw.roas > 0 ? mult(kw.roas) : '<span class="twarn">—</span>'}</td>
    </tr>`;
  }).join('');

  const agRows = data.adGroups.map(ag => {
    const roasCls = ag.roas >= 10 ? 'tok' : ag.roas >= 1 ? '' : 'twarn';
    const bw = Math.round((ag.spend / maxSpend) * 100);
    return `<tr>
      <td class="ta">${ag.name}</td>
      <td style="font-size:11px;color:var(--t3)">${ag.campaign.replace(/\[SEARCH\]\s*/,'')}</td>
      <td class="tbrl">${brl(ag.spend)}</td>
      <td><div style="display:flex;align-items:center;gap:6px"><div style="width:60px;height:4px;background:var(--bdr);border-radius:2px;overflow:hidden;flex-shrink:0"><div style="width:${bw}%;height:100%;border-radius:2px;background:var(--blu)"></div></div><span style="font-size:11px;color:var(--t3)">${bw}%</span></div></td>
      <td>${fmt0(ag.clicks)}</td>
      <td>${pct(ag.ctr)}</td>
      <td>${brl(ag.cpc)}</td>
      <td class="${ag.conversions > 0 ? 'tok' : 'twarn'}">${ag.conversions}</td>
      <td class="${roasCls}">${ag.roas > 0 ? mult(ag.roas) : '<span class="twarn">0×</span>'}</td>
    </tr>`;
  }).join('');

  return `
<div id="panel-gads" class="platform-panel visible">
<section class="sec" id="gads-resumo">
  <div class="sec-ttl">Google Ads — JN Impressão · ${data.period.label} · Conta ${data.account.id}</div>

  <!-- HL Band -->
  <div class="hl-band" style="grid-template-columns:repeat(5,1fr);margin-bottom:24px">
    <div>
      <div class="hl-val" style="color:var(--blu)">${brl0(s.spend)}</div>
      <div class="hl-lbl">Investimento Total</div>
      <div><span class="hl-trend hl-neutral">${data.period.days} dias · ${data.campaigns.length} campanhas</span></div>
    </div>
    <div>
      <div class="hl-val hl-grn">${brl0(s.attributedRevenue)}</div>
      <div class="hl-lbl">Receita Atribuída</div>
      <div><span class="hl-trend hl-up">↑ ROAS ${mult(s.roas)}</span></div>
    </div>
    <div>
      <div class="hl-val" style="color:var(--grn)">${fmt0(s.attributedConversions)}</div>
      <div class="hl-lbl">Conversões</div>
      <div><span class="hl-trend hl-up">↑ CPA ${brl(s.cpa)}/conv.</span></div>
    </div>
    <div>
      <div class="hl-val hl-dark">${fmt0(s.clicks)}</div>
      <div class="hl-lbl">Cliques</div>
      <div><span class="hl-trend hl-up">↑ CTR ${pct(s.ctr)}</span></div>
    </div>
    <div>
      <div class="hl-val hl-dark">${fmt0(s.impressions)}</div>
      <div class="hl-lbl">Impressões</div>
      <div><span class="hl-trend hl-neutral">CPC médio ${brl(s.cpc)}</span></div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="g4" style="margin-bottom:10px">
    <div class="kpi gold">
      <div class="kpi-lbl">ROAS Total</div>
      <div class="kpi-val brl">${mult(s.roas)}</div>
      <div class="kpi-sub">R$1 investido → R${fmt2(s.roas)} em receita atribuída</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">CPA — Custo por Conversão</div>
      <div class="kpi-val grn">${brl(s.cpa)}</div>
      <div class="kpi-sub">${pct(s.conversionRate)} de conversão nos cliques</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">CPC Médio</div>
      <div class="kpi-val">${brl(s.cpc)}</div>
      <div class="kpi-sub">${fmt0(s.clicks)} cliques · CTR ${pct(s.ctr)}</div>
    </div>
    <div class="kpi" style="border-left:3px solid var(--red)">
      <div class="kpi-lbl">Dias Ativos no Mês</div>
      <div class="kpi-val" style="color:var(--red)">${s.activeDays} / ${data.period.days}</div>
      <div class="kpi-sub"><span class="badge br">Pausado ${s.pausedRange}</span></div>
    </div>
  </div>

  <!-- Alerta de pausa -->
  <div style="padding:12px 16px;background:#FFF0F0;border:1px solid #FFCDD2;border-left:3px solid var(--red);border-radius:var(--rs);margin-bottom:24px;display:flex;align-items:flex-start;gap:10px">
    <div style="font-size:16px;flex-shrink:0">⚠️</div>
    <div>
      <div style="font-size:12px;font-weight:700;color:var(--red);margin-bottom:3px">Campanhas ficaram pausadas de 10/06 a 20/06 (11 dias)</div>
      <div style="font-size:11.5px;color:var(--t2)">97,6% do orçamento foi gasto nos primeiros 9 dias. Os dias 10–20 tiveram custo praticamente zero. Reative o orçamento para distribuir melhor o investimento ao longo do mês.</div>
    </div>
  </div>
</section>

<!-- ═══ GRÁFICO DIÁRIO ═══ -->
<section class="sec" id="gads-diario">
  <div class="sec-ttl">Gasto Diário & Conversões</div>
  <div class="card" style="margin-bottom:10px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <div>
        <div class="card-ttl">Custo por Dia — ${data.period.label}</div>
        <div class="card-sub" style="margin-bottom:0">Barras azuis = gasto · tracejado verde = conversões · área vermelha = campanhas pausadas</div>
      </div>
      <div style="display:flex;gap:14px;align-items:center">
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><span style="width:10px;height:10px;border-radius:2px;background:var(--blu);display:inline-block;opacity:.75"></span>Gasto</span>
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><span style="width:14px;height:2px;background:var(--grn);display:inline-block;border-top:2px dashed var(--grn)"></span>Conversões</span>
      </div>
    </div>
    <canvas id="gadsChart" height="180"></canvas>
  </div>
</section>

<!-- ═══ CAMPANHAS ═══ -->
<section class="sec" id="gads-campanhas">
  <div class="sec-ttl">Campanhas</div>
  <div class="tbl-card" style="margin-bottom:10px">
    <div class="tbl-head">
      <div class="card-ttl" style="margin-bottom:2px">Desempenho por Campanha — ${data.period.label}</div>
      <div style="font-size:11px;color:var(--t3)">Receita e conversões atribuídas pelo GA4 (last-click attribution)</div>
    </div>
    <div class="tbl-wrap"><div class="tbl-scroll">
      <table>
        <thead><tr><th>Campanha</th><th>Gasto</th><th>ROAS</th><th>Impressões</th><th>Cliques</th><th>CTR</th><th>CPC</th><th>Conversões</th><th>CPA</th></tr></thead>
        <tbody>${campRows}</tbody>
      </table>
    </div></div>
  </div>

  <div class="g2">
    <div class="card">
      <div class="card-ttl" style="margin-bottom:10px">Distribuição do Budget</div>
      <div class="hbl">
        ${data.campaigns.map(c => {
          const pctW = (c.spend / s.spend * 100).toFixed(1);
          const color = c.type === 'PERFORMANCE_MAX' ? 'var(--blu)' : '#EA580C';
          return `<div class="hbr">
            <div class="hbl-l" style="width:160px;font-size:11px">${c.name.replace(/\[SEARCH\]\s*/,'').replace(/\[JN\]\s*/,'')}</div>
            <div class="hbt"><div class="hbf" style="width:${pctW}%;background:${color}"></div></div>
            <div class="hbv">${pctW}%</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-ttl" style="margin-bottom:10px">Grupos de Anúncios</div>
      <div class="tbl-wrap"><div class="tbl-scroll" style="max-height:180px">
        <table>
          <thead><tr><th>Grupo</th><th>Campanha</th><th>Gasto</th><th>Budget %</th><th>Cliques</th><th>CTR</th><th>CPC</th><th>Conv.</th><th>ROAS</th></tr></thead>
          <tbody>${agRows}</tbody>
        </table>
      </div></div>
    </div>
  </div>
</section>

<!-- ═══ KEYWORDS ═══ -->
<section class="sec" id="gads-keywords">
  <div class="sec-ttl">Palavras-chave</div>
  <div class="tbl-card">
    <div class="tbl-head">
      <div class="card-ttl" style="margin-bottom:2px">Performance por Keyword — ${data.period.label}</div>
      <div style="font-size:11px;color:var(--t3)">Keywords com ROAS em vermelho = custo acima da receita gerada · PMax não tem dados de keyword</div>
    </div>
    <div class="tbl-wrap"><div class="tbl-scroll">
      <table>
        <thead><tr><th>#</th><th>Keyword</th><th>Match</th><th>Gasto</th><th>Cliques</th><th>Impr.</th><th>CTR</th><th>CPC</th><th>Conv.</th><th>ROAS</th></tr></thead>
        <tbody>${kwRows}</tbody>
      </table>
    </div></div>
  </div>
</section>

<!-- ═══ INSIGHTS ═══ -->
<section class="sec" id="gads-insights">
  <div class="sec-ttl">Insights & Recomendações</div>
  <div class="ins-grid">
    ${data.insights.map(i => `
    <div class="ins ${i.type}">
      <div class="ins-type">${i.tag}</div>
      <div class="ins-ttl">${i.title}</div>
      <div class="ins-body">${i.body}</div>
    </div>`).join('')}
  </div>
</section>
</div>`;
}

export function initGadsCharts(data) {
  const canvas = document.getElementById('gadsChart');
  if (canvas) drawGadsChart(canvas, data.daily);
}
