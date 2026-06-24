const fmt2 = (v) => Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2});
const fmt0 = (v) => Number(v).toLocaleString('pt-BR', {minimumFractionDigits:0,maximumFractionDigits:0});
const brl = (v) => 'R$ ' + fmt2(v);
const brl0 = (v) => 'R$ ' + fmt0(v);
const pct = (v, d=1) => Number(v).toFixed(d).replace('.',',') + '%';
const total = 167313.37;

// ── Revenue + Orders chart (replicates original canvas) ──────────────────
function drawRevChart(canvas, dailyRevenue) {
  const rev = dailyRevenue.map(d => d.revenue);
  const tr  = dailyRevenue.map(d => d.orders);
  const wk  = [3,5,6,12,13,19,20]; // weekend indices
  const dpr = window.devicePixelRatio || 1;
  const W   = (canvas.parentElement.clientWidth || 900) - 36;
  const H   = 278;
  canvas.width  = W * dpr; canvas.height = H * dpr;
  canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const n = rev.length;
  const PL=52,PR=42,PT=18,PB=68,CW=W-PL-PR,CH=H-PT-PB;
  const maxR=18500,maxT=160,sw=CW/n;
  const xm = i => PL+(i+.5)*sw;
  const yr = v => PT+CH-(v/maxR)*CH;
  const yt = v => PT+CH-(v/maxT)*CH;
  // weekend shading
  ctx.fillStyle='rgba(0,0,0,.04)';
  wk.forEach(i => ctx.fillRect(PL+i*sw,PT,sw,CH));
  // grid lines
  [0,.25,.5,.75,1].forEach(t => {
    ctx.strokeStyle='#DDE4EE'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PL,PT+CH*(1-t)); ctx.lineTo(PL+CW,PT+CH*(1-t)); ctx.stroke();
    if(t>0){ ctx.fillStyle='#7A8FA3'; ctx.font='10px system-ui,sans-serif'; ctx.textAlign='right';
      ctx.fillText('R$'+(maxR*t/1000).toFixed(0)+'k',PL-4,PT+CH*(1-t)+3); }
  });
  // bars
  const bw2=sw*.72, gap2=sw*.14;
  rev.forEach((v,i) => {
    const bh=(v/maxR)*CH, bx=PL+i*sw+gap2, by=PT+CH-bh;
    ctx.fillStyle = wk.includes(i) ? 'rgba(201,152,10,.28)' : 'rgba(201,152,10,.82)';
    ctx.fillRect(bx,by,bw2,bh);
  });
  // order line
  ctx.beginPath(); ctx.strokeStyle='#1449C8'; ctx.lineWidth=2; ctx.lineJoin='round';
  tr.forEach((v,i) => i===0 ? ctx.moveTo(xm(i),yt(v)) : ctx.lineTo(xm(i),yt(v)));
  ctx.stroke();
  // order dots
  tr.forEach((v,i) => { ctx.beginPath(); ctx.arc(xm(i),yt(v),2.5,0,Math.PI*2); ctx.fillStyle='#1449C8'; ctx.fill(); });
  // right axis labels (pedidos)
  ctx.fillStyle='#1449C8'; ctx.font='9px system-ui,sans-serif'; ctx.textAlign='left';
  [0,40,80,120,160].forEach(v => ctx.fillText(v+'p',PL+CW+4,yt(v)+3));
  // revenue values below baseline (row 1)
  ctx.font='bold 8.5px system-ui,sans-serif'; ctx.textAlign='center';
  rev.forEach((v,i) => {
    ctx.fillStyle = wk.includes(i) ? 'rgba(160,114,0,.4)' : '#8B5E00';
    const txt = v>=1000 ? 'R$'+(v/1000).toFixed(v>=10000?0:1)+'k' : 'R$'+v;
    ctx.fillText(txt, xm(i), PT+CH+14);
  });
  // order counts (row 2)
  ctx.font='bold 8.5px system-ui,sans-serif'; ctx.textAlign='center';
  tr.forEach((v,i) => {
    ctx.fillStyle = wk.includes(i) ? '#B0C4D8' : '#1449C8';
    ctx.fillText(v+'p', xm(i), PT+CH+27);
  });
  // date labels (row 3)
  ctx.fillStyle='#7A8FA3'; ctx.font='9px system-ui,sans-serif'; ctx.textAlign='center';
  rev.forEach((_,i) => ctx.fillText((i+1)+'.06', xm(i), PT+CH+54));
}

