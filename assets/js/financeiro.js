document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'financeiro') return;

  try {
    const [{ data: vendas }, { data: compras }] = await Promise.all([
      db.from('vendas').select('data, total, lucro').order('data'),
      db.from('compras').select('data, total').order('data')
    ]);

    // Resumo mensal agrupado por mes
    const mapa = {};
    (vendas || []).forEach((v) => {
      const k = App.monthKey(v.data);
      if (!mapa[k]) mapa[k] = { mes: k, gasto: 0, vendido: 0, lucro: 0 };
      mapa[k].vendido += Number(v.total);
      mapa[k].lucro   += Number(v.lucro);
    });
    (compras || []).forEach((c) => {
      const k = App.monthKey(c.data);
      if (!mapa[k]) mapa[k] = { mes: k, gasto: 0, vendido: 0, lucro: 0 };
      mapa[k].gasto += Number(c.total);
    });
    const resumo = Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes));

    // Metricas acumuladas
    const totalGasto   = (compras || []).reduce((s, c) => s + Number(c.total), 0);
    const totalVendido = (vendas  || []).reduce((s, v) => s + Number(v.total), 0);
    const lucroTotal   = (vendas  || []).reduce((s, v) => s + Number(v.lucro), 0);
    const mesAtual     = App.monthKey(App.today());
    const lucroMes     = (vendas || []).filter((v) => App.monthKey(v.data) === mesAtual).reduce((s, v) => s + Number(v.lucro), 0);

    document.getElementById('finance-stats').innerHTML = [
      ['Total gasto',   App.formatCurrency(totalGasto),   'Compras acumuladas'],
      ['Total vendido', App.formatCurrency(totalVendido), 'Receita acumulada'],
      ['Lucro total',   App.formatCurrency(lucroTotal),   'Margem total registrada'],
      ['Lucro do mes',  App.formatCurrency(lucroMes),     'Resultado do mes atual']
    ].map(([label, value, info]) => `
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
        <td class="${item.lucro >= 0 ? 'metric-positive' : 'metric-negative'}">${App.formatCurrency(item.lucro)}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" class="empty-state">Sem dados financeiros cadastrados.</td></tr>';

    const ctx = document.getElementById('financeChart');
    if (ctx && typeof Chart !== 'undefined') {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: resumo.map((item) => App.formatMonth(item.mes)),
          datasets: [{ label: 'Lucro mensal', data: resumo.map((item) => item.lucro), borderColor: '#335cff', backgroundColor: 'rgba(51,92,255,0.15)', fill: true, tension: 0.35 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  } catch (err) {
    App.showToast('Erro ao carregar financeiro.', 'error');
  }
});
