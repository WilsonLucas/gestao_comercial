document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'compras') return;

  const form = document.getElementById('compra-form');
  const totalInput = document.getElementById('total-compra');
  const quantityInput = document.getElementById('quantidade-compra');
  const priceInput = document.getElementById('valor-compra');
  const ingredienteSelect = document.getElementById('ingrediente-id');

  let ingredientesCache = [];

  const updateTotal = () => {
    if (totalInput) {
      totalInput.value = App.formatCurrency((Number(quantityInput?.value) || 0) * (Number(priceInput?.value) || 0));
    }
  };

  [quantityInput, priceInput].forEach((input) => input?.addEventListener('input', updateTotal));

  async function carregarIngredientes() {
    try {
      ingredientesCache = await API.get('/ingredientes');
      if (ingredienteSelect) {
        ingredienteSelect.innerHTML = '<option value="">Selecione o ingrediente</option>' +
          ingredientesCache.map((i) => `<option value="${i.id}">${i.nome} (${i.unidade})</option>`).join('');
      }
    } catch (err) {
      App.showToast('Erro ao carregar ingredientes.', 'error');
    }
  }

  async function renderTable() {
    const tbody = document.getElementById('compras-body');
    try {
      const lista = await API.get('/compras');
      tbody.innerHTML = lista.length ? lista.map((item) => `
        <tr>
          <td>${App.formatDate(item.data)}</td>
          <td>${item.ingrediente_nome}</td>
          <td>${item.unidade}</td>
          <td>${Number(item.quantidade).toFixed(3)}</td>
          <td>${App.formatCurrency(item.valor_unitario)}</td>
          <td>${App.formatCurrency(item.total)}</td>
          <td>
            <div class="actions">
              <button class="btn btn-danger" data-delete="${item.id}">Excluir</button>
            </div>
          </td>
        </tr>
      `).join('') : '<tr><td colspan="7" class="empty-state">Nenhuma compra cadastrada.</td></tr>';
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Erro ao carregar compras.</td></tr>';
      App.showToast(err?.erro || 'Erro ao carregar compras.', 'error');
    }
  }

  function resetForm() {
    form?.reset();
    const dataInput = document.getElementById('data-compra');
    if (dataInput) dataInput.value = App.today();
    updateTotal();
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      ingrediente_id: ingredienteSelect?.value,
      quantidade: Number(quantityInput?.value),
      valor_unitario: Number(priceInput?.value),
      data: document.getElementById('data-compra')?.value
    };

    if (!payload.ingrediente_id) {
      App.showToast('Selecione um ingrediente.', 'error');
      return;
    }

    try {
      await API.post('/compras', payload);
      App.showToast('Compra cadastrada com sucesso.');
      resetForm();
      renderTable();
    } catch (err) {
      App.showToast(err?.erro || 'Erro ao cadastrar compra.', 'error');
    }
  });

  document.getElementById('compras-body')?.addEventListener('click', async (event) => {
    const deleteId = event.target.dataset.delete;
    if (deleteId) {
      try {
        await API.delete(`/compras/${deleteId}`);
        App.showToast('Compra excluida com sucesso.', 'warning');
        renderTable();
      } catch (err) {
        App.showToast(err?.erro || 'Erro ao excluir compra.', 'error');
      }
    }
  });

  await carregarIngredientes();
  resetForm();
  renderTable();
});
