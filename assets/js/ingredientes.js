document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'ingredientes') return;

  const form = document.getElementById('ingrediente-form');
  const idInput = document.getElementById('ingrediente-id');
  const overlay = document.getElementById('ingrediente-modal-overlay');
  const modalTitulo = document.getElementById('modal-titulo-ingrediente');

  function abrirModal(titulo = 'Novo ingrediente') {
    modalTitulo.textContent = titulo;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function fecharModal() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    form.reset();
    idInput.value = '';
  }

  document.getElementById('btn-novo-ingrediente')?.addEventListener('click', () => {
    fecharModal();
    abrirModal('Novo ingrediente');
  });

  document.getElementById('fechar-modal-ingrediente')?.addEventListener('click', fecharModal);
  document.getElementById('cancelar-edicao-ingrediente')?.addEventListener('click', fecharModal);
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) fecharModal(); });

  async function renderTable() {
    const tbody = document.getElementById('ingredientes-body');
    try {
      const { data: lista, error } = await db.from('ingredientes').select('*').order('nome');
      if (error) throw error;
      tbody.innerHTML = lista.length ? lista.map((item) => {
        const status = App.calcularStatus(item);
        return `
          <tr class="${status.status === 'critico' ? 'table-row-critical' : ''}">
            <td>${App.escapeHtml(item.nome)}</td>
            <td>${App.escapeHtml(item.unidade)}</td>
            <td>${Number(item.estoque_atual).toFixed(3)}</td>
            <td>${Number(item.estoque_minimo).toFixed(3)}</td>
            <td>${App.formatCurrency(item.preco_compra)}</td>
            <td><span class="badge ${status.className}">${status.label}</span></td>
            <td>
              <div class="actions">
                <button class="btn btn-secondary" data-edit="${item.id}">Editar</button>
                <button class="btn btn-danger" data-delete="${item.id}">Excluir</button>
              </div>
            </td>
          </tr>
        `;
      }).join('') : '<tr><td colspan="7" class="empty-state">Nenhum ingrediente cadastrado.</td></tr>';
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Erro ao carregar ingredientes.</td></tr>';
      App.showToast('Erro ao carregar ingredientes.', 'error');
    }
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = idInput.value;
    const payload = {
      nome: document.getElementById('ingrediente-nome').value.trim(),
      unidade: document.getElementById('ingrediente-unidade').value,
      preco_compra: Number(document.getElementById('ingrediente-preco').value),
      estoque_atual: Number(document.getElementById('ingrediente-estoque-atual').value),
      estoque_minimo: Number(document.getElementById('ingrediente-estoque-minimo').value)
    };

    try {
      if (id) {
        const { error } = await db.from('ingredientes').update(payload).eq('id', id);
        if (error) throw error;
        App.showToast('Ingrediente atualizado com sucesso.');
      } else {
        const { error } = await db.from('ingredientes').insert(payload);
        if (error) throw error;
        App.showToast('Ingrediente cadastrado com sucesso.');
      }
      fecharModal();
      renderTable();
    } catch (err) {
      App.showToast(err?.message || 'Erro ao salvar ingrediente.', 'error');
    }
  });

  document.getElementById('ingredientes-body')?.addEventListener('click', async (event) => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      try {
        const { data: item, error } = await db.from('ingredientes').select('*').eq('id', editId).single();
        if (error) throw error;
        idInput.value = item.id;
        document.getElementById('ingrediente-nome').value = item.nome;
        document.getElementById('ingrediente-unidade').value = item.unidade;
        document.getElementById('ingrediente-preco').value = item.preco_compra;
        document.getElementById('ingrediente-estoque-atual').value = item.estoque_atual;
        document.getElementById('ingrediente-estoque-minimo').value = item.estoque_minimo;
        abrirModal('Editar ingrediente');
      } catch (err) {
        App.showToast('Erro ao carregar ingrediente.', 'error');
      }
    }

    if (deleteId) {
      const confirmado = await App.confirmar('Excluir este ingrediente? Esta acao nao pode ser desfeita.');
      if (!confirmado) return;
      App.setLoading(event.target, true);
      try {
        const { error } = await db.from('ingredientes').delete().eq('id', deleteId);
        if (error) throw error;
        App.showToast('Ingrediente excluido com sucesso.', 'warning');
        renderTable();
      } catch (err) {
        App.showToast(err?.message || 'Erro ao excluir ingrediente.', 'error');
        App.setLoading(event.target, false);
      }
    }
  });

  renderTable();
});
