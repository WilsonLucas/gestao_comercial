// ============================================================
// painel.js — Painel do Cliente (TV)
//
// Página pública: lê painel_cliente_view via role anon a cada 5s.
// Nunca faz UPDATE/INSERT/DELETE — somente SELECT.
//
// Recursos:
//   - Polling 5s com fallback para snapshot localStorage (até 5min)
//   - Coluna PRONTO mantém no máximo MAX_PRONTO_VISIBLE cards (FIFO
//     pelo pronto_em) — cards 'entregue' somem via RPC marcar_entregue
//   - Animação .flash-pronto por 10s ao transitar em_preparo → pronto
//   - Paginação automática quando coluna tem mais que MAX_POR_PAGINA cards
//   - Relógio atualizado a cada segundo
//   - Badge de conexão (verde OK, vermelho pulsante se >15s sem sucesso)
//   - escapeHtml em cliente_nome (dado de usuário)
// ============================================================

(() => {
  'use strict';

  // ── Constantes ─────────────────────────────────────────────────
  const POLL_MS            = 5000;          // intervalo de polling
  const MAX_PRONTO_VISIBLE = 3;             // máximo de cards na coluna PRONTO (FIFO)
  const CONN_ERROR_MS      = 15_000;        // threshold para marcar conexão como ruim
  const SNAPSHOT_MAX_AGE   = 5 * 60_000;    // snapshot localStorage válido por 5min
  const FLASH_MS           = 10_000;        // duração do flash em PRONTO
  const MAX_POR_PAGINA     = 4;             // paginação quando >4 cards/coluna
  const PAGINA_INTERVAL    = 8000;          // troca de página a cada 8s

  const COLUNAS = {
    pendente:   { elId: 'col-pendente',   countId: 'count-pendente',   pagId: 'pag-pendente'   },
    em_preparo: { elId: 'col-em-preparo', countId: 'count-em-preparo', pagId: 'pag-em-preparo' },
    pronto:     { elId: 'col-pronto',     countId: 'count-pronto',     pagId: 'pag-pronto'     },
  };

  // ── Estado ─────────────────────────────────────────────────────
  let lastOk           = Date.now();    // timestamp do último fetch OK
  let previousStatuses = new Map();     // id → status anterior (para detectar flash)
  const flashUntil     = new Map();     // id → timestamp até quando manter flash
  const paginaAtual    = { pendente: 0, em_preparo: 0, pronto: 0 };

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

  function salvarSnapshot(visiveis) {
    try {
      localStorage.setItem('painel_snapshot', JSON.stringify({
        ts: Date.now(),
        data: visiveis,
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
    return `
      <article class="painel-card painel-card--${venda.status}${flashCls}" data-id="${escapeHtml(venda.id)}">
        <div class="painel-card-numero">${formatarNumero(venda.numero_pedido)}</div>
        <div class="painel-card-nome">${escapeHtml(venda.cliente_nome || 'Cliente')}</div>
      </article>
    `;
  }

  // ── Filtro: coluna PRONTO limitada a MAX_PRONTO_VISIBLE (FIFO) ──
  // Pedidos entregues saem via RPC marcar_entregue (backoffice). Até lá,
  // ficam visíveis para o cliente. Se acumular mais que o limite, os
  // mais antigos (por pronto_em) saem primeiro — presumindo que o cliente
  // já retirou. Para pendente e em_preparo não há limite.
  function filtrarVisiveis(lista) {
    const outros = lista.filter((v) => v.status !== 'pronto');
    const prontos = lista
      .filter((v) => v.status === 'pronto')
      .sort((a, b) => {
        // Mais recente primeiro (pronto_em DESC); itens sem pronto_em
        // vão para o fim para serem os primeiros a cair.
        const ta = a.pronto_em ? new Date(a.pronto_em).getTime() : 0;
        const tb = b.pronto_em ? new Date(b.pronto_em).getTime() : 0;
        return tb - ta;
      })
      .slice(0, MAX_PRONTO_VISIBLE);
    return outros.concat(prontos);
  }

  // ── Detecta transição em_preparo → pronto → aciona flash ─────
  function detectarFlash(lista) {
    lista.forEach((v) => {
      const statusAnterior = previousStatuses.get(v.id);
      if (statusAnterior === 'em_preparo' && v.status === 'pronto') {
        flashUntil.set(v.id, Date.now() + FLASH_MS);
      }
    });
    // Limpa IDs que não estão mais visíveis
    const idsAtuais = new Set(lista.map((v) => v.id));
    for (const id of previousStatuses.keys()) {
      if (!idsAtuais.has(id)) previousStatuses.delete(id);
    }
    for (const id of flashUntil.keys()) {
      if (flashUntil.get(id) <= Date.now() || !idsAtuais.has(id)) flashUntil.delete(id);
    }
    previousStatuses = new Map(lista.map((v) => [v.id, v.status]));
  }

  // ── Paginação automática de uma coluna ─────────────────────────
  function aplicarPaginacao(status, cardsEl, pagEl, total) {
    const totalPaginas = Math.max(1, Math.ceil(total / MAX_POR_PAGINA));
    if (totalPaginas <= 1) {
      if (pagEl) pagEl.hidden = true;
      if (cardsEl) {
        cardsEl.style.setProperty('--offset', '0');
        const all = cardsEl.querySelectorAll('.painel-card');
        all.forEach((c) => { c.style.display = ''; });
      }
      paginaAtual[status] = 0;
      return;
    }
    if (paginaAtual[status] >= totalPaginas) paginaAtual[status] = 0;
    const inicio = paginaAtual[status] * MAX_POR_PAGINA;
    const fim    = inicio + MAX_POR_PAGINA;
    const all    = cardsEl.querySelectorAll('.painel-card');
    all.forEach((c, i) => { c.style.display = (i >= inicio && i < fim) ? '' : 'none'; });
    if (pagEl) {
      pagEl.hidden = false;
      pagEl.innerHTML = Array.from({ length: totalPaginas }, (_, i) =>
        `<span class="painel-col-pag-dot${i === paginaAtual[status] ? ' ativa' : ''}"></span>`
      ).join('');
    }
  }

  // ── Render principal ───────────────────────────────────────────
  function render(lista) {
    detectarFlash(lista);

    const porStatus = { pendente: [], em_preparo: [], pronto: [] };
    lista.forEach((v) => {
      if (porStatus[v.status]) porStatus[v.status].push(v);
    });

    // Ordenação: menor numero_pedido primeiro
    Object.values(porStatus).forEach((arr) => {
      arr.sort((a, b) => (a.numero_pedido || 0) - (b.numero_pedido || 0));
    });

    Object.entries(COLUNAS).forEach(([status, cfg]) => {
      const cardsEl = document.getElementById(cfg.elId);
      const countEl = document.getElementById(cfg.countId);
      const pagEl   = document.getElementById(cfg.pagId);
      if (!cardsEl) return;

      const arr = porStatus[status];
      cardsEl.innerHTML = arr.length
        ? arr.map(renderCard).join('')
        : '<div class="painel-col-vazia">—</div>';
      if (countEl) countEl.textContent = arr.length;

      aplicarPaginacao(status, cardsEl, pagEl, arr.length);
    });
  }

  // ── Avança paginação automaticamente ───────────────────────────
  function avancarPaginacao() {
    Object.entries(COLUNAS).forEach(([status, cfg]) => {
      const cardsEl = document.getElementById(cfg.elId);
      const pagEl   = document.getElementById(cfg.pagId);
      if (!cardsEl) return;
      const total = cardsEl.querySelectorAll('.painel-card').length;
      if (total <= MAX_POR_PAGINA) return;
      const totalPaginas = Math.ceil(total / MAX_POR_PAGINA);
      paginaAtual[status] = (paginaAtual[status] + 1) % totalPaginas;
      aplicarPaginacao(status, cardsEl, pagEl, total);
    });
  }

  // ── Polling ────────────────────────────────────────────────────
  async function fetchPainel() {
    try {
      const { data, error } = await db
        .from('painel_cliente_view')
        .select('id, numero_pedido, cliente_nome, status, pronto_em, criado_em, iniciado_em');

      if (error) throw error;

      const visiveis = filtrarVisiveis(data || []);
      render(visiveis);
      salvarSnapshot(visiveis);
      lastOk = Date.now();
      setConn('ok');
    } catch (err) {
      // Fallback: usa snapshot se conexão falhou
      if (Date.now() - lastOk > CONN_ERROR_MS) setConn('error');
      const snapshot = lerSnapshot();
      if (snapshot.length) render(filtrarVisiveis(snapshot));
      // Em console para diagnosticar em produção
      // eslint-disable-next-line no-console
      console.warn('[painel] fetch falhou:', err?.message || err);
    }
  }

  // ── Bootstrap ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'painel') return;

    // Se a carga inicial falhar (ex: sem rede), exibe imediatamente o snapshot
    const snapshotInicial = lerSnapshot();
    if (snapshotInicial.length) render(filtrarVisiveis(snapshotInicial));

    atualizarRelogio();
    setInterval(atualizarRelogio, 1000);

    fetchPainel();
    setInterval(fetchPainel,       POLL_MS);
    setInterval(avancarPaginacao,  PAGINA_INTERVAL); // rotação de páginas
  });
})();
