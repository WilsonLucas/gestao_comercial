document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'financeiro') return;

  const metrics = App.getMetrics();
  const monthly = App.buildMonthlySummary();
  const currentMonth = App.monthKey(App.today());
  const currentSummary = monthly.find((item) => item.month === currentMonth) || { lucro: 0 };
  const cards = [
    ['Total gasto', App.formatCurrency(metrics.totalGasto), 'Compras acumuladas'],
    ['Total vendido', App.formatCurrency(metrics.totalVendido), 'Receita acumulada'],
    ['Lucro total', App.formatCurrency(metrics.lucroTotal), 'Margem total registrada'],
    ['Lucro do mês', App.formatCurrency(currentSummary.lucro), 'Resultado do mês atual']
  ];

  document.getElementById('finance-stats').innerHTML = cards.map(([label, value, info]) => `
    <article class="stat-card">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="trend">${info}</div>
    </article>
  `).join('');

  document.getElementById('financeiro-body').innerHTML = monthly.length ? monthly.map((item) => `
    <tr>
      <td>${App.formatMonth(item.month)}</td>
      <td>${App.formatCurrency(item.gasto)}</td>
      <td>${App.formatCurrency(item.vendido)}</td>
      <td class="${item.lucro >= 0 ? 'metric-positive' : 'metric-negative'}">${App.formatCurrency(item.lucro)}</td>
    </tr>
  `).join('') : '<tr><td colspan="4" class="empty-state">Sem dados financeiros cadastrados.</td></tr>';

  const ctx = document.getElementById('financeChart');
  if (ctx && typeof Chart !== 'undefined') {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthly.map((item) => App.formatMonth(item.month)),
        datasets: [{ label: 'Lucro mensal', data: monthly.map((item) => item.lucro), borderColor: '#335cff', backgroundColor: 'rgba(51,92,255,0.15)', fill: true, tension: 0.35 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
});
