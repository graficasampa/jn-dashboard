const fmt = (v) => Number(v).toLocaleString('pt-BR', {minimumFractionDigits:0,maximumFractionDigits:0});
const brl = (v) => 'R$' + fmt(v);
const brl2 = (v) => 'R$' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2});
const pct = (v, d=1) => Number(v).toFixed(d).replace('.',',') + '%';
const k = (v) => v >= 1000 ? (v/1000).toFixed(1).replace('.',',') + 'K' : fmt(v);

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
    : { lbl: 'CPR', val: `<div style="font-size:11px;font-weight:700;color:var(--grn)">${brl2(c.cpr)}</div>` };
  return { primary, secondary };
}

export function renderMeta(data) {
  const s = data.summary;
  const kpis = data.kpis;

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
      <div><span class="hl-trend hl-up">↑ ROAS ${kpis.roasSales.toFixed(1).replace('.',',')}× vendas</span></div>
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
      <div class="kpi-sub">${fmt(s.purchases)} compras · ticket médio ~R$100</div>
    </div>
    <div class="kpi" style="border-top:3px solid var(--blu)">
      <div class="kpi-lbl">CPA — Custo por Compra</div>
      <div class="kpi-val">${brl2(kpis.cpa)}</div>
      <div class="kpi-sub">≈ 5,3% do ticket médio · excelente</div>
    </div>
    <div class="kpi" style="border-top:3px solid var(--meta)">
      <div class="kpi-lbl">Custo por Mensagem WPP</div>
      <div class="kpi-val">${brl2(kpis.costPerMessage)}</div>
      <div class="kpi-sub">${fmt(s.conversations)} conversas · [03] Mensagens</div>
    </div>
    <div class="kpi gold" style="border-top:3px solid #C9980A">
      <div class="kpi-lbl">ROAS — Campanhas de Venda</div>
      <div class="kpi-val brl">${kpis.roasSales.toFixed(1).replace('.',',')}×</div>
      <div class="kpi-sub">R$1.708 gasto → R$30.085 receita</div>
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
