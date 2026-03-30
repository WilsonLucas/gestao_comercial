document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'dashboard') return;

  try {
    const dados = await API.get('/dashboard');
    const m = dados.metricas;

    const stats = [
      ['Total gasto', App.formatCurrency(m.total_gasto), 'Compras registradas no sistema'],
      ['Total vendido', App.formatCurrency(m.total_vendido), 'Receita bruta acumulada'],
      ['Lucro total', App.formatCurrency(m.lucro_total), 'Resultado liquido das vendas'],
      ['Lucro do mes', App.formatCurrency(m.lucro_mes), 'Apurado no mes atual'],
      ['Quantidade de vendas', m.quantidade_vendas, 'Operacoes concluidas'],
      ['Estoque baixo', m.estoque_baixo, 'Ingredientes exigindo atencao']
    ];

    document.getElementById('dashboard-stats').innerHTML = stats.map(([label, value, trend]) => `
      <article class="stat-card">
        <div class="label">${label}</div>
        <div class="value">${value}</div>
        <div class="trend">${trend}</div>
      </article>
    `).join('');

    const tbody = document.getElementById('latest-sales-body');
    const ultimasVendas = dados.ultimas_vendas || [];
    tbody.innerHTML = ultimasVendas.length ? ultimasVendas.map((venda) => {
      const itensStr = (venda.itens || []).map((i) => `${i.produto_nome} x${i.quantidade}`).join(', ');
      return `
        <tr>
          <td>${App.formatDate(venda.data)}</td>
          <td>${itensStr || '-'}</td>
          <td>-</td>
          <td>${App.formatCurrency(venda.total)}</td>
          <td class="metric-positive">${App.formatCurrency(venda.lucro)}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="5" class="empty-state">Nenhuma venda cadastrada.</td></tr>';

    const monthly = dados.desempenho_mensal || [];
    const ctx = document.getElementById('dashboardChart');
    if (ctx && typeof Chart !== 'undefined') {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthly.map((item) => App.formatMonth(item.mes)),
          datasets: [
            { label: 'Gastos', data: monthly.map((item) => item.gasto), backgroundColor: '#c7d2fe' },
            { label: 'Vendas', data: monthly.map((item) => item.vendido), backgroundColor: '#60a5fa' },
            { label: 'Lucro', data: monthly.map((item) => item.lucro), type: 'line', borderColor: '#0f9f6e', backgroundColor: '#0f9f6e', tension: 0.3 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  } catch (err) {
    App.showToast(err?.erro || 'Erro ao carregar dashboard.', 'error');
  }
});
