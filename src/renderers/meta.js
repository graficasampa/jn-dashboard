import { brl, brl2, pct, num, k, mult } from '../utils/format.js';

const OBJ_LABELS = {
  CONVERSIONS: 'Conversões',
  MESSAGES: 'Mensagens',
  ENGAGEMENT: 'Engajamento',
};

const STATUS_BADGE = {
  ACTIVE: '<span class="badge badge-grn">Ativo</span>',
  PAUSED: '<span class="badge badge-gray">Pausado</span>',
};

function fmtResult(result, type) {
  if (type === 'purchases') return `${num(result)} compras`;
  if (type === 'conversations') return `${num(result)} conversas`;
  if (type === 'engagements') return `${k(result)} interações`;
  return num(result);
}

function creativePrimaryMetric(c) {
  if (c.resultType === 'purchases') {
    const label = 'Compras';
    const val = `<div class="creative-kpi-val" style="color:var(--grn)">${num(c.result)}</div>`;
    return { label, val };
  }
  const label = 'Conversas';
  const val = `<div class="creative-kpi-val" style="color:var(--meta)">${num(c.result)}</div>`;
  return { label, val };
}

function creativeSecondaryMetric(c) {
  if (c.roas) return {
    label: 'ROAS',
    val: `<div class="creative-kpi-val" style="color:var(--grn)">${c.roas.toFixed(1).replace('.', ',')}×</div>`
  };
  return {
    label: 'CPR',
    val: `<div class="creative-kpi-val" style="color:var(--grn)">${brl2(c.cpr)}</div>`
  };
}

