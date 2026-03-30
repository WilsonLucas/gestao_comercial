document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'produtos') return;

  const form = document.getElementById('produto-form');
  const idInput = document.getElementById('produto-id');
  let ingredientesCache = [];

  async function carregarIngredientes() {
    const { data } = await db.from('ingredientes').select('id, nome, unidade').order('nome');
    ingredientesCache = data || [];
    return ingredientesCache;
  }

  function renderFichaTecnica(ficha = []) {
    const container = document.getElementById('ficha-tecnica-lista');
    if (!container) return;
    container.innerHTML = ficha.map((item, idx) => `
      <div class="ficha-item" data-idx="${idx}">
        <select name="ingrediente_id" class="ficha-ingrediente">
          ${ingredientesCache.map((i) => `<option value="${i.id}" ${i.id === item.ingrediente_id ? 'selected' : ''}>${i.nome} (${i.unidade})</option>`).join('')}
        </select>
        <input type="number" name="quantidade" class="ficha-quantidade" value="${item.quantidade}" min="0.001" step="0.001" placeholder="Quantidade">
        <button type="button" class="btn btn-danger btn-sm" data-remove-ficha="${idx}">Remover</button>
      </div>
    `).join('');
  }

  function getFichaTecnica() {
    const container = document.getElementById('ficha-tecnica-lista');
    if (!container) return [];
    return Array.from(container.querySelectorAll('.ficha-item')).map((el) => ({
      ingrediente_id: el.querySelector('.ficha-ingrediente').value,
      quantidade: Number(el.querySelector('.ficha-quantidade').value)
    }));
  }

  async function renderTable() {
    const tbody = document.getElementById('produtos-body');
    const { data: lista, error } = await db
      .from('produtos')
      .select('id, nome, preco_venda, ativo, ficha_tecnica(id, quantidade, ingredientes(id, nome, unidade, preco_compra))')
      .order('nome');

    if (error) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Erro ao carregar produtos.</td></tr>';
      App.showToast('Erro ao carregar produtos.', 'error');
      return;
    }

    tbody.innerHTML = (lista || []).length ? (lista || []).map((item) => `
      <tr>
        <td>${item.nome}</td>
        <td>${App.formatCurrency(item.preco_venda)}</td>
        <td>${(item.ficha_tecnica || []).length} ingrediente(s)</td>
        <td><span class="badge ${item.ativo ? 'normal' : 'danger'}">${item.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td>
          <div class="actions">
            <button class="btn btn-secondary" data-edit="${item.id}">Editar</button>
            <button class="btn btn-danger" data-delete="${item.id}">Inativar</button>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="5" class="empty-state">Nenhum produto cadastrado.</td></tr>';
  }

  function resetForm() {
    form.reset();
    idInput.value = '';
    renderFichaTecnica([]);
  }

  document.getElementById('adicionar-ingrediente')?.addEventListener('click', () => {
    const ficha = getFichaTecnica();
    ficha.push({ ingrediente_id: ingredientesCache[0]?.id || '', quantidade: 1 });
    renderFichaTecnica(ficha);
  });

  document.getElementById('ficha-tecnica-lista')?.addEventListener('click', (event) => {
    const removeIdx = event.target.dataset.removeFicha;
    if (removeIdx != null) {
      const ficha = getFichaTecnica();
      ficha.splice(Number(removeIdx), 1);
      renderFichaTecnica(ficha);
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = idInput.value;
    const nome = document.getElementById('produto-nome').value.trim();
    const preco_venda = Number(document.getElementById('produto-preco').value);
    const ficha = getFichaTecnica();

    try {
      let produtoId = id;

      if (id) {
        const { error } = await db.from('produtos').update({ nome, preco_venda }).eq('id', id);
        if (error) throw error;
        await db.from('ficha_tecnica').delete().eq('produto_id', id);
      } else {
        const { data, error } = await db.from('produtos').insert({ nome, preco_venda }).select('id').single();
        if (error) throw error;
        produtoId = data.id;
      }

      if (ficha.length > 0) {
        const { error } = await db.from('ficha_tecnica').insert(
          ficha.map((f) => ({ produto_id: produtoId, ingrediente_id: f.ingrediente_id, quantidade: f.quantidade }))
        );
        if (error) throw error;
      }

      App.showToast(id ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.');
      resetForm();
      renderTable();
    } catch (err) {
      App.showToast(err?.message || 'Erro ao salvar produto.', 'error');
    }
  });

  document.getElementById('produtos-body')?.addEventListener('click', async (event) => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      const { data: item } = await db
        .from('produtos')
        .select('id, nome, preco_venda, ficha_tecnica(quantidade, ingrediente_id)')
        .eq('id', editId)
        .single();
      if (!item) return;
      idInput.value = item.id;
      document.getElementById('produto-nome').value = item.nome;
      document.getElementById('produto-preco').value = item.preco_venda;
      renderFichaTecnica(item.ficha_tecnica || []);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (deleteId) {
      const { error } = await db.from('produtos').update({ ativo: false }).eq('id', deleteId);
      if (error) { App.showToast('Erro ao inativar produto.', 'error'); return; }
      App.showToast('Produto inativado com sucesso.', 'warning');
      renderTable();
    }
  });

  document.getElementById('cancelar-edicao-produto')?.addEventListener('click', resetForm);

  await carregarIngredientes();
  renderFichaTecnica([]);
  renderTable();
});
