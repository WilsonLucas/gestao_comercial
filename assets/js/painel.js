// ============================================================
// painel.js — Painel Pedidos (TV)
//
// Página pública: lê painel_cliente_view via role anon a cada 5s.
// Nunca faz UPDATE/INSERT/DELETE — somente SELECT.
//
// Layout v1.5.1:
//   - 2 colunas: EM PREPARO (pendente+em_preparo) | PRONTO
//   - EM PREPARO com <8 cards: coluna única (cards full-width, fonte maior)
//   - EM PREPARO com >=8 cards: 2 sub-colunas × 7 linhas (até 14 visíveis)
//     Paginação a cada 8s quando houver >14 pedidos em preparo
//   - PRONTO cap em MAX_PRONTO=5 (FIFO — mantém os mais recentes)
//     Fonte menor para dar evidência a EM PREPARO
//   - Transição (pendente|em_preparo) → pronto dispara overlay fullscreen
//     por OVERLAY_SHOW_MS (sem flash no card). Fila sequencial se múltiplos.
//   - Relógio atualizado a cada segundo
//   - Badge de conexão (verde OK, vermelho pulsante se >15s sem sucesso)
//   - escapeHtml em cliente_nome (dado de usuário)
// ============================================================

(() => {
  'use strict';

  // ── Constantes ─────────────────────────────────────────────────
  const POLL_MS          = 5000;          // intervalo de polling
  const CONN_ERROR_MS    = 15_000;        // threshold para marcar conexão como ruim
  const SNAPSHOT_MAX_AGE = 5 * 60_000;    // snapshot localStorage válido por 5min
  const MAX_EM_PREPARO   = 14;            // 2 sub-colunas × 7 linhas
  const PAGINA_INTERVAL  = 8000;          // troca de página a cada 8s (quando >14)
  const MAX_PRONTO       = 5;             // cap FIFO — últimos 5 prontos
  const NAME_MIN_VH      = 2.8;           // piso do shrink-to-fit do nome (legível a 6m)
  const OVERLAY_SHOW_MS  = 4000;          // duração do overlay fullscreen
  const OVERLAY_EXIT_MS  = 400;           // duração da animação de saída (sincronizar com CSS)
  const SPLIT_THRESHOLD  = 8;             // EM PREPARO vira 2 sub-colunas a partir deste total

  const COLUNAS = {
    em_preparo: { elId: 'col-em-preparo', countId: 'count-em-preparo', pagId: 'pag-em-preparo' },
    pronto:     { elId: 'col-pronto',     countId: 'count-pronto',     pagId: null             },
  };

  // Mapeia status da FSM → coluna visual do painel
  function colunaDeStatus(status) {
    if (status === 'pendente' || status === 'em_preparo') return 'em_preparo';
    if (status === 'pronto') return 'pronto';
    return null;
  }

  // ── Estado ─────────────────────────────────────────────────────
  let lastOk           = Date.now();
  let lastLista        = [];
  let previousStatuses = new Map();
  const paginaAtual    = { em_preparo: 0 };
  const overlayQueue   = [];
  const overlayIdsJaExibidos = new Set(); // evita reexibir mesmo pedido após reload/polling
  let   overlayAtivo   = false;

  // ── Utilidades ─────────────────────────────────────────────────
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  function formatarNumero(n) {
    if (n == null) return '—';
    return '#' + String(n).padStart(3, '0');
  }

  function salvarSnapshot(lista) {
    try {
      localStorage.setItem('painel_snapshot', JSON.stringify({
        ts: Date.now(),
        data: lista,
      }));
    } catch { /* localStorage pode falhar em modo kiosk privado */ }
  }

  function lerSnapshot() {
    try {
      const raw = localStorage.getItem('painel_snapshot');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed?.ts || (Date.now() - parsed.ts) > SNAPSHOT_MAX_AGE) return [];
      return Array.isArray(parsed.data) ? parsed.data : [];
    } catch {
      return [];
    }
  }

  // ── Relógio ────────────────────────────────────────────────────
  function atualizarRelogio() {
    const el = document.getElementById('painel-clock');
    if (!el) return;
    const n = new Date();
    const hh = String(n.getHours()).padStart(2, '0');
    const mm = String(n.getMinutes()).padStart(2, '0');
    el.textContent = `${hh}:${mm}`;
  }

  // ── Status da conexão ──────────────────────────────────────────
  function setConn(status) {
    const el = document.getElementById('painel-conn');
    if (!el) return;
    el.dataset.status = status;
    const label = el.querySelector('.painel-conn-label');
    if (label) label.textContent = status === 'ok' ? 'Online' : 'Reconectando…';
  }

  // ── Render de um card ──────────────────────────────────────────
  function renderCard(venda) {
    const coluna = colunaDeStatus(venda.status) || 'em_preparo';
    return `
      <article class="painel-card painel-card--${coluna}" data-id="${escapeHtml(venda.id)}">
        <span class="painel-card-numero">${formatarNumero(venda.numero_pedido)}</span>
        <span class="painel-card-nome">${escapeHtml(venda.cliente_nome || 'Cliente')}</span>
      </article>
    `;
  }

  // ── Detecta transição (pendente|em_preparo) → pronto → enfileira overlay ──
  // Não dispara no primeiro render (previousStatuses vazio) — evita
  // que a tela fique com overlay ao dar refresh com pedidos já prontos.
  function detectarTransicoes(lista) {
    lista.forEach((v) => {
      const statusAnterior = previousStatuses.get(v.id);
      if (
        statusAnterior &&
        statusAnterior !== 'pronto' &&
        v.status === 'pronto' &&
        !overlayIdsJaExibidos.has(v.id)
      ) {
        overlayQueue.push({ id: v.id, numero: v.numero_pedido, nome: v.cliente_nome });
        overlayIdsJaExibidos.add(v.id);
        processarOverlayQueue();
      }
    });
    const idsAtuais = new Set(lista.map((v) => v.id));
    for (const id of previousStatuses.keys()) {
      if (!idsAtuais.has(id)) previousStatuses.delete(id);
    }
    // Limpa set de overlays já exibidos quando o pedido saiu (foi entregue)
    for (const id of overlayIdsJaExibidos) {
      if (!idsAtuais.has(id)) overlayIdsJaExibidos.delete(id);
    }
    previousStatuses = new Map(lista.map((v) => [v.id, v.status]));
  }

  // ── Overlay fullscreen — fila sequencial ──────────────────────
  function processarOverlayQueue() {
    if (overlayAtivo || overlayQueue.length === 0) return;
    mostrarOverlay(overlayQueue.shift());
  }

  function mostrarOverlay({ numero, nome }) {
    const el    = document.getElementById('painel-overlay');
    const elNum = document.getElementById('overlay-numero');
    const elNom = document.getElementById('overlay-nome');
    if (!el || !elNum || !elNom) return;

    overlayAtivo = true;
    elNum.textContent = formatarNumero(numero);
    elNom.textContent = nome || 'Cliente';
    el.classList.remove('exiting');
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');

    // Ajusta fonte do nome no overlay para caber (nomes longos)
    requestAnimationFrame(() => ajustarFonte(elNom, 12));

    setTimeout(() => {
      el.classList.add('exiting');
      setTimeout(() => {
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
        el.classList.remove('exiting');
        overlayAtivo = false;
        processarOverlayQueue();
      }, OVERLAY_EXIT_MS);
    }, OVERLAY_SHOW_MS);
  }

  // ── Shrink-to-fit de texto em um elemento ─────────────────────
  // Mede scrollWidth vs clientWidth e reduz font-size proporcionalmente
  // quando o texto estoura. Piso em minVh (vh). Preserva largura do container.
  function ajustarFonte(el, minVh) {
    if (!el) return;
    el.style.fontSize = ''; // reset para o default do CSS antes de medir
    const scrollW = el.scrollWidth;
    const clientW = el.clientWidth;
    if (scrollW <= clientW || clientW === 0) return;
    const basePx = parseFloat(getComputedStyle(el).fontSize);
    const minPx  = (minVh / 100) * window.innerHeight;
    const ratio  = clientW / scrollW;
    const newPx  = Math.max(minPx, basePx * ratio * 0.97); // margem 3%
    el.style.fontSize = newPx + 'px';
  }

  function ajustarFonteNomes() {
    document.querySelectorAll('.painel-card-nome').forEach((el) => ajustarFonte(el, NAME_MIN_VH));
  }

  // ── Paginação de EM PREPARO quando total > MAX_EM_PREPARO ─────
  function renderPaginacao(pagEl, totalCompleto) {
    if (!pagEl) return;
    const totalPaginas = Math.max(1, Math.ceil(totalCompleto / MAX_EM_PREPARO));
    if (totalPaginas <= 1) {
      pagEl.hidden = true;
      paginaAtual.em_preparo = 0;
      return;
    }
    pagEl.hidden = false;
    pagEl.innerHTML = Array.from({ length: totalPaginas }, (_, i) =>
      `<span class="painel-col-pag-dot${i === paginaAtual.em_preparo ? ' ativa' : ''}"></span>`
    ).join('');
  }

  // ── Render principal ───────────────────────────────────────────
  function render(lista) {
    detectarTransicoes(lista);

    const porColuna = { em_preparo: [], pronto: [] };
    lista.forEach((v) => {
      const col = colunaDeStatus(v.status);
      if (col) porColuna[col].push(v);
    });

    // Ordenação: menor numero_pedido primeiro (ambas as colunas)
    Object.values(porColuna).forEach((arr) => {
      arr.sort((a, b) => (a.numero_pedido || 0) - (b.numero_pedido || 0));
    });

    // Cap PRONTO: mantém apenas os últimos MAX_PRONTO (mais recentes)
    const prontoCompleto = porColuna.pronto;
    if (prontoCompleto.length > MAX_PRONTO) {
      porColuna.pronto = prontoCompleto.slice(-MAX_PRONTO);
    }

    Object.entries(COLUNAS).forEach(([coluna, cfg]) => {
      const cardsEl = document.getElementById(cfg.elId);
      const countEl = document.getElementById(cfg.countId);
      const pagEl   = cfg.pagId ? document.getElementById(cfg.pagId) : null;
      if (!cardsEl) return;

      let arr = porColuna[coluna];
      const totalCompleto = coluna === 'pronto' ? prontoCompleto.length : arr.length;

      if (coluna === 'em_preparo' && arr.length > MAX_EM_PREPARO) {
        const totalPaginas = Math.ceil(arr.length / MAX_EM_PREPARO);
        if (paginaAtual.em_preparo >= totalPaginas) paginaAtual.em_preparo = 0;
        const inicio = paginaAtual.em_preparo * MAX_EM_PREPARO;
        arr = arr.slice(inicio, inicio + MAX_EM_PREPARO);
      }

      cardsEl.innerHTML = arr.length
        ? arr.map(renderCard).join('')
        : '<div class="painel-col-vazia">—</div>';
      if (countEl) countEl.textContent = totalCompleto;

      // EM PREPARO: split-2col só a partir de SPLIT_THRESHOLD cards visíveis.
      // Abaixo disso, mantém coluna única (cards full-width com fonte maior).
      const deveSplit = coluna === 'em_preparo' && arr.length >= SPLIT_THRESHOLD;
      cardsEl.classList.toggle('split-2col', deveSplit);

      if (coluna === 'em_preparo') renderPaginacao(pagEl, porColuna.em_preparo.length);
    });

    requestAnimationFrame(ajustarFonteNomes);
  }

  // ── Avança paginação automaticamente (só EM PREPARO) ──────────
  function avancarPaginacao() {
    const emPreparoTotal = lastLista.filter(
      (v) => colunaDeStatus(v.status) === 'em_preparo'
    ).length;
    if (emPreparoTotal <= MAX_EM_PREPARO) return;
    const totalPaginas = Math.ceil(emPreparoTotal / MAX_EM_PREPARO);
    paginaAtual.em_preparo = (paginaAtual.em_preparo + 1) % totalPaginas;
    render(lastLista);
  }

  // ── Polling ────────────────────────────────────────────────────
  async function fetchPainel() {
    try {
      const { data, error } = await db
        .from('painel_cliente_view')
        .select('id, numero_pedido, cliente_nome, status, pronto_em, criado_em, iniciado_em');

      if (error) throw error;

      const lista = data || [];
      lastLista = lista;
      render(lista);
      salvarSnapshot(lista);
      lastOk = Date.now();
      setConn('ok');
    } catch (err) {
      if (Date.now() - lastOk > CONN_ERROR_MS) setConn('error');
      const snapshot = lerSnapshot();
      if (snapshot.length) { lastLista = snapshot; render(snapshot); }
      // eslint-disable-next-line no-console
      console.warn('[painel] fetch falhou:', err?.message || err);
    }
  }

  // ── Bootstrap ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'painel') return;

    const snapshotInicial = lerSnapshot();
    if (snapshotInicial.length) { lastLista = snapshotInicial; render(snapshotInicial); }

    atualizarRelogio();
    setInterval(atualizarRelogio, 1000);

    fetchPainel();
    setInterval(fetchPainel,      POLL_MS);
    setInterval(avancarPaginacao, PAGINA_INTERVAL);

    window.addEventListener('resize', () => {
      requestAnimationFrame(ajustarFonteNomes);
    });
  });
})();
