document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'lista-compras') return;

  async function renderTable() {
    const tbody = document.getElementById('lista-compras-body');
    const { data: lista, error } = await db.from('ingredientes').select('id, nome, unidade, estoque_atual, estoque_minimo, preco_compra').order('nome');

    if (error) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Erro ao carregar lista de compras.</td></tr>';
      App.showToast('Erro ao carregar lista de compras.', 'error');
      return;
    }

    const criticos = (lista || []).filter((item) => {
      const status = App.calcularStatus(item);
      return status.status === 'critico' || status.status === 'atencao';
    });

    tbody.innerHTML = criticos.length ? criticos.map((item) => {
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
  }

  renderTable();
});
