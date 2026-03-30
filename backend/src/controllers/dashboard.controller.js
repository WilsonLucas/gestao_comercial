const pool = require('../config/database');

async function obter(req, res) {
  try {
    const totalResult = await pool.query(
      `SELECT
         COALESCE(SUM(total), 0) AS total_vendido,
         COALESCE(SUM(custo_total), 0) AS custo_total,
         COALESCE(SUM(lucro), 0) AS lucro_total,
         COUNT(*) AS quantidade_vendas
       FROM vendas`
    );

    const mesAtual = new Date().toISOString().slice(0, 7);
    const mesResult = await pool.query(
      `SELECT
         COALESCE(SUM(total), 0) AS vendido_mes,
         COALESCE(SUM(lucro), 0) AS lucro_mes
       FROM vendas
       WHERE TO_CHAR(data, 'YYYY-MM') = $1`,
      [mesAtual]
    );

    const comprasResult = await pool.query(
      'SELECT COALESCE(SUM(total), 0) AS total_gasto FROM compras'
    );

    const estoqueBaixoResult = await pool.query(
      `SELECT COUNT(*) AS quantidade FROM ingredientes WHERE estoque_atual <= estoque_minimo`
    );

    const ultimasVendasResult = await pool.query(
      `SELECT v.id, v.data, v.total, v.lucro,
              json_agg(
                json_build_object('produto_nome', p.nome, 'quantidade', iv.quantidade)
              ) AS itens
       FROM vendas v
       JOIN itens_venda iv ON iv.venda_id = v.id
       JOIN produtos p ON p.id = iv.produto_id
       GROUP BY v.id
       ORDER BY v.data DESC, v.criado_em DESC
       LIMIT 10`
    );

    const desempenhoResult = await pool.query(
      `SELECT TO_CHAR(data, 'YYYY-MM') AS mes,
              SUM(total) AS vendido,
              SUM(custo_total) AS custo,
              SUM(lucro) AS lucro
       FROM vendas
       GROUP BY mes
       ORDER BY mes`
    );

    const comprasPorMes = await pool.query(
      `SELECT TO_CHAR(data, 'YYYY-MM') AS mes,
              SUM(total) AS gasto
       FROM compras
       GROUP BY mes
       ORDER BY mes`
    );

    const mapa = new Map();
    for (const row of desempenhoResult.rows) {
      mapa.set(row.mes, { mes: row.mes, vendido: Number(row.vendido), lucro: Number(row.lucro), gasto: 0 });
    }
    for (const row of comprasPorMes.rows) {
      const existing = mapa.get(row.mes) || { mes: row.mes, vendido: 0, lucro: 0, gasto: 0 };
      existing.gasto = Number(row.gasto);
      mapa.set(row.mes, existing);
    }

    return res.json({
      metricas: {
        total_vendido: Number(totalResult.rows[0].total_vendido),
        custo_total: Number(totalResult.rows[0].custo_total),
        lucro_total: Number(totalResult.rows[0].lucro_total),
        quantidade_vendas: Number(totalResult.rows[0].quantidade_vendas),
        vendido_mes: Number(mesResult.rows[0].vendido_mes),
        lucro_mes: Number(mesResult.rows[0].lucro_mes),
        total_gasto: Number(comprasResult.rows[0].total_gasto),
        estoque_baixo: Number(estoqueBaixoResult.rows[0].quantidade)
      },
      ultimas_vendas: ultimasVendasResult.rows,
      desempenho_mensal: Array.from(mapa.values()).sort((a, b) => a.mes.localeCompare(b.mes))
    });
  } catch (err) {
    console.error('Erro ao buscar dashboard:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { obter };
