document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'compras') return;

  const form = document.getElementById('compra-form');
  const totalInput = document.getElementById('total-compra');
  const quantityInput = document.getElementById('quantidade-compra');
  const priceInput = document.getElementById('valor-compra');
  const ingredienteSelect = document.getElementById('ingrediente-id');
  const btnSalvar = form?.querySelector('button[type="submit"]');
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
        ingredientesCache.map((i) => `<option value="${i.id}">${App.escapeHtml(i.nome)} (${App.escapeHtml(i.unidade)})</option>`).join('');
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
        <td>${App.escapeHtml(item.ingredientes?.nome || '-')}</td>
        <td>${App.escapeHtml(item.ingredientes?.unidade || '-')}</td>
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

  // Registro de compra — usa RPC atomica (substitui 2 chamadas separadas)
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const ingrediente_id = ingredienteSelect?.value;
    const quantidade = Number(quantityInput?.value);
    const valor_unitario = Number(priceInput?.value);
    const data = document.getElementById('data-compra')?.value;
    const user = App.getUsuario();

    if (!ingrediente_id) { App.showToast('Selecione um ingrediente.', 'error'); return; }
    if (!quantidade || quantidade <= 0) { App.showToast('Quantidade deve ser maior que zero.', 'error'); return; }
    if (!valor_unitario || valor_unitario <= 0) { App.showToast('Valor unitario deve ser maior que zero.', 'error'); return; }

    App.setLoading(btnSalvar, true);
    try {
      // RPC atomica: INSERT compra + UPDATE estoque em uma transacao
      const { data: result, error } = await db.rpc('registrar_compra', {
        p_ingrediente_id: ingrediente_id,
        p_quantidade: quantidade,
        p_valor_unitario: valor_unitario,
        p_data: data,
        p_criado_por: user?.id || null
      });

      if (error || result?.erro) throw new Error(result?.erro || error?.message || 'Erro ao registrar compra.');

      App.showToast('Compra cadastrada com sucesso.');
      resetForm();
      renderTable();
    } catch (err) {
      App.showToast(err?.message || 'Erro ao cadastrar compra.', 'error');
    } finally {
      App.setLoading(btnSalvar, false);
    }
  });

  // Exclusao de compra — usa RPC atomica (substitui 2 chamadas separadas)
  document.getElementById('compras-body')?.addEventListener('click', async (event) => {
    const deleteId = event.target.dataset.delete;
    if (!deleteId) return;

    const confirmado = await App.confirmar('Excluir esta compra? O estoque do ingrediente sera revertido.');
    if (!confirmado) return;

    App.setLoading(event.target, true);
    try {
      const { data: result, error } = await db.rpc('excluir_compra', { p_compra_id: deleteId });
      if (error || result?.erro) throw new Error(result?.erro || error?.message || 'Erro ao excluir compra.');

      App.showToast('Compra excluida com sucesso.', 'warning');
      renderTable();
    } catch (err) {
      App.showToast(err?.message || 'Erro ao excluir compra.', 'error');
      App.setLoading(event.target, false);
    }
  });

  await carregarIngredientes();
  resetForm();
  renderTable();
});
