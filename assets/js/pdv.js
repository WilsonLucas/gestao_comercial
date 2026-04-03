document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'pdv') return;

  let carrinho = [];
  let produtosCache = [];
  let categoriaAtiva = '';

  // ── Carregar produtos com ficha tecnica para calcular disponibilidade ─
  async function carregarProdutos() {
    const { data } = await db
      .from('produtos')
      .select('id, nome, preco_venda, categoria, ficha_tecnica(quantidade, ingredientes(estoque_atual))')
      .eq('ativo', true)
      .order('categoria')
      .order('nome');
    produtosCache = (data || []).map((p) => ({
      ...p,
      disponivel: calcularDisponivel(p),
    }));
  }

  // Calcula quantas unidades do produto podem ser feitas com o estoque atual
  function calcularDisponivel(produto) {
    const ficha = produto.ficha_tecnica || [];
    if (!ficha.length) return null; // sem ficha: sem restricao de estoque
    const mins = ficha.map((f) => {
      const estoque = Number(f.ingredientes?.estoque_atual ?? 0);
      const qtd = Number(f.quantidade);
      return qtd > 0 ? Math.floor(estoque / qtd) : Infinity;
    });
    return Math.min(...mins);
  }

  // ── Categorias ────────────────────────────────────────────────────
  function renderCategorias() {
    const nav = document.getElementById('pdv-categorias');
    if (!nav) return;

    const cats = ['Todos', ...new Set(produtosCache.map((p) => p.categoria).filter(Boolean))];

    nav.innerHTML = cats.map((cat) => `
      <button
        class="pdv-cat-btn ${(cat === 'Todos' ? categoriaAtiva === '' : categoriaAtiva === cat) ? 'active' : ''}"
        data-cat="${cat === 'Todos' ? '' : App.escapeHtml(cat)}">
        ${App.escapeHtml(cat)}
      </button>
    `).join('');
  }

  // ── Grade de produtos ─────────────────────────────────────────────
  function renderProdutos() {
    const grid = document.getElementById('pdv-produtos-grid');
    if (!grid) return;

    const filtrado = categoriaAtiva
      ? produtosCache.filter((p) => p.categoria === categoriaAtiva)
      : produtosCache;

    if (!filtrado.length) {
      grid.innerHTML = '<p class="empty-state" style="grid-column:1/-1">Nenhum produto nesta categoria.</p>';
      return;
    }

    grid.innerHTML = filtrado.map((p) => {
      const esgotado = p.disponivel !== null && p.disponivel === 0;
      const poucoEstoque = p.disponivel !== null && p.disponivel > 0 && p.disponivel <= 5;
      return `
        <button class="pdv-card ${esgotado ? 'pdv-card-esgotado' : ''}"
          data-id="${p.id}" type="button" ${esgotado ? 'disabled' : ''}>
          ${poucoEstoque ? `<span class="pdv-badge-pouco">Pouco estoque</span>` : ''}
          ${esgotado ? `<span class="pdv-badge-esgotado">Indisponivel</span>` : ''}
          <span class="pdv-card-nome">${App.escapeHtml(p.nome)}</span>
          <span class="pdv-card-preco">${App.formatCurrency(p.preco_venda)}</span>
        </button>
      `;
    }).join('');
  }

  // ── Carrinho ──────────────────────────────────────────────────────
  function renderCarrinho() {
    const container = document.getElementById('pdv-carrinho-itens');
    const totalEl = document.getElementById('carrinho-total');
    if (!container) return;

    if (!carrinho.length) {
      container.innerHTML = '<p class="pdv-carrinho-vazio">Nenhum item adicionado.</p>';
      if (totalEl) totalEl.textContent = 'R$\u00a00,00';
      return;
    }

    container.innerHTML = carrinho.map((item, idx) => `
      <div class="pdv-cart-item">
        <div class="pdv-cart-item-nome">${App.escapeHtml(item.nome)}</div>
        <div class="pdv-cart-item-controles">
          <button class="pdv-qty-btn" data-dec="${idx}" type="button">&#8722;</button>
          <span class="pdv-qty-valor">${item.quantidade}</span>
          <button class="pdv-qty-btn" data-inc="${idx}" type="button">&#43;</button>
        </div>
        <div class="pdv-cart-item-preco">${App.formatCurrency(item.preco_venda * item.quantidade)}</div>
        <button class="pdv-cart-remove" data-remove="${idx}" type="button">&times;</button>
      </div>
    `).join('');

    const total = carrinho.reduce((s, i) => s + i.preco_venda * i.quantidade, 0);
    if (totalEl) totalEl.textContent = App.formatCurrency(total);
  }

  function adicionarAoCarrinho(produtoId) {
    const produto = produtosCache.find((p) => p.id === produtoId);
    if (!produto) return;
    const existente = carrinho.find((i) => i.produto_id === produtoId);
    if (existente) {
      existente.quantidade += 1;
    } else {
      carrinho.push({ produto_id: produto.id, nome: produto.nome, preco_venda: Number(produto.preco_venda), quantidade: 1 });
    }
    renderCarrinho();
  }

  // ── Eventos: categorias ───────────────────────────────────────────
  document.getElementById('pdv-categorias')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.pdv-cat-btn');
    if (!btn) return;
    categoriaAtiva = btn.dataset.cat;
    renderCategorias();
    renderProdutos();
  });

  // ── Eventos: adicionar produto ao clicar no card ──────────────────
  document.getElementById('pdv-produtos-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.pdv-card');
    if (!card) return;
    adicionarAoCarrinho(card.dataset.id);

    // Feedback visual rapido
    card.classList.add('pdv-card-added');
    setTimeout(() => card.classList.remove('pdv-card-added'), 300);
  });

  // ── Eventos: controles do carrinho ────────────────────────────────
  document.getElementById('pdv-carrinho-itens')?.addEventListener('click', (e) => {
    const inc = e.target.dataset.inc;
    const dec = e.target.dataset.dec;
    const rem = e.target.dataset.remove;

    if (inc != null) {
      carrinho[Number(inc)].quantidade += 1;
      renderCarrinho();
    }
    if (dec != null) {
      const idx = Number(dec);
      carrinho[idx].quantidade -= 1;
      if (carrinho[idx].quantidade <= 0) carrinho.splice(idx, 1);
      renderCarrinho();
    }
    if (rem != null) {
      carrinho.splice(Number(rem), 1);
      renderCarrinho();
    }
  });

  // ── Limpar carrinho ───────────────────────────────────────────────
  document.getElementById('pdv-limpar')?.addEventListener('click', () => {
    carrinho = [];
    renderCarrinho();
  });

  // ── Finalizar venda ───────────────────────────────────────────────
  const btnFinalizar = document.getElementById('pdv-finalizar');

  btnFinalizar?.addEventListener('click', async () => {
    if (!carrinho.length) {
      App.showToast('Adicione itens ao carrinho antes de finalizar.', 'error');
      return;
    }

    const total = carrinho.reduce((s, i) => s + i.preco_venda * i.quantidade, 0);
    const confirmado = await App.confirmar(`Confirmar venda de ${carrinho.length} item(s) — ${App.formatCurrency(total)}?`);
    if (!confirmado) return;

    const user = App.getUsuario();
    const itens = carrinho.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade }));

    App.setLoading(btnFinalizar, true);
    try {
      const { data, error } = await db.rpc('fechar_venda', {
        p_itens: itens,
        p_operador_id: user?.id
      });

      if (error || data?.erro) throw new Error(data?.erro || error?.message || 'Erro ao finalizar venda.');

      App.showToast(`Venda finalizada! Total: ${App.formatCurrency(data.total)}`);
      carrinho = [];
      renderCarrinho();
    } catch (err) {
      App.showToast(err?.message || 'Erro ao finalizar venda.', 'error');
    } finally {
      App.setLoading(btnFinalizar, false);
    }
  });

  // ── Init ──────────────────────────────────────────────────────────
  await carregarProdutos();
  renderCategorias();
  renderProdutos();
  renderCarrinho();
});