// ── Sessions chart (area + line) ─────────────────────────────────────────
function drawSessChart(canvas, sessions, orders) {
  const s = sessions, cv = orders;
  const wk = [3,5,6,12,13,19,20];
  const dpr = window.devicePixelRatio || 1;
  const W = (canvas.parentElement.clientWidth || 900) - 36;
  const H = 170;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const n=s.length, PL=44,PR=12,PT=14,PB=28,CW=W-PL-PR,CH=H-PT-PB;
  const maxS=800,maxC=160,step=CW/(n-1);
  const xp = i => PL+i*step;
  const ys = v => PT+CH-(v/maxS)*CH;
  const yc = v => PT+CH-(v/maxC)*CH;
  ctx.fillStyle='rgba(0,0,0,.04)';
  wk.forEach(i => ctx.fillRect(xp(i)-step*.5,PT,step,CH));
  [0,.25,.5,.75,1].forEach(t => {
    ctx.strokeStyle='#DDE4EE'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PL,PT+CH*(1-t)); ctx.lineTo(PL+CW,PT+CH*(1-t)); ctx.stroke();
    if(t>0){ ctx.fillStyle='#7A8FA3'; ctx.font='10px system-ui,sans-serif'; ctx.textAlign='right';
      ctx.fillText(Math.round(maxS*t),PL-4,PT+CH*(1-t)+3); }
  });
  // area fill
  ctx.beginPath(); ctx.moveTo(xp(0),ys(s[0]));
  for(let i=1;i<n;i++) ctx.lineTo(xp(i),ys(s[i]));
  ctx.lineTo(xp(n-1),PT+CH); ctx.lineTo(xp(0),PT+CH); ctx.closePath();
  const g=ctx.createLinearGradient(0,PT,0,PT+CH);
  g.addColorStop(0,'rgba(20,73,200,.16)'); g.addColorStop(1,'rgba(20,73,200,.01)');
  ctx.fillStyle=g; ctx.fill();
  // sessions line
  ctx.beginPath(); ctx.strokeStyle='#1449C8'; ctx.lineWidth=2; ctx.lineJoin='round';
  s.forEach((v,i) => i===0 ? ctx.moveTo(xp(i),ys(v)) : ctx.lineTo(xp(i),ys(v))); ctx.stroke();
  // conversions dashed
  ctx.beginPath(); ctx.strokeStyle='#0A8A58'; ctx.lineWidth=1.5; ctx.setLineDash([4,3]); ctx.lineJoin='round';
  cv.forEach((v,i) => i===0 ? ctx.moveTo(xp(i),yc(v)) : ctx.lineTo(xp(i),yc(v))); ctx.stroke(); ctx.setLineDash([]);
  // peak dot
  const peakIdx=9;
  ctx.beginPath(); ctx.arc(xp(peakIdx),ys(s[peakIdx]),4,0,Math.PI*2); ctx.fillStyle='#1449C8'; ctx.fill();
  ctx.fillStyle='#1449C8'; ctx.font='bold 10px system-ui,sans-serif'; ctx.textAlign='center';
  ctx.fillText(s[peakIdx],xp(peakIdx),ys(s[peakIdx])-8);
  // x labels
  ctx.fillStyle='#7A8FA3'; ctx.font='10px system-ui,sans-serif'; ctx.textAlign='center';
  [0,3,6,9,12,15,18,21,22].forEach(i => ctx.fillText('Jun '+(i+1),xp(i),PT+CH+16));
}

