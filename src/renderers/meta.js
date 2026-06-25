const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const fmt = (v) => num(v) == null ? '—' : num(v).toLocaleString('pt-BR', {minimumFractionDigits:0,maximumFractionDigits:0});
const brl = (v) => num(v) == null ? '—' : 'R$' + fmt(v);
const brl2 = (v) => num(v) == null ? '—' : 'R$' + num(v).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2});
const pct = (v, d=1) => num(v) == null ? '—' : num(v).toFixed(d).replace('.',',') + '%';
const k = (v) => num(v) == null ? '—' : num(v) >= 1000 ? (num(v)/1000).toFixed(1).replace('.',',') + 'K' : fmt(v);
const monthShort = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

const STATUS_BADGE = {
  ACTIVE: '<span class="badge bg">Ativo</span>',
  PAUSED: '<span class="badge ba">Pausado</span>',
};

function fmtResult(result, type) {
  if (type === 'purchases') return `${fmt(result)} compras`;
  if (type === 'conversations') return `${fmt(result)} conversas WPP`;
  if (type === 'engagements') return `${k(result)} engajamentos`;
  return fmt(result);
}

function creativeMetrics(c) {
  const primary = c.resultType === 'purchases'
    ? { lbl: 'Compras', val: `<div style="font-size:11px;font-weight:700;color:var(--grn)">${fmt(c.result)}</div>` }
    : { lbl: 'Conversas', val: `<div style="font-size:11px;font-weight:700;color:var(--meta)">${fmt(c.result)}</div>` };
  const secondary = c.roas
    ? { lbl: 'ROAS', val: `<div style="font-size:11px;font-weight:700;color:var(--grn)">${c.roas.toFixed(1).replace('.',',')}×</div>` }
    : c.cpr != null
      ? { lbl: 'CPR', val: `<div style="font-size:11px;font-weight:700;color:var(--grn)">${brl2(c.cpr)}</div>` }
      : { lbl: 'CTR', val: `<div style="font-size:11px;font-weight:700;color:var(--meta)">${pct(c.ctr)}</div>` };
  return { primary, secondary };
}

function conversationChartHtml(data) {
  const daily = Array.isArray(data.dailyConversations) ? data.dailyConversations : [];
  const totalDaily = daily.reduce((sum, d) => sum + (num(d.conversations) || 0), 0);
  const avg = daily.length ? totalDaily / daily.length : null;
  const peak = daily.reduce((best, d) => (d.conversations || 0) > (best?.conversations || 0) ? d : best, null);

  return `
  <div class="card" id="meta-conversas" style="margin-bottom:24px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
      <div>
        <div class="card-ttl">Conversas Iniciadas por Dia</div>
        <div class="card-sub" style="margin-bottom:0">Barras roxas = conversas iniciadas no WhatsApp via campanhas Meta</div>
      </div>
      ${daily.length ? `
      <div style="display:grid;grid-template-columns:repeat(3,auto);gap:14px;text-align:right;font-size:11px;color:var(--t2)">
        <div><b style="color:var(--t1);font-size:13px">${fmt(totalDaily)}</b><br>Total</div>
        <div><b style="color:var(--t1);font-size:13px">${avg == null ? '—' : avg.toFixed(1).replace('.', ',')}</b><br>Média/dia</div>
        <div><b style="color:#9C27B0;font-size:13px">${peak ? fmt(peak.conversations) : '—'}</b><br>Pico</div>
      </div>` : ''}
    </div>
    ${daily.length ? `
      <canvas id="metaConvChart" style="width:100%;display:block"></canvas>
    ` : `
      <div style="border:1px dashed var(--bdr);border-radius:8px;padding:22px;text-align:center;background:var(--sur2);color:var(--t2)">
        <div style="font-size:13px;font-weight:800;color:var(--t1);margin-bottom:5px">Série diária ainda não disponível neste snapshot</div>
        <div style="font-size:12px;line-height:1.5">Atualizei o sync da Meta para salvar <code>dailyConversations</code>. No próximo fetch automático, este espaço vira o gráfico diário.</div>
      </div>
    `}
  </div>`;
}

