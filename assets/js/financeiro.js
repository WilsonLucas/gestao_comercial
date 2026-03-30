document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'financeiro') return;

  try {
    const [desempenho, resumo] = await Promise.all([
      API.get('/financeiro/desempenho'),
      API.get('/financeiro/resumo-mensal')
    ]);

    const cards = [
      ['Total gasto', App.formatCurrency(desempenho.total_gasto), 'Compras acumuladas'],
      ['Total vendido', App.formatCurrency(desempenho.total_vendido), 'Receita acumulada'],
      ['Lucro total', App.formatCurrency(desempenho.lucro_total), 'Margem total registrada'],
      ['Lucro do mes', App.formatCurrency(desempenho.lucro_mes), 'Resultado do mes atual']
    ];

    document.getElementById('finance-stats').innerHTML = cards.map(([label, value, info]) => `
      <article class="stat-card">
        <div class="label">${label}</div>
        <div class="value">${value}</div>
        <div class="trend">${info}</div>
      </article>
    `).join('');

    document.getElementById('financeiro-body').innerHTML = resumo.length ? resumo.map((item) => `
      <tr>
        <td>${App.formatMonth(item.mes)}</td>
        <td>${App.formatCurrency(item.gasto)}</td>
        <td>${App.formatCurrency(item.vendido)}</td>
        <td class="${Number(item.lucro) >= 0 ? 'metric-positive' : 'metric-negative'}">${App.formatCurrency(item.lucro)}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" class="empty-state">Sem dados financeiros cadastrados.</td></tr>';

    const ctx = document.getElementById('financeChart');
    if (ctx && typeof Chart !== 'undefined') {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: resumo.map((item) => App.formatMonth(item.mes)),
          datasets: [{ label: 'Lucro mensal', data: resumo.map((item) => Number(item.lucro)), borderColor: '#335cff', backgroundColor: 'rgba(51,92,255,0.15)', fill: true, tension: 0.35 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  } catch (err) {
    App.showToast(err?.erro || 'Erro ao carregar financeiro.', 'error');
  }
});
