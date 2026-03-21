document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'dashboard') return;

  const metrics = App.getMetrics();
  const stats = [
    ['Total gasto', App.formatCurrency(metrics.totalGasto), 'Compras registradas no sistema'],
    ['Total vendido', App.formatCurrency(metrics.totalVendido), 'Receita bruta acumulada'],
    ['Lucro total', App.formatCurrency(metrics.lucroTotal), 'Resultado líquido das vendas'],
    ['Lucro do mês', App.formatCurrency(metrics.lucroMes), 'Apurado no mês atual'],
    ['Quantidade de vendas', metrics.quantidadeVendas, 'Operações concluídas'],
    ['Estoque baixo', metrics.estoqueBaixo, 'Produtos exigindo atenção']
  ];

  document.getElementById('dashboard-stats').innerHTML = stats.map(([label, value, trend]) => `
    <article class="stat-card">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="trend">${trend}</div>
    </article>
  `).join('');

  const latestSales = [...App.getSales()].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6);
  const tbody = document.getElementById('latest-sales-body');
  tbody.innerHTML = latestSales.length ? latestSales.map((sale) => `
    <tr>
      <td>${App.formatDate(sale.data)}</td>
      <td>${sale.produto}</td>
      <td>${sale.quantidade}</td>
      <td>${App.formatCurrency(sale.total)}</td>
      <td class="metric-positive">${App.formatCurrency(sale.lucro)}</td>
    </tr>
  `).join('') : '<tr><td colspan="5" class="empty-state">Nenhuma venda cadastrada.</td></tr>';

  const monthly = App.buildMonthlySummary();
  const ctx = document.getElementById('dashboardChart');
  if (ctx && typeof Chart !== 'undefined') {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthly.map((item) => App.formatMonth(item.month)),
        datasets: [
          { label: 'Gastos', data: monthly.map((item) => item.gasto), backgroundColor: '#c7d2fe' },
          { label: 'Vendas', data: monthly.map((item) => item.vendido), backgroundColor: '#60a5fa' },
          { label: 'Lucro', data: monthly.map((item) => item.lucro), type: 'line', borderColor: '#0f9f6e', backgroundColor: '#0f9f6e', tension: 0.3 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
});
