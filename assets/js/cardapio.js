// ============================================================
// Painel Cardápio — v1.0
// Página pública, read-only, sem autenticação.
// Mostra produtos ativos com ficha técnica viável (estoque > 0),
// agrupados por categoria. Auto-refresh a cada 60s.
// ============================================================

(() => {
  if (document.body.dataset.page !== 'cardapio') return;

  const REFRESH_MS = 60_000;
  const ORDEM_CATEGORIAS = [
    'Pastéis Salgados',
    'Pastéis Doces',
    'Porções',
    'Misto Quente',
    'Bebidas',
  ];

  const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  // ── Segurança: escape de HTML (página pública → anon key no client) ──
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  function slugCategoria(categoria) {
    if (!categoria) return 'outros';
    const norm = categoria
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
    const map = {
      'pasteis-salgados': 'categoria-pastis-salgados',
      'pasteis-doces':    'categoria-pastis-doces',
      'porcoes':          'categoria-porcoes',
      'misto-quente':     'categoria-misto-quente',
      'bebidas':          'categoria-bebidas',
    };
    return map[norm] || 'categoria-outros';
  }

  // Disponibilidade = min(estoque_atual / quantidade) por ingrediente
  // Mesma lógica do PDV (assets/js/pdv.js:calcularDisponivel) — se um
  // produto não tem ficha técnica, consideramos disponível (não há como
  // aferir estoque, então assumimos venda livre). Produtos com ficha e
  // qualquer ingrediente zerado ficam de fora.
  function temEstoque(produto) {
    const ficha = produto.ficha_tecnica || [];
    if (!ficha.length) return true;
    return ficha.every((f) => {
      const qtd = Number(f.quantidade);
      if (!qtd || qtd <= 0) return true;
      const estoque = Number(f.ingredientes?.estoque_atual ?? 0);
      return estoque >= qtd;
    });
  }

  function ordenarCategorias(cats) {
    const known = ORDEM_CATEGORIAS.filter((c) => cats.includes(c));
    const extras = cats.filter((c) => !ORDEM_CATEGORIAS.includes(c)).sort();
    return [...known, ...extras];
  }

  function renderCardapio(produtos) {
    const container = document.getElementById('cardapio-conteudo');
    if (!container) return;

    const disponiveis = produtos.filter(temEstoque);

    if (!disponiveis.length) {
      container.innerHTML = '<p class="cardapio-vazio">Nenhum item disponível no momento.</p>';
      return;
    }

    const porCategoria = disponiveis.reduce((acc, p) => {
      const cat = p.categoria || 'Outros';
      (acc[cat] ||= []).push(p);
      return acc;
    }, {});

    const categorias = ordenarCategorias(Object.keys(porCategoria));

    container.innerHTML = categorias.map((cat) => {
      const itens = porCategoria[cat].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      const slug = slugCategoria(cat);
      return `
        <section class="cardapio-secao">
          <div class="cardapio-secao-header">
            <h2 class="cardapio-secao-titulo">${escapeHtml(cat)}</h2>
            <span class="cardapio-secao-badge ${slug}">${itens.length} ${itens.length === 1 ? 'item' : 'itens'}</span>
          </div>
          <ul class="cardapio-lista">
            ${itens.map((p) => `
              <li class="cardapio-item">
                <span class="cardapio-item-nome">${escapeHtml(p.nome)}</span>
                <span class="cardapio-item-dots" aria-hidden="true"></span>
                <span class="cardapio-item-preco">${currency.format(Number(p.preco_venda || 0))}</span>
              </li>
            `).join('')}
          </ul>
        </section>
      `;
    }).join('');
  }

  function atualizarStatus(ok, mensagem) {
    const el = document.getElementById('cardapio-status');
    if (!el) return;
    el.dataset.status = ok ? 'ok' : 'offline';
    const label = el.querySelector('.cardapio-status-label');
    if (label) label.textContent = mensagem;
  }

  async function carregar() {
    try {
      const { data, error } = await db
        .from('produtos')
        .select('id, nome, preco_venda, categoria, ficha_tecnica(quantidade, ingredientes(estoque_atual))')
        .eq('ativo', true)
        .order('categoria')
        .order('nome');

      if (error) throw error;

      renderCardapio(data || []);
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      atualizarStatus(true, `Atualizado às ${hora}`);
    } catch (err) {
      console.error('[cardapio] erro ao carregar produtos', err);
      atualizarStatus(false, 'Sem conexão');
      const container = document.getElementById('cardapio-conteudo');
      if (container && !container.children.length) {
        container.innerHTML = '<p class="cardapio-vazio">Erro ao carregar cardápio. Tentando novamente...</p>';
      }
    }
  }

  // ── Init ────────────────────────────────────────────────────
  carregar();
  setInterval(carregar, REFRESH_MS);
})();