// ── Day of week chart ────────────────────────────────────────────────────
function drawDowChart(canvas, vals) {
  const dpr=window.devicePixelRatio||1;
  const W=canvas.parentElement.clientWidth||320, H=130;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const lbls=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const wkd=[0,6], max=Math.max(...vals);
  const PL=6,PR=6,PT=8,PB=20,CW=W-PL-PR,CH=H-PT-PB,n=7;
  const sw=CW/n,bw=sw*.70,gap=sw*.15;
  vals.forEach((v,i) => {
    const bh=(v/max)*CH,bx=PL+i*sw+gap,by=PT+CH-bh;
    const isW=wkd.includes(i);
    ctx.fillStyle=isW?'#DDE4EE':'#1449C8';
    ctx.fillRect(bx,by,bw,bh);
    if(v>5000&&!isW){ ctx.fillStyle='#fff'; ctx.font='bold 9px system-ui,sans-serif'; ctx.textAlign='center';
      ctx.fillText('R$'+(v/1000).toFixed(0)+'k',bx+bw/2,by+11); }
    ctx.fillStyle=isW?'#A0B0C0':'#3D5166';
    ctx.font=(isW?'':'bold ')+'10px system-ui,sans-serif'; ctx.textAlign='center';
    ctx.fillText(lbls[i],bx+bw/2,PT+CH+13);
  });
}

