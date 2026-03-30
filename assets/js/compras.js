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
    const { data } = await db.from('ingredientes').select('id, nome, unidade').order('nome');
    ingredientesCache = data || [];
    if (ingredienteSelect) {
      ingredienteSelect.innerHTML = '<option value="">Selecione o ingrediente</option>' +
        ingredientesCache.map((i) => `<option value="${i.id}">${i.nome} (${i.unidade})</option>`).join('');
    }
  }

  async function renderTable() {
    const tbody = document.getElementById('compras-body');
    const { data: lista, error } = await db
      .from('compras')
      .select('id, data, quantidade, valor_unitario, total, ingredientes(nome, unidade)')
      .order('data', { ascending: false });

    if (error) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Erro ao carregar compras.</td></tr>';
      App.showToast('Erro ao carregar compras.', 'error');
      return;
    }

    tbody.innerHTML = (lista || []).length ? (lista || []).map((item) => `
      <tr>
        <td>${App.formatDate(item.data)}</td>
        <td>${item.ingredientes?.nome || '-'}</td>
        <td>${item.ingredientes?.unidade || '-'}</td>
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
  }

  function resetForm() {
    form?.reset();
    const dataInput = document.getElementById('data-compra');
    if (dataInput) dataInput.value = App.today();
    updateTotal();
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const ingrediente_id = ingredienteSelect?.value;
    const quantidade = Number(quantityInput?.value);
    const valor_unitario = Number(priceInput?.value);
    const data = document.getElementById('data-compra')?.value;
    const user = App.getUsuario();

    if (!ingrediente_id) { App.showToast('Selecione um ingrediente.', 'error'); return; }

    try {
      const { error: errCompra } = await db.from('compras').insert({
        ingrediente_id, quantidade, valor_unitario, data, criado_por: user?.id
      });
      if (errCompra) throw errCompra;

      const { data: ing } = await db.from('ingredientes').select('estoque_atual').eq('id', ingrediente_id).single();
      const { error: errIng } = await db.from('ingredientes').update({
        estoque_atual: Number(ing.estoque_atual) + quantidade,
        preco_compra: valor_unitario,
        atualizado_em: new Date().toISOString()
      }).eq('id', ingrediente_id);
      if (errIng) throw errIng;

      App.showToast('Compra cadastrada com sucesso.');
      resetForm();
      renderTable();
    } catch (err) {
      App.showToast(err?.message || 'Erro ao cadastrar compra.', 'error');
    }
  });

  document.getElementById('compras-body')?.addEventListener('click', async (event) => {
    const deleteId = event.target.dataset.delete;
    if (!deleteId) return;

    const { data: compra } = await db.from('compras').select('ingrediente_id, quantidade').eq('id', deleteId).single();
    const { error } = await db.from('compras').delete().eq('id', deleteId);
    if (error) { App.showToast('Erro ao excluir compra.', 'error'); return; }

    if (compra) {
      const { data: ing } = await db.from('ingredientes').select('estoque_atual').eq('id', compra.ingrediente_id).single();
      await db.from('ingredientes').update({
        estoque_atual: Math.max(0, Number(ing.estoque_atual) - Number(compra.quantidade)),
        atualizado_em: new Date().toISOString()
      }).eq('id', compra.ingrediente_id);
    }

    App.showToast('Compra excluida com sucesso.', 'warning');
    renderTable();
  });

  await carregarIngredientes();
  resetForm();
  renderTable();
});
