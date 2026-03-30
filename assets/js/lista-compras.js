document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'lista-compras') return;

  async function renderTable() {
    const tbody = document.getElementById('lista-compras-body');
    try {
      const lista = await API.get('/lista-compras');
      tbody.innerHTML = lista.length ? lista.map((item) => {
        const status = App.calcularStatus(item);
        return `
          <tr class="${status.status === 'critico' ? 'table-row-critical' : ''}">
            <td>${item.nome}</td>
            <td>${item.unidade}</td>
            <td>${Number(item.estoque_atual).toFixed(3)}</td>
            <td>${Number(item.estoque_minimo).toFixed(3)}</td>
            <td>${App.formatCurrency(item.preco_compra)}</td>
            <td><span class="badge ${status.className}">${status.label}</span></td>
          </tr>
        `;
      }).join('') : '<tr><td colspan="6" class="empty-state">Todos os ingredientes estao com estoque adequado.</td></tr>';
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Erro ao carregar lista de compras.</td></tr>';
      App.showToast(err?.erro || 'Erro ao carregar lista de compras.', 'error');
    }
  }

  renderTable();
});