// ── Main render ──────────────────────────────────────────────────────────
export function renderGA4(data) {
  const s  = data.summary;
  const k  = data.kpis;
  const maxChSess = Math.max(...data.channelSessions.map(c=>c.sessions));
  const maxDevSess = Math.max(...data.devices.map(d=>d.sessions));
  const maxCitySess = data.topCitiesSessions[0].sessions;
  const maxEvt = data.events[0].count;

  const prodRows = data.top50Products.map(([name,rev,qty],i) => {
    const avg=rev/qty, p=((rev/total)*100).toFixed(1), bw=Math.round((rev/data.top50Products[0][1])*100);
    return `<tr>
      <td class="trnk">${i+1}</td>
      <td class="ta">${name}</td>
      <td class="tbrl">R$ ${fmt2(rev)}</td>
      <td>${qty}</td>
      <td>R$ ${fmt2(avg)}</td>
      <td>${p}%</td>
      <td><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end"><div style="width:64px;height:4px;background:var(--bdr);border-radius:2px;overflow:hidden;flex-shrink:0"><div style="width:${bw}%;height:100%;border-radius:2px;background:#C9980A"></div></div></div></td>
    </tr>`;
  }).join('');

  return `
<div id="panel-ga4" class="platform-panel visible">

<!-- ═══ RESUMO ═══ -->
<section class="sec" id="resumo">
  <div class="sec-ttl">Resumo Executivo — ${data.period.label}</div>
  <div class="hl-band">
    <div><div class="hl-val hl-grn">${brl0(s.revenue)}</div><div class="hl-lbl">Receita Total no Mês</div><div><span class="hl-trend hl-neutral">— mês base</span></div></div>
    <div><div class="hl-val hl-dark">${fmt0(s.orders)}</div><div class="hl-lbl">Pedidos Realizados</div><div><span class="hl-trend hl-neutral">— mês base</span></div></div>
    <div><div class="hl-val hl-grn">${brl(s.avgTicket)}</div><div class="hl-lbl">Ticket Médio por Pedido</div><div><span class="hl-trend hl-neutral">— mês base</span></div></div>
    <div><div class="hl-val hl-blu">${pct(s.conversionRate)}</div><div class="hl-lbl">Taxa de Conversão</div><div><span class="hl-trend hl-neutral">— mês base</span></div></div>
  </div>
  <div class="g4" style="margin-bottom:10px">
    <div class="kpi gold"><div class="kpi-lbl">Receita / Dia (Média)</div><div class="kpi-val brl">${brl0(k.revenuePerDay)}</div><div class="kpi-sub">Pico: ${brl0(k.revenuePerDayPeak.value)} em ${k.revenuePerDayPeak.label}</div></div>
    <div class="kpi"><div class="kpi-lbl">Itens Vendidos</div><div class="kpi-val">${fmt0(k.itemsSold)}</div><div class="kpi-sub">${k.itemsPerOrder.toFixed(2).replace('.',',')} itens/pedido em média</div></div>
    <div class="kpi"><div class="kpi-lbl">Receita / Sessão</div><div class="kpi-val brl">${brl(k.revenuePerSession)}</div><div class="kpi-sub">Eficiência de monetização por visita</div></div>
    <div class="kpi"><div class="kpi-lbl">Pedidos Top 50 Produtos</div><div class="kpi-val">${pct(k.top50ProductRevenue)}</div><div class="kpi-sub">da receita em apenas 50 de ${k.totalProducts} produtos</div></div>
  </div>
  <div class="g4">
    <div class="kpi"><div class="kpi-lbl">Receita de Recorrentes</div><div class="kpi-val grn">${pct(k.returningCustomerRate)}</div><div class="kpi-sub">${brl0(k.returningRevenue)} gerados por ${fmt0(k.returningCustomers)} clientes fiéis</div></div>
    <div class="kpi"><div class="kpi-lbl">Sessões</div><div class="kpi-val">${fmt0(k.sessions)}</div><div class="kpi-sub">${fmt0(k.pageviews)} pageviews · ${k.pagesPerSession.toFixed(2).replace('.',',')} págs/sessão</div></div>
    <div class="kpi"><div class="kpi-lbl">Engajamento</div><div class="kpi-val">${pct(k.engagementRate)}</div><div class="kpi-sub"><span class="badge bg">Saudável</span> ${k.avgSessionDuration} de sessão média</div></div>
    <div class="kpi"><div class="kpi-lbl">Taxa de Rejeição</div><div class="kpi-val">${pct(k.bounceRate)}</div><div class="kpi-sub"><span class="badge bg">Abaixo de 30%</span></div></div>
  </div>
</section>

<!-- ═══ VENDAS ═══ -->
<section class="sec" id="vendas">
  <div class="sec-ttl">Vendas & Receita</div>

  <div class="card" style="margin-bottom:10px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <div><div class="card-ttl">Receita e Pedidos por Dia</div><div class="card-sub" style="margin-bottom:0">Barras = receita (R$) · Linha = pedidos · Fundo cinza = fins de semana</div></div>
      <div style="display:flex;gap:14px;align-items:center">
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><span style="width:10px;height:10px;border-radius:2px;background:#C9980A;display:inline-block;opacity:.75"></span>Receita</span>
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><span style="width:14px;height:2px;background:var(--blu);display:inline-block"></span>Pedidos</span>
      </div>
    </div>
    <canvas id="revChart" height="278"></canvas>
  </div>

  <div class="g21" style="margin-bottom:10px">
    <div class="tbl-card">
      <div class="tbl-head"><div class="card-ttl" style="margin-bottom:0">Receita por Canal de Aquisição</div></div>
      <div class="tbl-wrap"><div class="tbl-scroll">
        <table>
          <thead><tr><th>Canal</th><th>Receita</th><th>Pedidos</th><th>Ticket Médio</th><th>% Receita</th></tr></thead>
          <tbody>
            ${data.channels.map(c => {
              const chCls = c.warn ? 'ch-soc" style="background:#FFF0F0;color:var(--red)' : c.cls;
              const revCls = c.warn ? 'twarn' : c.revenue > 10000 ? 'tbrl' : '';
              const ticketStyle = c.avgTicket > 100 ? 'style="color:var(--grn);font-weight:700"' : '';
              return `<tr>
                <td><span class="ch ${chCls}">${c.name}</span></td>
                <td class="${revCls}">${c.revenue ? brl(c.revenue) : '<span class="twarn">R$ 0</span>'}</td>
                <td class="${c.warn ? 'twarn' : ''}">${c.warn ? '<span class="twarn">0</span>' : fmt0(c.orders)}</td>
                <td ${ticketStyle}>${c.avgTicket ? brl(c.avgTicket) : '—'}</td>
                <td class="${c.warn ? 'twarn' : c.pct > 5 ? 'tok' : ''}">${c.warn ? '0%' : pct(c.pct)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div></div>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="card">
        <div class="card-ttl" style="margin-bottom:10px">Receita por Dispositivo</div>
        ${data.devicesRevenue.map(d => `
        <div class="dev">
          <div class="dev-lbl">${d.name}</div>
          <div class="dev-val">${fmt0(d.orders)} pedidos</div>
          <div class="dev-rev">${brl(d.revenue)}</div>
          <div class="dev-bg"><div class="dev-bar" style="width:${d.pct}%;background:${d.color}"></div></div>
          <div class="dev-row"><span class="drl">% receita</span><span class="drv">${pct(d.pct)}</span></div>
          <div class="dev-row"><span class="drl">Ticket médio</span><span class="drv${d.name==='Mobile'?' tok':''}">${brl(d.avgTicket)}</span></div>
        </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-ttl" style="margin-bottom:10px">Receita por Dia da Semana</div>
        <canvas id="dowChart" height="130"></canvas>
      </div>
    </div>
  </div>

  <div class="tbl-card">
    <div class="tbl-head"><div class="card-ttl" style="margin-bottom:0">Receita por Cidade — Top 15</div></div>
    <div class="tbl-wrap"><div class="tbl-scroll">
      <table>
        <thead><tr><th>#</th><th>Cidade</th><th>Receita</th><th>Pedidos</th><th>Sessões</th><th>Ticket Médio</th><th>% Receita</th></tr></thead>
        <tbody>
          ${data.cities.map(c => `
          <tr>
            <td class="trnk">${c.rank}</td>
            <td class="ta">${c.name}</td>
            <td class="tbrl">${brl(c.revenue)}</td>
            <td>${fmt0(c.orders)}</td>
            <td>${fmt0(c.sessions)}</td>
            <td${c.avgTicket > 200 ? ' style="color:var(--grn);font-weight:700"' : ''}>${brl(c.avgTicket)}</td>
            <td class="${c.pct > 5 ? 'tok' : ''}">${pct(c.pct)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div></div>
  </div>
</section>

<!-- ═══ TOP PRODUTOS ═══ -->
<section class="sec" id="produtos">
  <div class="sec-ttl">Top 50 Produtos por Receita</div>
  <div class="g3" style="margin-bottom:12px">
    <div class="kpi gold"><div class="kpi-lbl">Receita Top 50 Produtos</div><div class="kpi-val brl">R$ 155.237</div><div class="kpi-sub">92,8% da receita total do mês</div></div>
    <div class="kpi"><div class="kpi-lbl">Total de Produtos Únicos</div><div class="kpi-val">111</div><div class="kpi-sub">50 produtos concentram quase toda a receita</div></div>
    <div class="kpi"><div class="kpi-lbl">Produto #1 em Receita</div><div class="kpi-val" style="font-size:13px;line-height:1.4">LONA FRONT 440 REFORÇO</div><div class="kpi-sub"><span class="badge bgd">R$ 14.508 · 8,7% da receita</span></div></div>
  </div>
  <div class="tbl-card">
    <div class="tbl-head">
      <div class="card-ttl" style="margin-bottom:2px">Top 50 Produtos — ${data.period.label}</div>
      <div style="font-size:11px;color:var(--t3)">Ordenado por receita · scroll para ver todos os 50 · Preço médio = receita ÷ quantidade</div>
    </div>
    <div class="tbl-wrap"><div class="tbl-scroll">
      <table>
        <thead><tr><th>#</th><th>Produto</th><th>Receita</th><th>Qtd.</th><th>Preço Médio</th><th>% Receita</th><th>Volume</th></tr></thead>
        <tbody>${prodRows}</tbody>
      </table>
    </div></div>
  </div>
</section>

<!-- ═══ FUNIL ═══ -->
<section class="sec" id="funil">
  <div class="sec-ttl">Funil de Compra & Retenção de Usuários</div>
  <div class="g2">
    <div class="card">
      <div class="card-ttl">Funil de Checkout</div>
      <div class="card-sub">Usuários únicos por etapa da jornada de compra</div>
      ${data.funnel.map(f => `
      <div class="fn-step">
        <div class="fn-num">${f.step}</div>
        <div class="fn-info">
          <div class="fn-name">${f.name}</div>
          <div class="fn-bg"><div class="fn-bar" style="width:${f.pct}%${f.highlight?';background:var(--grn)':''}"></div></div>
        </div>
        <div class="fn-vals">
          <div class="fn-count"${f.highlight?' style="color:var(--grn)"':''}>${fmt0(f.count)}</div>
          <div class="fn-rate"${f.highlight?' style="color:var(--grn)"':''}>${f.pct}% ${f.note||'dos usuários'}</div>
        </div>
      </div>`).join('')}
      <div style="margin-top:12px;padding:12px;background:var(--sur2);border-radius:var(--rs);display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <div><div style="font-size:16px;font-weight:800;font-variant-numeric:tabular-nums">${fmt0(data.formStats.starts)}</div><div style="font-size:10px;color:var(--t3);margin-top:2px">Form Starts</div></div>
        <div><div style="font-size:16px;font-weight:800;color:var(--amb);font-variant-numeric:tabular-nums">${fmt0(data.formStats.submits)}</div><div style="font-size:10px;color:var(--amb);margin-top:2px">Form Submits</div></div>
        <div><div style="font-size:16px;font-weight:800;color:var(--amb);font-variant-numeric:tabular-nums">${pct(data.formStats.rate)}</div><div style="font-size:10px;color:var(--amb);margin-top:2px">Taxa Form (eventos)</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-ttl">Novos vs. Clientes Recorrentes</div>
      <div class="card-sub" style="margin-bottom:12px">Impacto real na receita por tipo de usuário</div>
      <div class="ret-grid">
        <div class="ret-card ret-ret">
          <div class="ret-type">Recorrentes</div>
          <div class="ret-val">${fmt0(data.retention.returning.users)}</div>
          <div style="font-size:11px;color:var(--grn)">usuários retornantes</div>
          <div class="ret-stat"><span class="rsl">Sessões</span><span class="rsv">${fmt0(data.retention.returning.sessions)}</span></div>
          <div class="ret-stat"><span class="rsl">Pedidos</span><span class="rsv">${fmt0(data.retention.returning.orders)}</span></div>
          <div class="ret-stat"><span class="rsl">Receita</span><span class="rsv" style="color:var(--grn)">${brl0(data.retention.returning.revenue)}</span></div>
          <div class="ret-stat"><span class="rsl">% da receita</span><span class="rsv" style="color:var(--grn)">${pct(data.retention.returning.revPct)}</span></div>
          <div class="ret-stat"><span class="rsl">Conv. / sessão</span><span class="rsv">${pct(data.retention.returning.convRate)}</span></div>
          <div class="ret-stat"><span class="rsl">Receita / usuário</span><span class="rsv" style="color:var(--grn)">${brl(data.retention.returning.revenuePerUser)}</span></div>
        </div>
        <div class="ret-card ret-new">
          <div class="ret-type">Novos Usuários</div>
          <div class="ret-val">${fmt0(data.retention.new.users)}</div>
          <div style="font-size:11px;color:var(--blu)">primeiras visitas</div>
          <div class="ret-stat"><span class="rsl">Sessões</span><span class="rsv">${fmt0(data.retention.new.sessions)}</span></div>
          <div class="ret-stat"><span class="rsl">Pedidos</span><span class="rsv">${fmt0(data.retention.new.orders)}</span></div>
          <div class="ret-stat"><span class="rsl">Receita</span><span class="rsv">${brl0(data.retention.new.revenue)}</span></div>
          <div class="ret-stat"><span class="rsl">% da receita</span><span class="rsv">${pct(data.retention.new.revPct)}</span></div>
          <div class="ret-stat"><span class="rsl">Conv. / sessão</span><span class="rsv" style="color:var(--amb)">${pct(data.retention.new.convRate)}</span></div>
          <div class="ret-stat"><span class="rsl">Receita / usuário</span><span class="rsv" style="color:var(--amb)">${brl(data.retention.new.revenuePerUser)}</span></div>
        </div>
      </div>
      <div style="padding:10px 14px;background:var(--grn-l);border-radius:var(--rs);font-size:12px;color:var(--grn);font-weight:600">★ Clientes recorrentes valem 52× mais que novos em receita/usuário (R$ 146 vs R$ 2,81)</div>
      <div style="margin-top:10px;padding:10px 14px;background:var(--sur2);border-radius:var(--rs)">
        <div style="font-size:11px;font-weight:700;color:var(--t2);margin-bottom:6px">Dados demográficos</div>
        <div style="font-size:11px;color:var(--t3);line-height:1.6">GA4 não retornou dados de idade e gênero para este período — volume de sessões com sinais demográficos está abaixo do limiar de anonimato da Google (thresholding).</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ TRÁFEGO ═══ -->
<section class="sec" id="trafego">
  <div class="sec-ttl">Tráfego & Comportamento</div>

  <div class="card" style="margin-bottom:10px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <div><div class="card-ttl">Sessões Diárias — ${data.period.label}</div><div class="card-sub" style="margin-bottom:0">Linha azul = sessões · tracejado verde = conversões · cinza = fim de semana</div></div>
    </div>
    <canvas id="sessChart" height="170"></canvas>
  </div>

  <div class="g2" style="margin-bottom:10px">
    <div class="tbl-card">
      <div class="tbl-head"><div class="card-ttl" style="margin-bottom:0">Páginas Mais Visitadas</div></div>
      <div class="tbl-wrap"><div class="tbl-scroll">
        <table>
          <thead><tr><th>Página</th><th>Views</th><th>Usuários</th><th>Duração</th><th>Rejeição</th></tr></thead>
          <tbody>
            ${data.pages.map(p => `
            <tr>
              <td class="tmono">${p.path}</td>
              <td>${fmt0(p.views)}</td>
              <td>${fmt0(p.users)}</td>
              <td>${p.duration}</td>
              <td class="${p.bounce > 30 ? 'twarn' : ''}">${pct(p.bounce)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div></div>
    </div>

    <div class="tbl-card">
      <div class="tbl-head"><div class="card-ttl" style="margin-bottom:0">Fonte / Meio de Tráfego</div></div>
      <div class="tbl-wrap"><div class="tbl-scroll">
        <table>
          <thead><tr><th>Fonte / Meio</th><th>Sessões</th><th>Receita</th><th>Pedidos</th><th>Rejeição</th></tr></thead>
          <tbody>
            ${data.sources.map(r => {
              const srcStyle = r.warn===true ? 'style="color:var(--red)"' : r.warn==='amb' ? 'style="color:var(--amb)"' : '';
              const bounceStyle = r.bounce > 60 ? 'class="twarn"' : r.bounce > 40 ? 'style="color:var(--amb);font-weight:700"' : '';
              return `<tr>
                <td class="tmono" ${srcStyle}>${r.source}</td>
                <td>${fmt0(r.sessions)}</td>
                <td class="${r.revenue > 10000 ? 'tbrl' : r.revenue === 0 ? 'twarn' : ''}">${r.revenue ? brl0(r.revenue) : 'R$ 0'}</td>
                <td class="${r.orders === 0 ? 'twarn' : ''}">${r.orders === 0 ? '<span class="twarn">0</span>' : r.orders}</td>
                <td ${bounceStyle}>${pct(r.bounce)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div></div>
    </div>
  </div>

  <div class="g3">
    <div class="card">
      <div class="card-ttl" style="margin-bottom:10px">Canais por Volume de Sessões</div>
      <div class="hbl">
        ${data.channelSessions.map(c => {
          const pctW = (c.sessions / maxChSess * 100).toFixed(1);
          const clsVal = c.name === 'Paid Social' ? 'ch-soc" style="background:#FFF0F0;color:var(--red)' : c.cls;
          return `<div class="hbr"><div class="hbl-l"><span class="ch ${clsVal}">${c.name}</span></div><div class="hbt"><div class="hbf" style="width:${pctW}%;background:${c.color}"></div></div><div class="hbv">${fmt0(c.sessions)}</div></div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-ttl" style="margin-bottom:10px">Dispositivos (sessões)</div>
      <div class="hbl">
        ${data.devices.map(d => {
          const pctW = (d.sessions / maxDevSess * 100).toFixed(0);
          const color = d.name.includes('Desktop') ? 'var(--blu)' : d.name.includes('Mobile') ? 'var(--grn)' : 'var(--t3)';
          return `<div class="hbr"><div class="hbl-l">${d.name}</div><div class="hbt"><div class="hbf" style="width:${pctW}%;background:${color}"></div></div><div class="hbv">${fmt0(d.sessions)}</div></div>`;
        }).join('')}
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bdr2)">
        <div style="font-size:11px;font-weight:700;color:var(--t2);margin-bottom:8px">Top cidades por sessão</div>
        <div class="hbl">
          ${data.topCitiesSessions.map(c => {
            const pctW = (c.sessions / maxCitySess * 100).toFixed(1);
            return `<div class="hbr"><div class="hbl-l">${c.name}</div><div class="hbt"><div class="hbf" style="width:${pctW}%;background:var(--blu)"></div></div><div class="hbv">${fmt0(c.sessions)}</div></div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-ttl" style="margin-bottom:10px">Eventos Principais</div>
      <div class="hbl">
        ${data.events.map(e => {
          const pctW = (e.count / maxEvt * 100).toFixed(0);
          const color = e.highlight ? 'var(--grn)' : 'var(--blu)';
          return `<div class="hbr">
            <div class="hbl-l"${e.highlight ? ' style="color:var(--grn);font-weight:700"' : ''}>${e.name}</div>
            <div class="hbt"><div class="hbf" style="width:${pctW}%;background:${color}"></div></div>
            <div class="hbv"${e.highlight ? ' style="color:var(--grn)"' : ''}>${fmt0(e.count)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>
</section>

<!-- ═══ INSIGHTS ═══ -->
<section class="sec" id="insights">
  <div class="sec-ttl">Insights & Recomendações para Diretoria</div>
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

export function initGA4Charts(data) {
  const revCanvas = document.getElementById('revChart');
  if (revCanvas) drawRevChart(revCanvas, data.dailyRevenue);

  const sessCanvas = document.getElementById('sessChart');
  if (sessCanvas) drawSessChart(sessCanvas, data.dailySessions, data.dailyRevenue.map(d => d.orders));

  const dowCanvas = document.getElementById('dowChart');
  if (dowCanvas) drawDowChart(dowCanvas, data.dowRevenue);
}
