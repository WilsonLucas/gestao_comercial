document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'ingredientes') return;

  const form = document.getElementById('ingrediente-form');
  const idInput = document.getElementById('ingrediente-id');
  const overlay = document.getElementById('ingrediente-modal-overlay');
  const modalTitulo = document.getElementById('modal-titulo-ingrediente');
  const filtroAtivoSelect = document.getElementById('filtro-ingrediente-ativo');

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

  filtroAtivoSelect?.addEventListener('change', renderTable);

  async function renderTable() {
    const tbody = document.getElementById('ingredientes-body');
    const filtro = filtroAtivoSelect?.value || 'ativos';
    try {
      let query = db.from('ingredientes').select('*').order('nome');
      if (filtro === 'ativos')   query = query.eq('ativo', true);
      if (filtro === 'inativos') query = query.eq('ativo', false);

      const { data: lista, error } = await query;
      if (error) throw error;
      tbody.innerHTML = lista.length ? lista.map((item) => {
        const status = App.calcularStatus(item);
        const situacao = item.ativo
          ? '<span class="badge normal">Ativo</span>'
          : '<span class="badge danger">Inativo</span>';
        const botaoEstado = item.ativo
          ? `<button class="btn btn-danger" data-inativar="${item.id}">Inativar</button>`
          : `<button class="btn btn-secondary" data-reativar="${item.id}">Reativar</button>`;
        return `
          <tr class="${status.status === 'critico' && item.ativo ? 'table-row-critical' : ''} ${!item.ativo ? 'table-row-inactive' : ''}">
            <td>${App.escapeHtml(item.nome)}</td>
            <td>${App.escapeHtml(item.unidade)}</td>
            <td>${parseFloat(Number(item.estoque_atual).toFixed(3))}</td>
            <td>${parseFloat(Number(item.estoque_minimo).toFixed(3))}</td>
            <td>${App.formatCurrency(item.preco_compra)}</td>
            <td><span class="badge ${status.className}">${status.label}</span></td>
            <td>${situacao}</td>
            <td>
              <div class="actions">
                <button class="btn btn-secondary" data-edit="${item.id}">Editar</button>
                ${botaoEstado}
              </div>
            </td>
          </tr>
        `;
      }).join('') : '<tr><td colspan="8" class="empty-state">Nenhum ingrediente encontrado com este filtro.</td></tr>';
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Erro ao carregar ingredientes.</td></tr>';
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
    const editId     = event.target.dataset.edit;
    const inativarId = event.target.dataset.inativar;
    const reativarId = event.target.dataset.reativar;

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

    if (inativarId) {
      const confirmado = await App.confirmar('Inativar este ingrediente? Ele deixara de aparecer no PDV, nas fichas tecnicas novas, na lista de compras e nos alertas. O historico de vendas e compras e preservado. Voce pode reativa-lo depois.');
      if (!confirmado) return;
      App.setLoading(event.target, true);
      try {
        const { error } = await db.from('ingredientes').update({ ativo: false }).eq('id', inativarId);
        if (error) throw error;
        App.showToast('Ingrediente inativado.', 'warning');
        renderTable();
      } catch (err) {
        App.showToast(err?.message || 'Erro ao inativar ingrediente.', 'error');
        App.setLoading(event.target, false);
      }
    }

    if (reativarId) {
      const confirmado = await App.confirmar('Reativar este ingrediente? Ele voltara a aparecer nas listas de selecao.');
      if (!confirmado) return;
      App.setLoading(event.target, true);
      try {
        const { error } = await db.from('ingredientes').update({ ativo: true }).eq('id', reativarId);
        if (error) throw error;
        App.showToast('Ingrediente reativado.', 'success');
        renderTable();
      } catch (err) {
        App.showToast(err?.message || 'Erro ao reativar ingrediente.', 'error');
        App.setLoading(event.target, false);
      }
    }
  });

  renderTable();
});
