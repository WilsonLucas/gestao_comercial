// ============================================================
// painel.js — Painel Pedidos (TV)
//
// Página pública: lê painel_cliente_view via role anon a cada 5s.
// Nunca faz UPDATE/INSERT/DELETE — somente SELECT.
//
// Layout v1.3:
//   - 2 colunas: EM PREPARO (unifica status pendente + em_preparo) | PRONTO
//   - PRONTO sem cap — pedido fica até ser marcado como entregue via RPC
//     marcar_entregue (executada na página Cozinha)
//   - PRONTO quebra em 2 sub-colunas lado a lado quando total >= MAX_ANTES_SPLIT
//   - Animação .flash-pronto por FLASH_MS na transição (pendente|em_preparo) → pronto
//   - Paginação preservada apenas em EM PREPARO quando >MAX_POR_PAGINA
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
  const MAX_POR_PAGINA   = 4;             // paginação EM PREPARO quando >4 cards
  const PAGINA_INTERVAL  = 8000;          // troca de página a cada 8s
  const MAX_ANTES_SPLIT  = 5;             // PRONTO quebra em 2 sub-colunas quando >=5

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

  // ── Paginação automática (apenas EM PREPARO) ──────────────────
  function aplicarPaginacaoEmPreparo(cardsEl, pagEl, total) {
    const totalPaginas = Math.max(1, Math.ceil(total / MAX_POR_PAGINA));
    if (totalPaginas <= 1) {
      if (pagEl) pagEl.hidden = true;
      if (cardsEl) {
        const all = cardsEl.querySelectorAll('.painel-card');
        all.forEach((c) => { c.style.display = ''; });
      }
      paginaAtual.em_preparo = 0;
      return;
    }
    if (paginaAtual.em_preparo >= totalPaginas) paginaAtual.em_preparo = 0;
    const inicio = paginaAtual.em_preparo * MAX_POR_PAGINA;
    const fim    = inicio + MAX_POR_PAGINA;
    const all    = cardsEl.querySelectorAll('.painel-card');
    all.forEach((c, i) => { c.style.display = (i >= inicio && i < fim) ? '' : 'none'; });
    if (pagEl) {
      pagEl.hidden = false;
      pagEl.innerHTML = Array.from({ length: totalPaginas }, (_, i) =>
        `<span class="painel-col-pag-dot${i === paginaAtual.em_preparo ? ' ativa' : ''}"></span>`
      ).join('');
    }
  }

  // ── Layout da coluna PRONTO (split-2col quando >=MAX_ANTES_SPLIT) ─
  function aplicarLayoutPronto(cardsEl, total) {
    if (!cardsEl) return;
    cardsEl.classList.toggle('split-2col', total >= MAX_ANTES_SPLIT);
    const all = cardsEl.querySelectorAll('.painel-card');
    all.forEach((c) => { c.style.display = ''; });
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

    Object.entries(COLUNAS).forEach(([coluna, cfg]) => {
      const cardsEl = document.getElementById(cfg.elId);
      const countEl = document.getElementById(cfg.countId);
      const pagEl   = cfg.pagId ? document.getElementById(cfg.pagId) : null;
      if (!cardsEl) return;

      const arr = porColuna[coluna];
      cardsEl.innerHTML = arr.length
        ? arr.map(renderCard).join('')
        : '<div class="painel-col-vazia">—</div>';
      if (countEl) countEl.textContent = arr.length;

      if (coluna === 'em_preparo') {
        aplicarPaginacaoEmPreparo(cardsEl, pagEl, arr.length);
      } else {
        aplicarLayoutPronto(cardsEl, arr.length);
      }
    });
  }

  // ── Avança paginação automaticamente (só EM PREPARO) ──────────
  function avancarPaginacao() {
    const cfg     = COLUNAS.em_preparo;
    const cardsEl = document.getElementById(cfg.elId);
    const pagEl   = document.getElementById(cfg.pagId);
    if (!cardsEl) return;
    const total = cardsEl.querySelectorAll('.painel-card').length;
    if (total <= MAX_POR_PAGINA) return;
    const totalPaginas = Math.ceil(total / MAX_POR_PAGINA);
    paginaAtual.em_preparo = (paginaAtual.em_preparo + 1) % totalPaginas;
    aplicarPaginacaoEmPreparo(cardsEl, pagEl, total);
  }

  // ── Polling ────────────────────────────────────────────────────
  async function fetchPainel() {
    try {
      const { data, error } = await db
        .from('painel_cliente_view')
        .select('id, numero_pedido, cliente_nome, status, pronto_em, criado_em, iniciado_em');

      if (error) throw error;

      const lista = data || [];
      render(lista);
      salvarSnapshot(lista);
      lastOk = Date.now();
      setConn('ok');
    } catch (err) {
      if (Date.now() - lastOk > CONN_ERROR_MS) setConn('error');
      const snapshot = lerSnapshot();
      if (snapshot.length) render(snapshot);
      // eslint-disable-next-line no-console
      console.warn('[painel] fetch falhou:', err?.message || err);
    }
  }

  // ── Bootstrap ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'painel') return;

    const snapshotInicial = lerSnapshot();
    if (snapshotInicial.length) render(snapshotInicial);

    atualizarRelogio();
    setInterval(atualizarRelogio, 1000);

    fetchPainel();
    setInterval(fetchPainel,      POLL_MS);
    setInterval(avancarPaginacao, PAGINA_INTERVAL);
  });
})();
