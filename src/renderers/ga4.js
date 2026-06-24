import { brl, brl2, pct, num, k, mult } from '../utils/format.js';
import { renderLineChart, renderDonutChart } from '../components/charts.js';

const CHANNEL_COLORS = {
  'Organic Search': '#16a34a',
  'Direct': '#2563eb',
  'Referral': '#7c3aed',
  'Organic Social': '#db2777',
  'Email': '#d97706',
  'Paid Social': '#1877f2',
};

export function renderGA4(data) {
  const s = data.summary;
  const k2 = data.kpis;

  return `
<div class="platform-panel visible" id="panel-ga4">
  <div class="period-tag">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ${data.period.label} · ${data.period.range} · ${data.period.days} dias
  </div>

  <!-- HL Band -->
  <div class="hl-band" style="grid-template-columns:repeat(4,1fr)">
    <div class="hl-item">
      <div class="hl-lbl">Receita Total</div>
      <div class="hl-val" style="color:var(--ga4)">${brl(s.revenue)}</div>
      <div class="hl-sub">${brl(k2.revenuePerDay)}/dia médio</div>
    </div>
    <div class="hl-item">
      <div class="hl-lbl">Pedidos</div>
      <div class="hl-val">${num(s.orders)}</div>
      <div class="hl-sub">Concluídos no período</div>
    </div>
    <div class="hl-item">
      <div class="hl-lbl">Ticket Médio</div>
      <div class="hl-val">${brl2(s.avgTicket)}</div>
      <div class="hl-sub">${k2.itemsPerOrder.toFixed(2)} itens/pedido</div>
    </div>
    <div class="hl-item">
      <div class="hl-lbl">Taxa Conversão</div>
      <div class="hl-val">${pct(s.conversionRate)}</div>
      <div class="hl-sub">${num(k2.sessions)} sessões totais</div>
    </div>
  </div>

  <!-- KPI Row 1 -->
  <div class="kpi-row col4" style="margin-bottom:24px">
    <div class="card">
      <div class="card-ttl">Receita/Sessão</div>
      <div class="card-val">${brl2(k2.revenuePerSession)}</div>
      <div class="card-sub">${num(k2.sessions)} sessões no período</div>
    </div>
    <div class="card">
      <div class="card-ttl">Itens Vendidos</div>
      <div class="card-val">${num(k2.itemsSold)}</div>
      <div class="card-sub">${k2.itemsPerOrder.toFixed(2)} itens por pedido</div>
    </div>
    <div class="card">
      <div class="card-ttl">Engajamento</div>
      <div class="card-val">${pct(k2.engagementRate)}</div>
      <div class="card-sub">${k2.avgSessionDuration} duração média</div>
    </div>
    <div class="card">
      <div class="card-ttl">Clientes Recorrentes</div>
      <div class="card-val" style="color:var(--grn)">${pct(k2.returningCustomerRate)}</div>
      <div class="card-sub">${brl(k2.returningRevenue)} de receita</div>
    </div>
  </div>

  <!-- Chart + Devices -->
  <div class="g21">
    <div class="card">
      <div class="card-ttl" style="margin-bottom:12px">Receita Diária (${data.period.label})</div>
      <div class="chart-wrap" style="height:220px">
        <canvas id="ga4-revenue-chart"></canvas>
      </div>
    </div>
    <div class="card">
      <div class="card-ttl" style="margin-bottom:12px">Dispositivos</div>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="chart-wrap" style="height:140px;width:140px;flex-shrink:0">
          <canvas id="ga4-device-chart"></canvas>
        </div>
        <div style="flex:1">
          ${data.devices.map(d => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--bdr)">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">${d.name}</span>
            <span style="font-size:13px;font-weight:700;color:var(--t2)">${pct(d.pct)}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>

  <!-- Channels -->
  <div class="g11">
    <div class="card">
      <div class="card-ttl" style="margin-bottom:14px">Canais de Aquisição — Receita</div>
      ${data.channels.map(c => `
      <div class="channel-row">
        <div class="channel-name">${c.name}</div>
        <div class="channel-bar-outer">
          <div class="channel-bar-inner" style="width:${c.pct}%;background:${CHANNEL_COLORS[c.name] || '#6b7280'}"></div>
        </div>
        <div class="channel-val">${c.revenue ? brl(c.revenue) : 'R$0'}</div>
        <div class="channel-pct">${pct(c.pct)}</div>
      </div>`).join('')}
    </div>
    <div class="card">
      <div class="card-ttl" style="margin-bottom:14px">Canais de Aquisição — Sessões</div>
      ${data.channels.map(c => `
      <div class="channel-row">
        <div class="channel-name">${c.name}</div>
        <div class="channel-bar-outer">
          <div class="channel-bar-inner" style="width:${(c.sessions/data.kpis.sessions*100).toFixed(1)}%;background:${CHANNEL_COLORS[c.name] || '#6b7280'}"></div>
        </div>
        <div class="channel-val">${num(c.sessions)}</div>
        <div class="channel-pct">${pct(c.sessions/data.kpis.sessions*100)}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- Top Products -->
  <div class="tbl-card">
    <div class="card">
      <div class="tbl-card-ttl">Top Produtos por Receita — ${data.period.label}</div>
      <table>
        <thead class="tbl-head">
          <tr>
            <th>#</th>
            <th>Produto</th>
            <th class="tr">Receita</th>
            <th class="tr">Pedidos</th>
            <th class="tr">% Total</th>
            <th>Participação</th>
          </tr>
        </thead>
        <tbody>
          ${data.topProducts.map(p => `
          <tr>
            <td class="trnk">${p.rank}</td>
            <td class="ta">${p.name}</td>
            <td class="tr" style="font-weight:700;color:var(--grn)">${brl(p.revenue)}</td>
            <td class="tr">${num(p.orders)}</td>
            <td class="tr">${pct(p.pct)}</td>
            <td>
              <div class="bar-wrap" style="width:100px">
                <div class="bar-fill" style="width:${p.pct*10}%;background:var(--ga4)"></div>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
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

export function initGA4Charts(data) {
  const labels = data.dailyRevenue.map(d => d.day + '/Jun');
  const values = data.dailyRevenue.map(d => d.revenue);
  const revenueCanvas = document.getElementById('ga4-revenue-chart');
  if (revenueCanvas) renderLineChart(revenueCanvas, labels, values, '#e37400');

  const deviceCanvas = document.getElementById('ga4-device-chart');
  if (deviceCanvas) {
    renderDonutChart(
      deviceCanvas,
      data.devices.map(d => d.name),
      data.devices.map(d => d.pct),
      ['#e37400', '#2563eb', '#7c3aed']
    );
  }
}
