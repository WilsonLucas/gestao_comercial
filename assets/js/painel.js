// ============================================================
// painel.js — Painel Pedidos (TV)
//
// Página pública: lê painel_cliente_view via role anon a cada 5s.
// Nunca faz UPDATE/INSERT/DELETE — somente SELECT.
//
// Layout v1.4:
//   - 2 colunas: EM PREPARO (pendente+em_preparo) | PRONTO
//   - EM PREPARO sempre em 2 sub-colunas × 7 linhas (14 cards visíveis)
//     Paginação a cada 8s quando houver >14 pedidos em preparo
//   - PRONTO cap em MAX_PRONTO=5 (FIFO — mantém os mais recentes)
//     Fonte menor para dar evidência a EM PREPARO
//   - Animação .flash-pronto por FLASH_MS na transição (pendente|em_preparo) → pronto
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
  const FLASH_MS         = 10_000;        // duração do flash em PRONTO
  const MAX_EM_PREPARO   = 14;            // 2 sub-colunas × 7 linhas
  const PAGINA_INTERVAL  = 8000;          // troca de página a cada 8s (quando >14)
  const MAX_PRONTO       = 5;             // cap FIFO — últimos 5 prontos
  const NAME_MIN_VH      = 2.8;           // piso do shrink-to-fit do nome (legível a 6m)

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
  const flashUntil     = new Map();
  const paginaAtual    = { em_preparo: 0 };

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
    const flashAtivo = flashUntil.has(venda.id) && flashUntil.get(venda.id) > Date.now();
    const flashCls   = flashAtivo ? ' flash-pronto' : '';
    const coluna     = colunaDeStatus(venda.status) || 'em_preparo';
    return `
      <article class="painel-card painel-card--${coluna}${flashCls}" data-id="${escapeHtml(venda.id)}">
        <span class="painel-card-numero">${formatarNumero(venda.numero_pedido)}</span>
        <span class="painel-card-nome">${escapeHtml(venda.cliente_nome || 'Cliente')}</span>
      </article>
    `;
  }

  // ── Detecta transição (pendente|em_preparo) → pronto → flash ──
  function detectarFlash(lista) {
    lista.forEach((v) => {
      const statusAnterior = previousStatuses.get(v.id);
      if (statusAnterior && statusAnterior !== 'pronto' && v.status === 'pronto') {
        flashUntil.set(v.id, Date.now() + FLASH_MS);
      }
    });
    const idsAtuais = new Set(lista.map((v) => v.id));
    for (const id of previousStatuses.keys()) {
      if (!idsAtuais.has(id)) previousStatuses.delete(id);
    }
    for (const id of flashUntil.keys()) {
      if (flashUntil.get(id) <= Date.now() || !idsAtuais.has(id)) flashUntil.delete(id);
    }
    previousStatuses = new Map(lista.map((v) => [v.id, v.status]));
  }

  // ── Shrink-to-fit do nome por card (preserva grid uniforme) ───
  // Mede scrollWidth vs clientWidth após o render e reduz font-size
  // proporcionalmente quando o nome estoura. Piso em NAME_MIN_VH.
  function ajustarFonteNomes() {
    const minPx = (NAME_MIN_VH / 100) * window.innerHeight;
    document.querySelectorAll('.painel-card-nome').forEach((el) => {
      el.style.fontSize = ''; // reset para o default do CSS antes de medir
      const scrollW = el.scrollWidth;
      const clientW = el.clientWidth;
      if (scrollW <= clientW || clientW === 0) return;
      const basePx = parseFloat(getComputedStyle(el).fontSize);
      const ratio  = clientW / scrollW;
      const newPx  = Math.max(minPx, basePx * ratio * 0.97); // margem 3%
      el.style.fontSize = newPx + 'px';
    });
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
    detectarFlash(lista);

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

      // EM PREPARO sempre em 2 sub-colunas; PRONTO sempre coluna única
      cardsEl.classList.toggle('split-2col', coluna === 'em_preparo');

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
