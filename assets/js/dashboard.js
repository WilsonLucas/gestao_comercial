document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'dashboard') return;

  try {
    const [{ data: metricas }, { data: vendasRaw }, { data: comprasRaw }] = await Promise.all([
      db.rpc('dashboard_metrics'),
      db.from('vendas').select('data, total, lucro, criado_em, itens_venda(quantidade, produtos(nome))').order('criado_em', { ascending: false }),
      db.from('compras').select('data, total').order('data')
    ]);

    const m = metricas || {};
    const stats = [
      ['Lucro do mes', App.formatCurrency(m.lucro_mes), 'Resultado liquido do mes atual'],
      ['Total vendido', App.formatCurrency(m.vendido_mes), 'Receita bruta do mes atual'],
      ['Total gasto', App.formatCurrency(m.gasto_mes), 'Compras registradas no mes'],
      ['Estoque critico', m.estoque_critico ?? 0, 'Ingredientes exigindo atencao']
    ];

    document.getElementById('dashboard-stats').innerHTML = stats.map(([label, value, trend]) => `
      <article class="stat-card">
        <div class="label">${label}</div>
        <div class="value">${value}</div>
        <div class="trend">${trend}</div>
      </article>
    `).join('');

    const ultimasVendas = (vendasRaw || []).slice(0, 5);
    const tbody = document.getElementById('latest-sales-body');
    tbody.innerHTML = ultimasVendas.length ? ultimasVendas.map((venda) => {
      const itensStr = (venda.itens_venda || []).map((i) => `${i.produtos?.nome} x${i.quantidade}`).join(', ');
      return `
        <tr>
          <td>${App.formatDate(venda.data)}</td>
          <td>${itensStr || '-'}</td>
          <td>${App.formatCurrency(venda.total)}</td>
          <td class="metric-positive">${App.formatCurrency(venda.lucro)}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="4" class="empty-state">Nenhuma venda cadastrada.</td></tr>';

    // Resumo mensal para grafico
    const mapaVendas = {};
    (vendasRaw || []).forEach((v) => {
      const k = App.monthKey(v.data);
      if (!mapaVendas[k]) mapaVendas[k] = { mes: k, vendido: 0, lucro: 0, gasto: 0 };
      mapaVendas[k].vendido += Number(v.total);
      mapaVendas[k].lucro += Number(v.lucro);
    });
    (comprasRaw || []).forEach((c) => {
      const k = App.monthKey(c.data);
      if (!mapaVendas[k]) mapaVendas[k] = { mes: k, vendido: 0, lucro: 0, gasto: 0 };
      mapaVendas[k].gasto += Number(c.total);
    });
    const monthly = Object.values(mapaVendas).sort((a, b) => a.mes.localeCompare(b.mes));

    const ctx = document.getElementById('dashboardChart');
    if (ctx && typeof Chart !== 'undefined') {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthly.map((item) => App.formatMonth(item.mes)),
          datasets: [
            { label: 'Gastos',  data: monthly.map((i) => i.gasto),   backgroundColor: '#c7d2fe' },
            { label: 'Vendas',  data: monthly.map((i) => i.vendido), backgroundColor: '#60a5fa' },
            { label: 'Lucro',   data: monthly.map((i) => i.lucro),   type: 'line', borderColor: '#0f9f6e', backgroundColor: '#0f9f6e', tension: 0.3 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  } catch (err) {
    App.showToast('Erro ao carregar dashboard.', 'error');
  }
});
