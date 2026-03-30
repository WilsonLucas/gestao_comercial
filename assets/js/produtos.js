document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'produtos') return;

  const form = document.getElementById('produto-form');
  const idInput = document.getElementById('produto-id');
  let ingredientesCache = [];

  async function carregarIngredientes() {
    try {
      ingredientesCache = await API.get('/ingredientes');
      return ingredientesCache;
    } catch {
      return [];
    }
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
    try {
      const lista = await API.get('/produtos');
      tbody.innerHTML = lista.length ? lista.map((item) => `
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
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Erro ao carregar produtos.</td></tr>';
      App.showToast(err?.erro || 'Erro ao carregar produtos.', 'error');
    }
  }

  function resetForm() {
    form.reset();
    idInput.value = '';
    renderFichaTecnica([]);
  }

  document.getElementById('adicionar-ingrediente')?.addEventListener('click', () => {
    const ficha = getFichaTecnica();
    const primeiroIngrediente = ingredientesCache[0];
    ficha.push({ ingrediente_id: primeiroIngrediente?.id || '', quantidade: 1 });
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
    const payload = {
      nome: document.getElementById('produto-nome').value.trim(),
      preco_venda: Number(document.getElementById('produto-preco').value),
      ficha_tecnica: getFichaTecnica()
    };

    try {
      if (id) {
        await API.put(`/produtos/${id}`, payload);
        App.showToast('Produto atualizado com sucesso.');
      } else {
        await API.post('/produtos', payload);
        App.showToast('Produto cadastrado com sucesso.');
      }
      resetForm();
      renderTable();
    } catch (err) {
      App.showToast(err?.erro || 'Erro ao salvar produto.', 'error');
    }
  });

  document.getElementById('produtos-body')?.addEventListener('click', async (event) => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      try {
        const lista = await API.get('/produtos');
        const item = lista.find((p) => p.id === editId);
        if (!item) return;
        idInput.value = item.id;
        document.getElementById('produto-nome').value = item.nome;
        document.getElementById('produto-preco').value = item.preco_venda;
        renderFichaTecnica(item.ficha_tecnica || []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        App.showToast('Erro ao carregar produto.', 'error');
      }
    }

    if (deleteId) {
      try {
        await API.delete(`/produtos/${deleteId}`);
        App.showToast('Produto inativado com sucesso.', 'warning');
        renderTable();
      } catch (err) {
        App.showToast(err?.erro || 'Erro ao inativar produto.', 'error');
      }
    }
  });

  document.getElementById('cancelar-edicao-produto')?.addEventListener('click', resetForm);

  await carregarIngredientes();
  renderFichaTecnica([]);
  renderTable();
});
