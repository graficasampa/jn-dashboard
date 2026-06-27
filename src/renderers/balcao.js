const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const fmt = v => num(v) == null ? '—' : num(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const brl = v => num(v) == null ? '—' : 'R$ ' + num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function inputMoneyValue(v) {
  return num(v) ? num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

export function renderBalcao(data) {
  const b = data.balcao || {};
  const ga4 = data.ga4 || {};
  const totalRevenue = (ga4.revenue || 0) + (b.revenue || 0);
  const totalOrders = (ga4.orders || 0) + (b.orders || 0);
  const configured = !!data.apiUrl;

  return `
<div id="panel-balcao" class="platform-panel visible">
<section class="sec" id="balcao-resumo">
  <div class="sec-ttl">Vendas de Balcão — ${data.period.label}</div>

  <div class="hl-band" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
    <div>
      <div class="hl-val hl-grn">${brl(b.revenue || 0)}</div>
      <div class="hl-lbl">Faturamento Balcão</div>
      <div><span class="hl-trend hl-neutral">${b.updatedAt ? `Atualizado ${b.updatedAt}` : 'Sem lançamento'}</span></div>
    </div>
    <div>
      <div class="hl-val hl-dark">${fmt(b.orders || 0)}</div>
      <div class="hl-lbl">Vendas Balcão</div>
      <div><span class="hl-trend hl-neutral">ticket ${brl(b.avgTicket || 0)}</span></div>
    </div>
    <div>
      <div class="hl-val" style="color:var(--blu)">${brl(ga4.revenue || 0)}</div>
      <div class="hl-lbl">Receita GA4</div>
      <div><span class="hl-trend hl-neutral">${fmt(ga4.orders || 0)} pedidos online</span></div>
    </div>
    <div>
      <div class="hl-val" style="color:var(--grn)">${brl(totalRevenue)}</div>
      <div class="hl-lbl">Receita Total do Mês</div>
      <div><span class="hl-trend hl-up">${fmt(totalOrders)} pedidos + vendas</span></div>
    </div>
  </div>

  <div class="g21">
    <div class="card">
      <div class="card-ttl">Entrada Manual da Diretoria</div>
      <div class="card-sub">Use para lançar vendas que não aparecem no GA4, Meta ou Google Ads.</div>

      ${configured ? `
      <form id="balcaoForm" class="balcao-form">
        <input type="hidden" name="month" value="${data.period.month}">
        <input type="hidden" name="token" value="${data.token || ''}">
        <label>
          <span>Quantidade de vendas</span>
          <input name="orders" inputmode="numeric" autocomplete="off" placeholder="0" value="${b.orders || ''}">
        </label>
        <label>
          <span>Faturamento do mês</span>
          <input name="revenue" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${inputMoneyValue(b.revenue)}">
        </label>
        <div class="balcao-actions">
          <button type="submit" class="btn-save-balcao">Salvar no Google Sheets</button>
          <span id="balcaoStatus" class="balcao-status"></span>
        </div>
      </form>` : `
      <div class="balcao-empty">
        <div class="balcao-empty-title">Endpoint do Apps Script ainda não configurado</div>
        <div>Depois de publicar o Apps Script como Web App, configure <code>VITE_BALCAO_API_URL</code> no Vercel com a URL gerada.</div>
      </div>`}
    </div>

    <div class="card">
      <div class="card-ttl">Como isso entra no painel</div>
      <div class="ins-body">
        O valor de balcão soma na receita total do mês e ajuda a medir vendas influenciadas por WhatsApp, atendimento e campanhas que não fecham pelo e-commerce.
      </div>
      <div class="balcao-summary">
        <div><span>Receita GA4</span><b>${brl(ga4.revenue || 0)}</b></div>
        <div><span>Receita Balcão</span><b>${brl(b.revenue || 0)}</b></div>
        <div><span>Total combinado</span><b>${brl(totalRevenue)}</b></div>
      </div>
    </div>
  </div>
</section>
</div>`;
}

function parseMoney(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const normalized = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatMoneyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const n = Number(digits);
  return Number.isFinite(n)
    ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
}

function submitFormToIframe(apiUrl, payload) {
  return new Promise(resolve => {
    const iframeName = `balcao_submit_${Date.now()}`;
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = apiUrl;
    form.target = iframeName;
    form.style.display = 'none';

    Object.entries(payload).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value == null ? '' : String(value);
      form.appendChild(input);
    });

    iframe.addEventListener('load', () => {
      setTimeout(() => {
        form.remove();
        iframe.remove();
        resolve();
      }, 150);
    }, { once: true });

    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
  });
}

export function initBalcao(data) {
  const form = document.getElementById('balcaoForm');
  if (!form || !data.apiUrl) return;
  const revenueInput = form.elements.revenue;
  const ordersInput = form.elements.orders;
  const submitButton = form.querySelector('button[type="submit"]');

  revenueInput?.addEventListener('input', () => {
    revenueInput.value = formatMoneyInput(revenueInput.value);
  });

  ordersInput?.addEventListener('input', () => {
    ordersInput.value = String(ordersInput.value || '').replace(/\D/g, '');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const status = document.getElementById('balcaoStatus');
    const fd = new FormData(form);
    const payload = {
      action: 'save',
      month: fd.get('month'),
      token: fd.get('token'),
      orders: Math.max(0, Math.round(Number(String(fd.get('orders') || '').replace(/\D/g, '')) || 0)),
      revenue: parseMoney(fd.get('revenue')),
      notes: '',
      updatedBy: '',
    };

    status.textContent = 'Salvando...';
    status.className = 'balcao-status';
    if (submitButton) submitButton.disabled = true;
    try {
      await submitFormToIframe(data.apiUrl, payload);
      status.textContent = 'Salvo no Google Sheets. Atualizando painel...';
      status.className = 'balcao-status ok';
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      status.textContent = `Erro ao salvar: ${err.message}`;
      status.className = 'balcao-status err';
      if (submitButton) submitButton.disabled = false;
    }
  });
}
