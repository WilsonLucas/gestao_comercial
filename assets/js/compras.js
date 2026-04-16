document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'compras') return;

  const form = document.getElementById('compra-form');
  const totalDisplay = document.getElementById('total-compra');
  const quantityInput = document.getElementById('quantidade-compra');
  const priceInput = document.getElementById('valor-compra');
  const ingredienteSelect = document.getElementById('ingrediente-id');
  const unidadeHint = document.getElementById('unidade-hint');
  const btnSalvar = form?.querySelector('button[type="submit"]');
  const isAdmin = App.getUsuario()?.perfil === 'administrador';
  let ingredientesCache = [];
  let comprasCache = [];

  // Mostrar coluna Acoes e cabecalho apenas para admin
  if (isAdmin) {
    const thAcoes = document.getElementById('th-acoes');
    if (thAcoes) thAcoes.style.display = '';
  }

  const updateTotal = () => {
    const total = (Number(quantityInput?.value) || 0) * (Number(priceInput?.value) || 0);
    if (totalDisplay) totalDisplay.textContent = App.formatCurrency(total);
  };

  [quantityInput, priceInput].forEach((input) => input?.addEventListener('input', updateTotal));

  // Atualizar hint de unidade ao selecionar ingrediente
  ingredienteSelect?.addEventListener('change', () => {
    const selecionado = ingredientesCache.find((i) => i.id === ingredienteSelect.value);
    if (unidadeHint) unidadeHint.textContent = selecionado ? `(${selecionado.unidade})` : '';
  });

  async function carregarIngredientes() {
    const { data } = await db.from('ingredientes').select('id, nome, unidade').eq('ativo', true).order('nome');
    ingredientesCache = data || [];
    if (ingredienteSelect) {
      ingredienteSelect.innerHTML = '<option value="">Selecione...</option>' +
        ingredientesCache.map((i) => `<option value="${i.id}">${App.escapeHtml(i.nome)} (${App.escapeHtml(i.unidade)})</option>`).join('');
    }
  }

  function aplicarFiltrosTabela() {
    const termoBusca = (document.getElementById('filtro-compra-ingrediente')?.value || '').toLowerCase().trim();
    const mes = document.getElementById('filtro-compra-mes')?.value || '';

    let filtrado = comprasCache;
    if (termoBusca) filtrado = filtrado.filter((c) => (c.ingredientes?.nome || '').toLowerCase().includes(termoBusca));
    if (mes) filtrado = filtrado.filter((c) => c.data?.startsWith(mes));

    renderRows(filtrado);
  }

  function renderRows(lista) {
    const tbody = document.getElementById('compras-body');
    const totalPeriodo = document.getElementById('compras-total-periodo');
    const colspan = isAdmin ? 7 : 6;

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">Nenhuma compra encontrada.</td></tr>`;
      if (totalPeriodo) totalPeriodo.textContent = '';
      return;
    }

    tbody.innerHTML = lista.map((item) => `
      <tr>
        <td>${App.formatDate(item.data)}</td>
        <td>${App.escapeHtml(item.ingredientes?.nome || '-')}</td>
        <td>${App.escapeHtml(item.ingredientes?.unidade || '-')}</td>
        <td>${parseFloat(Number(item.quantidade).toFixed(3))}</td>
        <td>${App.formatCurrency(item.valor_unitario)}</td>
        <td><strong>${App.formatCurrency(item.total)}</strong></td>
        ${isAdmin ? `<td><button class="btn btn-danger btn-sm" data-delete="${item.id}">Excluir</button></td>` : ''}
      </tr>
    `).join('');

    if (totalPeriodo) {
      const soma = lista.reduce((acc, c) => acc + Number(c.total || 0), 0);
      totalPeriodo.textContent = `Total do periodo: ${App.formatCurrency(soma)} (${lista.length} ${lista.length === 1 ? 'compra' : 'compras'})`;
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

    comprasCache = lista || [];
    aplicarFiltrosTabela();
  }

  function resetForm() {
    form?.reset();
    const dataInput = document.getElementById('data-compra');
    if (dataInput) dataInput.value = App.today();
    if (unidadeHint) unidadeHint.textContent = '';
    updateTotal();
  }

  // Filtros
  document.getElementById('filtro-compra-ingrediente')?.addEventListener('input', aplicarFiltrosTabela);
  document.getElementById('filtro-compra-mes')?.addEventListener('change', aplicarFiltrosTabela);

  // Registro de compra — RPC atomica
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

  // Exclusao — apenas admin (RPC atomica)
  document.getElementById('compras-body')?.addEventListener('click', async (event) => {
    const deleteId = event.target.dataset.delete;
    if (!deleteId) return;

    const confirmado = await App.confirmar('Excluir esta compra? O estoque do ingrediente sera revertido.');
    if (!confirmado) return;

    App.setLoading(event.target, true);
    try {
      const { data: result, error } = await db.rpc('excluir_compra', { p_compra_id: deleteId, p_chamador_id: App.getUsuario()?.id });
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
