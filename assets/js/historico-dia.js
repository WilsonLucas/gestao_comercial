document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'historico-dia') return;

  async function renderHistorico() {
    const tbody = document.getElementById('historico-body');
    const totalEl = document.getElementById('historico-total');
    const lucroEl = document.getElementById('historico-lucro');

    try {
      const vendas = await API.get('/vendas/hoje');
      let totalDia = 0;
      let lucroDia = 0;

      tbody.innerHTML = vendas.length ? vendas.map((venda) => {
        totalDia += Number(venda.total);
        lucroDia += Number(venda.lucro);
        const itensStr = (venda.itens || []).map((i) => `${i.produto_nome} x${i.quantidade}`).join(', ');
        return `
          <tr>
            <td>${new Date(venda.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${itensStr || '-'}</td>
            <td>${App.formatCurrency(venda.total)}</td>
            <td class="metric-positive">${App.formatCurrency(venda.lucro)}</td>
          </tr>
        `;
      }).join('') : '<tr><td colspan="4" class="empty-state">Nenhuma venda registrada hoje.</td></tr>';

      if (totalEl) totalEl.textContent = App.formatCurrency(totalDia);
      if (lucroEl) lucroEl.textContent = App.formatCurrency(lucroDia);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Erro ao carregar historico.</td></tr>';
      App.showToast(err?.erro || 'Erro ao carregar historico.', 'error');
    }
  }

  renderHistorico();
});
