document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'produtos') return;

  const form = document.getElementById('produto-form');
  const idInput = document.getElementById('produto-id');
  let ingredientesCache = [];
  let listaCache = [];

  // ── Ingredientes ───────────────────────────────────────────────
  async function carregarIngredientes() {
    const { data } = await db.from('ingredientes').select('id, nome, unidade').order('nome');
    ingredientesCache = data || [];
  }

  // ── Ficha Técnica (form) ────────────────────────────────────────
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

  // ── Renderização das linhas ────────────────────────────────────
  function renderRows(lista) {
    const tbody = document.getElementById('produtos-body');
    const colspan = 5;

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">Nenhum produto encontrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map((item) => {
      const ficha = item.ficha_tecnica || [];
      const custo = ficha.reduce((acc, f) => acc + (Number(f.ingredientes?.preco_compra || 0) * Number(f.quantidade)), 0);
      const margem = item.preco_venda > 0 ? ((item.preco_venda - custo) / item.preco_venda * 100).toFixed(1) : 0;
      const categoriaSlug = (() => {
        if (!item.categoria) return '';
        const norm = item.categoria
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase().trim().replace(/\s+/g, '-');
        const map = {
          'pasteis-salgados': 'categoria-pastis-salgados',
          'pasteis-doces':    'categoria-pastis-doces',
          'porcoes':          'categoria-porcoes',
          'misto-quente':     'categoria-misto-quente',
          'bebidas':          'categoria-bebidas',
        };
        return map[norm] || '';
      })();

      const fichaRows = ficha.map((f) => {
        const custoItem = Number(f.ingredientes?.preco_compra || 0) * Number(f.quantidade);
        return `
          <tr class="ficha-detalhe-row">
            <td>${App.escapeHtml(f.ingredientes?.nome || '-')}</td>
            <td>${App.escapeHtml(f.ingredientes?.unidade || '-')}</td>
            <td>${parseFloat(Number(f.quantidade).toFixed(3))}</td>
            <td>${App.formatCurrency(f.ingredientes?.preco_compra || 0)}</td>
            <td>${App.formatCurrency(custoItem)}</td>
          </tr>
        `;
      }).join('');

      return `
        <tr>
          <td>${App.escapeHtml(item.nome)}</td>
          <td><span class="badge categoria-badge categoria-${categoriaSlug}">${App.escapeHtml(item.categoria || '—')}</span></td>
          <td>${App.formatCurrency(item.preco_venda)}</td>
          <td><span class="badge ${item.ativo ? 'normal' : 'danger'}">${item.ativo ? 'Ativo' : 'Inativo'}</span></td>
          <td>
            <div class="actions">
              <button class="btn btn-secondary" data-edit="${item.id}">Editar</button>
              <button class="btn btn-danger" data-delete="${item.id}">Inativar</button>
              <button class="btn btn-secondary btn-icon" data-toggle-ficha="${item.id}" title="Ver ficha tecnica">&#9776;</button>
            </div>
          </td>
        </tr>
        <tr class="ficha-detalhe-panel" id="ficha-${item.id}" style="display:none;">
          <td colspan="${colspan}">
            <div class="ficha-detalhe-container">
              <table class="ficha-detalhe-table">
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Unidade</th>
                    <th>Quantidade</th>
                    <th>Custo unit.</th>
                    <th>Custo total</th>
                  </tr>
                </thead>
                <tbody>
                  ${fichaRows || `<tr><td colspan="5" class="empty-state">Sem ingredientes cadastrados.</td></tr>`}
                </tbody>
                <tfoot>
                  <tr class="ficha-detalhe-footer">
                    <td colspan="3"><strong>Custo total do produto</strong></td>
                    <td><strong>${App.formatCurrency(custo)}</strong></td>
                    <td><strong class="metric-positive">Margem: ${margem}%</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ── Filtros ────────────────────────────────────────────────────
  function getChecked(containerSelector) {
    return [...document.querySelectorAll(`${containerSelector} input:checked`)].map((el) => el.value);
  }

  function atualizarContador(countId, valores) {
    const el = document.getElementById(countId);
    if (!el) return;
    el.textContent = valores.length ? `(${valores.length})` : '';
  }

  function aplicarFiltros() {
    const nome = document.getElementById('filtro-nome').value.toLowerCase().trim();
    const ingrediente = document.getElementById('filtro-ingrediente').value.toLowerCase().trim();
    const categorias = getChecked('#filtro-categoria-opts');
    const statuses = getChecked('#filtro-status-opts');

    atualizarContador('count-categoria', categorias);
    atualizarContador('count-status', statuses);

    let filtrado = listaCache;
    if (nome) filtrado = filtrado.filter((i) => i.nome.toLowerCase().includes(nome));
    if (categorias.length) filtrado = filtrado.filter((i) => categorias.includes(i.categoria || ''));
    if (statuses.length) filtrado = filtrado.filter((i) => statuses.includes(i.ativo ? 'ativo' : 'inativo'));
    if (ingrediente) filtrado = filtrado.filter((i) =>
      (i.ficha_tecnica || []).some((f) => f.ingredientes?.nome.toLowerCase().includes(ingrediente))
    );

    renderRows(filtrado);
  }

  // Multi-select toggle
  document.querySelectorAll('.multi-select-wrap').forEach((wrap) => {
    const btn = wrap.querySelector('.filter-btn');
    const opts = wrap.querySelector('.multi-select-opts');
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const aberto = opts.classList.contains('open');
      document.querySelectorAll('.multi-select-opts.open').forEach((el) => el.classList.remove('open'));
      if (!aberto) opts.classList.add('open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.multi-select-opts.open').forEach((el) => el.classList.remove('open'));
  });

  document.getElementById('filtro-nome')?.addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-ingrediente')?.addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-categoria-opts')?.addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-status-opts')?.addEventListener('change', aplicarFiltros);
  document.getElementById('limpar-filtros')?.addEventListener('click', () => {
    document.getElementById('filtro-nome').value = '';
    document.getElementById('filtro-ingrediente').value = '';
    document.querySelectorAll('#filtro-categoria-opts input, #filtro-status-opts input').forEach((el) => { el.checked = false; });
    atualizarContador('count-categoria', []);
    atualizarContador('count-status', []);
    renderRows(listaCache);
  });

  // ── Carregar dados ─────────────────────────────────────────────
  async function carregarProdutos() {
    const tbody = document.getElementById('produtos-body');
    const { data: lista, error } = await db
      .from('produtos')
      .select('id, nome, preco_venda, ativo, categoria, ficha_tecnica(id, quantidade, ingredientes(id, nome, unidade, preco_compra))')
      .order('categoria')
      .order('nome');

    if (error) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Erro ao carregar produtos.</td></tr>';
      App.showToast('Erro ao carregar produtos.', 'error');
      return;
    }

    listaCache = lista || [];
    aplicarFiltros();
  }

  // ── Modal ──────────────────────────────────────────────────────
  const overlay = document.getElementById('produto-modal-overlay');
  const modalTitulo = document.getElementById('modal-titulo');

  function abrirModal(titulo = 'Novo produto') {
    modalTitulo.textContent = titulo;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function fecharModal() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    form.reset();
    idInput.value = '';
    renderFichaTecnica([]);
  }

  document.getElementById('btn-novo-produto')?.addEventListener('click', () => {
    fecharModal();
    abrirModal('Novo produto');
  });
  document.getElementById('fechar-modal')?.addEventListener('click', fecharModal);
  document.getElementById('cancelar-edicao-produto')?.addEventListener('click', fecharModal);
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) fecharModal(); });

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

  // ── Salvar ─────────────────────────────────────────────────────
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = idInput.value;
    const nome = document.getElementById('produto-nome').value.trim();
    const categoria = document.getElementById('produto-categoria').value;
    const preco_venda = Number(document.getElementById('produto-preco').value);
    const ficha = getFichaTecnica();

    try {
      let produtoId = id;

      if (id) {
        const { error } = await db.from('produtos').update({ nome, categoria, preco_venda }).eq('id', id);
        if (error) throw error;
        await db.from('ficha_tecnica').delete().eq('produto_id', id);
      } else {
        const { data, error } = await db.from('produtos').insert({ nome, categoria, preco_venda }).select('id').single();
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
      fecharModal();
      carregarProdutos();
    } catch (err) {
      App.showToast(err?.message || 'Erro ao salvar produto.', 'error');
    }
  });

  // ── Ações da tabela ────────────────────────────────────────────
  document.getElementById('produtos-body')?.addEventListener('click', async (event) => {
    const toggleId = event.target.dataset.toggleFicha;
    if (toggleId) {
      const panel = document.getElementById(`ficha-${toggleId}`);
      if (panel) {
        const visible = panel.style.display !== 'none';
        panel.style.display = visible ? 'none' : 'table-row';
        event.target.style.background = visible ? '' : 'var(--primary)';
        event.target.style.color = visible ? '' : '#fff';
      }
      return;
    }

    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      const { data: item } = await db
        .from('produtos')
        .select('id, nome, preco_venda, categoria, ficha_tecnica(quantidade, ingrediente_id)')
        .eq('id', editId)
        .single();
      if (!item) return;
      idInput.value = item.id;
      document.getElementById('produto-nome').value = item.nome;
      document.getElementById('produto-categoria').value = item.categoria || '';
      document.getElementById('produto-preco').value = item.preco_venda;
      renderFichaTecnica(item.ficha_tecnica || []);
      abrirModal('Editar produto');
    }

    if (deleteId) {
      const confirmado = await App.confirmar('Inativar este produto? Ele nao aparecera mais no PDV.');
      if (!confirmado) return;
      App.setLoading(event.target, true);
      const { error } = await db.from('produtos').update({ ativo: false }).eq('id', deleteId);
      if (error) {
        App.showToast('Erro ao inativar produto.', 'error');
        App.setLoading(event.target, false);
        return;
      }
      App.showToast('Produto inativado com sucesso.', 'warning');
      carregarProdutos();
    }
  });

  // ── Init ───────────────────────────────────────────────────────
  await carregarIngredientes();
  renderFichaTecnica([]);
  carregarProdutos();
});
