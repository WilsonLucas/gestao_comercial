const pool = require('../config/database');

async function listar(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, nome, unidade, estoque_atual, estoque_minimo, preco_compra,
              CASE
                WHEN estoque_atual <= estoque_minimo THEN 'critico'
                WHEN estoque_atual <= estoque_minimo * 1.5 THEN 'atencao'
                ELSE 'normal'
              END AS status
       FROM ingredientes
       WHERE estoque_atual <= estoque_minimo * 1.5
       ORDER BY
         CASE
           WHEN estoque_atual <= estoque_minimo THEN 1
           WHEN estoque_atual <= estoque_minimo * 1.5 THEN 2
           ELSE 3
         END,
         nome`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar lista de compras:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { listar };
