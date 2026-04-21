// ============================================================
// Painel Cardápio — v2.0 (TV-first)
// Página pública, read-only. Exibido em TV 1080p sobre o caixa.
// - Sem scroll: conteúdo dividido em VISTAS rotativas
// - Rotação automática com crossfade
// - Produtos sem estoque (ingredientes com estoque=0) não aparecem
// ============================================================

(() => {
  if (document.body.dataset.page !== 'cardapio') return;

  const REFRESH_MS = 60_000;   // recarga de dados do Supabase
  const ROTACAO_MS = 20_000;   // tempo por vista (alinhado com --cardapio-rotacao-ms)
  const FADE_MS    = 800;      // duração do crossfade (alinhado com --cardapio-fade-ms)

  // Grupos de categorias por vista — ordem ritual da pastelaria.
  // Vista 0 = "Pastéis da casa" (destaque), Vista 1 = "Complementos & bebidas".
  // Se uma categoria ficar sem itens disponíveis, a própria vista se contrai
  // (pode desaparecer se vazia).
  const GRUPOS_VISTAS = [
    { categorias: ['Pastéis Salgados', 'Pastéis Doces'] },
    { categorias: ['Porções', 'Misto Quente', 'Bebidas'] },
  ];

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

  // ── Helpers ─────────────────────────────────────────────────
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
    if (!categoria) return 'categoria-outros';
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

  // Mesma lógica do PDV: item aparece apenas se TODOS os ingredientes
  // da ficha têm estoque >= quantidade. Produto sem ficha técnica é
  // considerado disponível (não há como aferir).
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

  // ── Render de uma seção (categoria + itens) ─────────────────
  function secaoHtml(categoria, itens) {
    const slug = slugCategoria(categoria);
    const linhas = itens.map((p) => `
      <li class="cardapio-item">
        <span class="cardapio-item-nome">${escapeHtml(p.nome)}</span>
        <span class="cardapio-item-dots" aria-hidden="true"></span>
        <span class="cardapio-item-preco">${currency.format(Number(p.preco_venda || 0))}</span>
      </li>
    `).join('');
    return `
      <section class="cardapio-secao">
        <div class="cardapio-secao-header">
          <h2 class="cardapio-secao-titulo">${escapeHtml(categoria)}</h2>
          <span class="cardapio-secao-badge ${slug}">${itens.length} ${itens.length === 1 ? 'item' : 'itens'}</span>
        </div>
        <ul class="cardapio-lista">${linhas}</ul>
      </section>
    `;
  }

  // Distribui seções de uma vista nas 2 colunas, balanceando por
  // quantidade de itens. 1 categoria → span nas 2 colunas.
  function vistaHtml(categoriasDoGrupo, porCategoria) {
    const ativas = categoriasDoGrupo.filter((c) => (porCategoria[c] || []).length > 0);
    if (!ativas.length) return '';

    if (ativas.length === 1) {
      const cat = ativas[0];
      return `
        <div class="cardapio-coluna" style="grid-column:1/-1">
          ${secaoHtml(cat, porCategoria[cat])}
        </div>
      `;
    }

    // 2+ categorias — balanceia por total de itens, mantendo ordem.
    const colunas = [[], []];
    const totais  = [0, 0];
    ativas.forEach((cat) => {
      const qtd = porCategoria[cat].length;
      const alvo = totais[0] <= totais[1] ? 0 : 1;
      colunas[alvo].push(cat);
      totais[alvo] += qtd;
    });

    return colunas.map((catsNaCol) => `
      <div class="cardapio-coluna">
        ${catsNaCol.map((cat) => secaoHtml(cat, porCategoria[cat])).join('')}
      </div>
    `).join('');
  }

  // ── Estado da rotação ───────────────────────────────────────
  let vistasEl = [];
  let vistaAtual = 0;
  let rotacaoTimer = null;

  function pararRotacao() {
    if (rotacaoTimer) { clearInterval(rotacaoTimer); rotacaoTimer = null; }
  }

  function iniciarRotacao() {
    pararRotacao();
    if (vistasEl.length < 2) return;
    rotacaoTimer = setInterval(() => {
      const proxima = (vistaAtual + 1) % vistasEl.length;
      trocarVista(proxima);
    }, ROTACAO_MS);
  }

  function trocarVista(idx) {
    if (!vistasEl.length) return;
    vistasEl.forEach((el, i) => el.classList.toggle('active', i === idx));
    vistaAtual = idx;
    const dots = document.querySelectorAll('.cardapio-footer-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    // Reinicia animação da progress bar sincronizada com a troca
    const prog = document.getElementById('cardapio-progress');
    if (prog && !prog.hidden) {
      prog.classList.remove('rodando');
      // força reflow p/ reiniciar animação CSS
      void prog.offsetWidth;
      prog.classList.add('rodando');
    }
  }

  // ── Render principal ────────────────────────────────────────
  function renderCardapio(produtos) {
    const palco = document.getElementById('cardapio-palco');
    if (!palco) return;

    // Preserva a vista em exibição entre refreshes (evita "saltos" para a vista 0)
    const idxPreservado = vistaAtual;

    const disponiveis = produtos.filter(temEstoque);

    if (!disponiveis.length) {
      palco.innerHTML = `
        <div class="cardapio-progress" id="cardapio-progress" hidden><div class="cardapio-progress-bar"></div></div>
        <p class="cardapio-vazio">Nenhum item disponível no momento.</p>
      `;
      renderDots(0);
      pararRotacao();
      vistasEl = [];
      return;
    }

    // Agrupa por categoria preservando ordem
    const porCategoria = {};
    ORDEM_CATEGORIAS.forEach((c) => { porCategoria[c] = []; });
    disponiveis.forEach((p) => {
      const cat = p.categoria || 'Outros';
      (porCategoria[cat] ||= []).push(p);
    });
    Object.values(porCategoria).forEach((arr) => {
      arr.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    });

    // Gera HTML de cada vista (pode vir vazio se nenhuma categoria do grupo tem itens)
    const vistasHtml = GRUPOS_VISTAS.map((g) => vistaHtml(g.categorias, porCategoria));

    // Categorias "Outros" (fora do ORDEM_CATEGORIAS) — anexa como nova vista
    const outras = Object.keys(porCategoria).filter((c) => !ORDEM_CATEGORIAS.includes(c) && porCategoria[c].length);
    if (outras.length) {
      const extraHtml = outras.map((cat) => secaoHtml(cat, porCategoria[cat])).join('');
      vistasHtml.push(`<div class="cardapio-coluna" style="grid-column:1/-1">${extraHtml}</div>`);
    }

    const vistasValidas = vistasHtml
      .map((html, idx) => ({ html, idx }))
      .filter((v) => v.html);

    palco.innerHTML = `
      <div class="cardapio-progress" id="cardapio-progress"${vistasValidas.length > 1 ? '' : ' hidden'}>
        <div class="cardapio-progress-bar"></div>
      </div>
      ${vistasValidas.map((v, i) => `
        <section class="cardapio-vista ${i === 0 ? 'active' : ''}" data-vista="${i}">
          ${v.html}
        </section>
      `).join('')}
    `;

    vistasEl = Array.from(palco.querySelectorAll('.cardapio-vista'));
    renderDots(vistasEl.length);

    // Se a vista que estava em exibição ainda existe, mantém nela
    const idxInicial = Math.min(idxPreservado, Math.max(0, vistasEl.length - 1));
    vistaAtual = 0; // trocarVista já assume índice anterior != idx desejado
    if (vistasEl.length) trocarVista(idxInicial);

    if (vistasEl.length > 1) {
      const prog = document.getElementById('cardapio-progress');
      prog?.classList.add('rodando');
      iniciarRotacao();
    } else {
      pararRotacao();
    }
  }

  function renderDots(qtd) {
    const host = document.getElementById('cardapio-footer-dots');
    if (!host) return;
    if (qtd < 2) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    host.hidden = false;
    host.innerHTML = Array.from({ length: qtd }, (_, i) =>
      `<span class="cardapio-footer-dot ${i === 0 ? 'active' : ''}" aria-hidden="true"></span>`
    ).join('');
  }

  // ── Status (cabeçalho) ──────────────────────────────────────
  function atualizarStatus(ok, mensagem) {
    const el = document.getElementById('cardapio-status');
    if (!el) return;
    el.dataset.status = ok ? 'ok' : 'offline';
    const label = el.querySelector('.cardapio-status-label');
    if (label) label.textContent = mensagem;
  }

  // ── Carga de dados ──────────────────────────────────────────
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
      const palco = document.getElementById('cardapio-palco');
      if (palco && !palco.querySelector('.cardapio-vista')) {
        palco.innerHTML = '<p class="cardapio-vazio">Erro ao carregar cardápio. Tentando novamente...</p>';
      }
    }
  }

  // Pausa rotação quando a aba fica escondida (economia + evita saltos ao voltar)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pararRotacao();
    else if (vistasEl.length > 1) iniciarRotacao();
  });

  // ── Init ────────────────────────────────────────────────────
  carregar();
  setInterval(carregar, REFRESH_MS);
})();
