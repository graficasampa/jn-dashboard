export function renderLineChart(canvas, labels, values, color = '#e37400') {
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: color + '33',
        borderColor: color,
        borderWidth: 2,
        borderRadius: 3,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: {
          label: ctx => 'R$' + Number(ctx.raw).toLocaleString('pt-BR')
        }
      }},
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af', maxRotation: 0 } },
        y: {
          grid: { color: '#f0f0f0' },
          ticks: {
            font: { size: 10 }, color: '#9ca3af',
            callback: v => v >= 1000 ? 'R$' + (v/1000).toFixed(0) + 'K' : 'R$' + v
          }
        }
      }
    }
  });
}

export function renderDonutChart(canvas, labels, values, colors) {
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.raw + '%' } }
      }
    }
  });
}