export function renderMeta(data) {
  const s = data.summary;
  const kpis = data.kpis;
  const salesSpend = kpis.salesSpend ?? data.campaigns
    .filter(c => c.resultType === 'purchases')
    .reduce((sum, c) => sum + (c.spend || 0), 0);
  const salesRevenue = kpis.salesRevenue ?? data.campaigns
    .filter(c => c.resultType === 'purchases')
    .reduce((sum, c) => sum + (c.revenue || 0), 0);
  const roasSales = kpis.roasSales ?? (salesSpend > 0 ? salesRevenue / salesSpend : null);
  const roasTotal = s.roas ?? kpis.revenuePerSpend ?? (s.spend > 0 ? s.revenue / s.spend : null);
  const avgTicket = s.purchases > 0 ? s.revenue / s.purchases : null;
  const cpaPctTicket = avgTicket ? (kpis.cpa / avgTicket) * 100 : null;

  return `
<div id="panel-meta" class="platform-panel visible">
<section class="sec" id="meta-ads">
  <div class="sec-ttl">Meta Ads — JN Impressão · ${data.period.label} (${data.period.range})</div>

  <!-- HL Band 5 colunas -->
  <div class="hl-band" style="margin-bottom:24px;grid-template-columns:repeat(5,1fr)">
    <div>
      <div class="hl-val" style="color:var(--meta)">${brl(s.spend)}</div>
      <div class="hl-lbl">Investimento Total</div>
      <div><span class="hl-trend hl-neutral">${data.period.days} dias · ${data.campaigns.length} campanhas</span></div>
    </div>
    <div>
      <div class="hl-val" style="color:var(--grn)">${brl(s.revenue)}</div>
      <div class="hl-lbl">Receita Atribuída (Meta)</div>
      <div><span class="hl-trend hl-up">↑ ROAS total ${roasTotal ? roasTotal.toFixed(1).replace('.',',') : '—'}×</span></div>
    </div>
    <div>
      <div class="hl-val hl-grn">${fmt(s.purchases)}</div>
      <div class="hl-lbl">Compras via Site</div>
      <div><span class="hl-trend hl-up">↑ CPA ${brl2(kpis.cpa)}/compra</span></div>
    </div>
    <div>
      <div class="hl-val hl-blu">${fmt(s.conversations)}</div>
      <div class="hl-lbl">Conversas no WhatsApp</div>
      <div><span class="hl-trend hl-up">↑ ${brl2(kpis.costPerMessage)}/mensagem</span></div>
    </div>
    <div>
      <div class="hl-val hl-dark">${fmt(s.reach)}</div>
      <div class="hl-lbl">Alcance (pessoas únicas)</div>
      <div><span class="hl-trend hl-neutral">freq. média ${s.frequency.toFixed(2).replace('.',',')}×</span></div>
    </div>
  </div>

  <!-- KPI Row 1 -->
  <div class="g4" style="margin-bottom:12px">
    <div class="kpi" style="border-top:3px solid var(--grn)">
      <div class="kpi-lbl">Receita Atribuída (Meta Pixel)</div>
      <div class="kpi-val" style="color:var(--grn)">${brl(s.revenue)}</div>
      <div class="kpi-sub">${fmt(s.purchases)} compras${avgTicket ? ` · ticket médio ${brl2(avgTicket)}` : ''}</div>
    </div>
    <div class="kpi" style="border-top:3px solid var(--blu)">
      <div class="kpi-lbl">CPA — Custo por Compra</div>
      <div class="kpi-val">${brl2(kpis.cpa)}</div>
      <div class="kpi-sub">${cpaPctTicket ? `≈ ${pct(cpaPctTicket)} do ticket médio` : 'Custo médio por compra rastreada'}</div>
    </div>
    <div class="kpi" style="border-top:3px solid var(--meta)">
      <div class="kpi-lbl">Custo por Mensagem WPP</div>
      <div class="kpi-val">${brl2(kpis.costPerMessage)}</div>
      <div class="kpi-sub">${fmt(s.conversations)} conversas · [03] Mensagens</div>
    </div>
    <div class="kpi gold" style="border-top:3px solid #C9980A">
      <div class="kpi-lbl">ROAS — Campanhas de Venda</div>
      <div class="kpi-val brl">${roasSales ? roasSales.toFixed(1).replace('.',',') : '—'}×</div>
      <div class="kpi-sub">${brl(salesSpend)} gasto → ${brl(salesRevenue)} receita</div>
    </div>
  </div>

  <!-- KPI Row 2 -->
  <div class="g4" style="margin-bottom:24px">
    <div class="kpi">
      <div class="kpi-lbl">Impressões Totais</div>
      <div class="kpi-val">${fmt(s.impressions)}</div>
      <div class="kpi-sub">todas as campanhas</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">CPM Médio</div>
      <div class="kpi-val">${brl2(kpis.cpm)}</div>
      <div class="kpi-sub">custo por mil impressões</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">CPC Médio</div>
      <div class="kpi-val">${brl2(kpis.cpc)}</div>
      <div class="kpi-sub">${fmt(s.clicks)} cliques totais · CTR ${pct(kpis.ctr)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">Frequência</div>
      <div class="kpi-val">${s.frequency.toFixed(2).replace('.',',')}×</div>
      <div class="kpi-sub">anúncio visto 2× por pessoa em média</div>
    </div>
  </div>

  ${conversationChartHtml(data)}

  <!-- Campanhas + Budget -->
  <div class="g21" style="margin-bottom:24px">
    <div class="tbl-card">
      <div class="tbl-head"><div class="card-ttl" style="margin-bottom:0">Campanhas — ${data.period.label}</div></div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Campanha</th><th>Status</th><th>Gasto</th><th>Receita</th><th>ROAS</th><th>CTR</th><th>CPR</th><th>Resultado</th></tr></thead>
          <tbody>
            ${data.campaigns.map(c => `
            <tr>
              <td class="ta">${c.name}</td>
              <td>${STATUS_BADGE[c.status] || ''}</td>
              <td class="tbrl">${brl2(c.spend)}</td>
              <td>${c.revenue ? `<span class="tok">${brl(c.revenue)}</span>` : '<span style="color:var(--t3)">—</span>'}</td>
              <td>${c.roas ? `<span class="tok">${c.roas.toFixed(1).replace('.',',')}×</span>` : '<span style="color:var(--t3)">n/a</span>'}</td>
              <td>${pct(c.ctr)}</td>
              <td>${c.resultType === 'engagements' ? `<span class="tok">${brl2(c.cpr)}</span>` : brl2(c.cpr)}</td>
              <td class="tok">${fmtResult(c.result, c.resultType)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-ttl" style="margin-bottom:12px">Distribuição do Budget</div>
      <div class="hbl">
        ${data.campaigns.map(c => {
          const pctVal = (c.spend / s.spend * 100).toFixed(1);
          const color = c.resultType === 'purchases' ? 'var(--grn)' : c.resultType === 'conversations' ? 'var(--meta)' : 'var(--t3)';
          const shortName = c.name.replace(/\[\d+\] /,'').substring(0, 22);
          return `
          <div class="hbr">
            <div class="hbl-l" style="width:145px;font-size:11px">${shortName}</div>
            <div class="hbt"><div class="hbf" style="width:${pctVal}%;background:${color}"></div></div>
            <div class="hbv">${pctVal}%</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>

  <!-- Top Anúncios -->
  <div class="tbl-card" style="margin-bottom:24px">
    <div class="tbl-head"><div class="card-ttl" style="margin-bottom:0">Top Anúncios por Gasto — ${data.period.label}</div></div>
    <div class="tbl-wrap"><div class="tbl-scroll">
      <table>
        <thead><tr><th>#</th><th>Anúncio</th><th>Status</th><th>Gasto</th><th>ROAS</th><th>Impr.</th><th>CTR</th><th>CPR</th><th>Resultado</th></tr></thead>
        <tbody>
          ${data.topAds.map(a => `
          <tr>
            <td class="trnk">${a.rank}</td>
            <td class="ta">${a.name}</td>
            <td>${STATUS_BADGE[a.status] || ''}</td>
            <td class="tbrl">${brl2(a.spend)}</td>
            <td>${a.roas ? `<span class="tok">${a.roas.toFixed(1).replace('.',',')}×</span>` : '<span style="color:var(--t3)">n/a</span>'}</td>
            <td>${fmt(a.impressions)}</td>
            <td>${pct(a.ctr)}</td>
            <td>${brl2(a.cpr)}</td>
            <td>${fmtResult(a.result, a.resultType)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div></div>
  </div>

  <!-- Criativos em Destaque -->
  <div class="sec-ttl" style="margin-top:4px">Criativos em Destaque — Top ${data.topCreatives.length} Anúncios</div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:24px">
    ${data.topCreatives.map(c => {
      const m = creativeMetrics(c);
      return `
      <div class="card" style="padding:10px;min-width:0;overflow:hidden">
        <div style="position:relative;border-radius:6px;overflow:hidden;border:1px solid var(--bdr);background:var(--sur2);margin-bottom:10px;height:420px">
          <div style="position:absolute;top:0;left:0;width:400px;height:625px;transform:scale(0.67);transform-origin:top left;pointer-events:none">
            <iframe src="${c.previewUrl}" width="400" height="625" scrolling="no" style="border:none;display:block" allow="autoplay"></iframe>
          </div>
        </div>
        <div class="card-ttl" style="font-size:11px;margin-bottom:8px">${c.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;text-align:center">
          <div>
            <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px">Investido</div>
            <div style="font-size:11px;font-weight:700;color:var(--t1)">${brl2(c.spend)}</div>
          </div>
          <div>
            <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px">${m.primary.lbl}</div>
            ${m.primary.val}
          </div>
          <div>
            <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px">${m.secondary.lbl}</div>
            ${m.secondary.val}
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>

  <!-- Insights -->
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

function drawMetaConversationsChart(canvas, daily) {
  if (!canvas || !daily?.length) return;
  const DPR = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 900;
  const H = 260;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  const values = daily.map(d => num(d.conversations) || 0);
  const max = Math.max(...values, 1);
  const yMax = Math.max(3, Math.ceil(max * 1.15));
  const PAD = { t: 22, r: 24, b: 42, l: 34 };
  const CW = W - PAD.l - PAD.r;
  const CH = H - PAD.t - PAD.b;
  const slot = CW / values.length;
  const bW = Math.max(5, Math.min(slot * 0.55, 24));

  ctx.clearRect(0, 0, W, H);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#D9DCE3';
  ctx.fillStyle = '#A2A8B5';
  ctx.font = '10px system-ui,sans-serif';
  ctx.textAlign = 'right';

  const steps = Math.min(6, yMax);
  for (let i = 0; i <= steps; i++) {
    const v = Math.round((yMax / steps) * i);
    const y = PAD.t + CH * (1 - v / yMax);
    ctx.beginPath();
    ctx.moveTo(PAD.l, y);
    ctx.lineTo(W - PAD.r, y);
    ctx.stroke();
    ctx.fillText(String(v), PAD.l - 7, y + 3);
  }

  values.forEach((v, i) => {
    const x = PAD.l + slot * i + (slot - bW) / 2;
    const h = CH * (v / yMax);
    const y = PAD.t + CH - h;
    const grad = ctx.createLinearGradient(x, y, x + bW, y);
    grad.addColorStop(0, '#A21CAF');
    grad.addColorStop(1, '#8B1BB1');
    ctx.fillStyle = grad;
    ctx.globalAlpha = v > 0 ? 0.94 : 0.22;
    if (v > 0) {
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(x, y, bW, h, [4, 4, 0, 0]); ctx.fill();
      } else {
        ctx.fillRect(x, y, bW, h);
      }
    }

    if (v > 0) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#9C27B0';
      ctx.font = 'bold 10px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(v), x + bW / 2, y - 7);
    }

    const day = daily[i].day || Number((daily[i].date || '').slice(-2)) || i + 1;
    const month = daily[i].date ? monthShort[Number(daily[i].date.slice(5, 7)) - 1] : '';
    const showEvery = values.length > 24 ? 2 : 1;
    if (i % showEvery === 0 || i === values.length - 1) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#9AA3B2';
      ctx.font = '9px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(month ? `${day} ${month}` : String(day), x + bW / 2, H - 14);
    }
  });

  ctx.globalAlpha = 1;
}

export function initMetaCharts(data) {
  const daily = Array.isArray(data?.dailyConversations) ? data.dailyConversations : [];
  drawMetaConversationsChart(document.getElementById('metaConvChart'), daily);
}