export function renderMeta(data) {
  const s = data.summary;

  return `
<div class="platform-panel visible" id="panel-meta">
  <div class="period-tag">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ${data.period.label} · ${data.period.range} · ${data.period.days} dias
  </div>

  <!-- HL Band 5 cols -->
  <div class="hl-band" style="grid-template-columns:repeat(5,1fr)">
    <div class="hl-item">
      <div class="hl-lbl">Investimento</div>
      <div class="hl-val" style="color:var(--meta)">${brl(s.spend)}</div>
      <div class="hl-sub">Período completo</div>
    </div>
    <div class="hl-item">
      <div class="hl-lbl">Receita</div>
      <div class="hl-val" style="color:var(--grn)">${brl(s.revenue)}</div>
      <div class="hl-sub">ROAS total ${data.kpis.roasSales.toFixed(1).replace('.', ',')}× vendas</div>
    </div>
    <div class="hl-item">
      <div class="hl-lbl">Compras</div>
      <div class="hl-val">${num(s.purchases)}</div>
      <div class="hl-sub">CPA ${brl2(data.kpis.cpa)}</div>
    </div>
    <div class="hl-item">
      <div class="hl-lbl">Conversas</div>
      <div class="hl-val">${num(s.conversations)}</div>
      <div class="hl-sub">Custo/msg ${brl2(data.kpis.costPerMessage)}</div>
    </div>
    <div class="hl-item">
      <div class="hl-lbl">Alcance</div>
      <div class="hl-val">${k(s.reach)}</div>
      <div class="hl-sub">Freq. ${s.frequency.toFixed(2).replace('.', ',')}×</div>
    </div>
  </div>

  <!-- KPI cards row 1 -->
  <div class="kpi-row col4" style="margin-bottom:12px">
    <div class="card">
      <div class="card-ttl">CPA (Custo por Compra)</div>
      <div class="card-val" style="color:var(--grn)">${brl2(data.kpis.cpa)}</div>
      <div class="card-sub">${num(s.purchases)} compras no período</div>
    </div>
    <div class="card">
      <div class="card-ttl">Custo por Mensagem</div>
      <div class="card-val" style="color:var(--meta)">${brl2(data.kpis.costPerMessage)}</div>
      <div class="card-sub">${num(s.conversations)} conversas WPP</div>
    </div>
    <div class="card">
      <div class="card-ttl">ROAS Vendas Diretas</div>
      <div class="card-val" style="color:var(--grn)">${data.kpis.roasSales.toFixed(1).replace('.', ',')}×</div>
      <div class="card-sub">Campanhas de conversão</div>
    </div>
    <div class="card">
      <div class="card-ttl">Impressões</div>
      <div class="card-val">${k(s.impressions)}</div>
      <div class="card-sub">CPM ${brl2(data.kpis.cpm)}</div>
    </div>
  </div>

  <!-- KPI cards row 2 -->
  <div class="kpi-row col4" style="margin-bottom:24px">
    <div class="card">
      <div class="card-ttl">Cliques</div>
      <div class="card-val">${k(s.clicks)}</div>
      <div class="card-sub">CPC ${brl2(data.kpis.cpc)}</div>
    </div>
    <div class="card">
      <div class="card-ttl">CTR</div>
      <div class="card-val">${pct(data.kpis.ctr)}</div>
      <div class="card-sub">Taxa de clique média</div>
    </div>
    <div class="card">
      <div class="card-ttl">Frequência</div>
      <div class="card-val">${s.frequency.toFixed(2).replace('.', ',')}</div>
      <div class="card-sub">Exibições por pessoa</div>
    </div>
    <div class="card">
      <div class="card-ttl">Alcance</div>
      <div class="card-val">${k(s.reach)}</div>
      <div class="card-sub">Pessoas únicas</div>
    </div>
  </div>

  <!-- Campaigns table + Budget dist -->
  <div class="g21">
    <div class="tbl-card" style="margin-bottom:0">
      <div class="card">
        <div class="tbl-card-ttl">Campanhas — ${data.period.label}</div>
        <table>
          <thead class="tbl-head">
            <tr>
              <th>Campanha</th>
              <th class="tr">Investido</th>
              <th class="tr">Resultado</th>
              <th class="tr">CPR</th>
              <th class="tr">ROAS</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.campaigns.map(c => `
            <tr>
              <td class="ta" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</td>
              <td class="tr">${brl(c.spend)}</td>
              <td class="tr">${fmtResult(c.result, c.resultType)}</td>
              <td class="tr mono">${brl2(c.cpr)}</td>
              <td class="tr">${c.roas ? `<span style="color:var(--grn);font-weight:700">${c.roas.toFixed(1).replace('.', ',')}×</span>` : '<span class="badge badge-gray">N/A</span>'}</td>
              <td>${STATUS_BADGE[c.status] || ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card" style="align-self:start">
      <div class="card-ttl" style="margin-bottom:14px">Distribuição do Budget</div>
      ${data.campaigns.map(c => {
        const pctVal = (c.spend / s.spend * 100).toFixed(1);
        const color = c.resultType === 'purchases' ? 'var(--grn)' : c.resultType === 'conversations' ? 'var(--meta)' : '#7c3aed';
        return `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:11px;font-weight:600;color:var(--t2)">${c.name.replace(/\[0\d\] /,'')}</span>
            <span style="font-size:11px;font-weight:700;color:var(--t2)">${pctVal}%</span>
          </div>
          <div style="height:5px;background:var(--bdr);border-radius:3px;overflow:hidden">
            <div style="width:${pctVal}%;height:100%;background:${color};border-radius:3px"></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <!-- Top Ads table -->
  <div class="sec-ttl" style="margin-top:8px">Top Anúncios por Gasto — ${data.period.label}</div>
  <div class="tbl-card">
    <div class="card">
      <table>
        <thead class="tbl-head">
          <tr>
            <th>#</th>
            <th>Anúncio</th>
            <th class="tr">Investido</th>
            <th class="tr">Impressões</th>
            <th class="tr">CTR</th>
            <th class="tr">Resultado</th>
            <th class="tr">CPR</th>
            <th class="tr">ROAS</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.topAds.map(a => `
          <tr>
            <td class="trnk">${a.rank}</td>
            <td class="ta">${a.name}</td>
            <td class="tr">${brl(a.spend)}</td>
            <td class="tr">${k(a.impressions)}</td>
            <td class="tr">${pct(a.ctr)}</td>
            <td class="tr">${fmtResult(a.result, a.resultType)}</td>
            <td class="tr mono">${brl2(a.cpr)}</td>
            <td class="tr">${a.roas ? `<span style="color:var(--grn);font-weight:700">${a.roas.toFixed(1).replace('.', ',')}×</span>` : '—'}</td>
            <td>${STATUS_BADGE[a.status] || ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Top Creatives -->
  <div class="sec-ttl">Criativos em Destaque</div>
  <div class="creative-grid">
    ${data.topCreatives.map(c => {
      const primary = creativePrimaryMetric(c);
      const secondary = creativeSecondaryMetric(c);
      return `
      <div class="card" style="padding:10px;min-width:0;overflow:hidden">
        <div class="creative-frame-wrap">
          <div class="creative-frame-inner">
            <iframe src="${c.previewUrl}" width="400" height="625" scrolling="no" allow="autoplay"></iframe>
          </div>
        </div>
        <div class="card-ttl" style="font-size:11px;margin-bottom:8px">${c.name}</div>
        <div class="creative-kpis">
          <div>
            <div class="creative-kpi-lbl">Investido</div>
            <div class="creative-kpi-val" style="color:var(--t1)">${brl(c.spend)}</div>
          </div>
          <div>
            <div class="creative-kpi-lbl">${primary.label}</div>
            ${primary.val}
          </div>
          <div>
            <div class="creative-kpi-lbl">${secondary.label}</div>
            ${secondary.val}
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>

  <!-- Insights -->
  <div class="sec-ttl">Insights & Recomendações</div>
  <div class="insights-grid">
    ${data.insights.map(i => `
    <div class="insight-card ${i.type}">
      <div class="insight-tag">${i.tag}</div>
      <div class="insight-ttl">${i.title}</div>
      <div class="insight-body">${i.body}</div>
    </div>`).join('')}
  </div>
</div>`;
}
