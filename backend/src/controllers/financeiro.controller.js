const pool = require('../config/database');

async function resumoMensal(req, res) {
  try {
    const vendasResult = await pool.query(
      `SELECT TO_CHAR(data, 'YYYY-MM') AS mes,
              SUM(total) AS vendido,
              SUM(custo_total) AS custo,
              SUM(lucro) AS lucro
       FROM vendas
       GROUP BY mes
       ORDER BY mes`
    );

    const comprasResult = await pool.query(
      `SELECT TO_CHAR(data, 'YYYY-MM') AS mes,
              SUM(total) AS gasto
       FROM compras
       GROUP BY mes
       ORDER BY mes`
    );

    const mapa = new Map();

    for (const row of vendasResult.rows) {
      mapa.set(row.mes, {
        mes: row.mes,
        vendido: Number(row.vendido),
        custo: Number(row.custo),
        lucro: Number(row.lucro),
        gasto: 0
      });
    }

    for (const row of comprasResult.rows) {
      const existing = mapa.get(row.mes) || { mes: row.mes, vendido: 0, custo: 0, lucro: 0, gasto: 0 };
      existing.gasto = Number(row.gasto);
      mapa.set(row.mes, existing);
    }

    const resumo = Array.from(mapa.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    return res.json(resumo);
  } catch (err) {
    console.error('Erro ao buscar resumo mensal:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function desempenho(req, res) {
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
      'SELECT COUNT(*) AS quantidade FROM ingredientes WHERE estoque_atual <= estoque_minimo'
    );

    return res.json({
      total_vendido: Number(totalResult.rows[0].total_vendido),
      custo_total: Number(totalResult.rows[0].custo_total),
      lucro_total: Number(totalResult.rows[0].lucro_total),
      quantidade_vendas: Number(totalResult.rows[0].quantidade_vendas),
      vendido_mes: Number(mesResult.rows[0].vendido_mes),
      lucro_mes: Number(mesResult.rows[0].lucro_mes),
      total_gasto: Number(comprasResult.rows[0].total_gasto),
      estoque_baixo: Number(estoqueBaixoResult.rows[0].quantidade)
    });
  } catch (err) {
    console.error('Erro ao buscar desempenho:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { resumoMensal, desempenho };
