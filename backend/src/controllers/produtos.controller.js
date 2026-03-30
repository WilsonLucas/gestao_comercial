const pool = require('../config/database');

async function listar(req, res) {
  const perfil = req.usuario?.perfil;
  try {
    const result = await pool.query(
      `SELECT p.id, p.nome, p.preco_venda, p.ativo, p.criado_em,
              COALESCE(
                json_agg(
                  json_build_object(
                    'ingrediente_id', ft.ingrediente_id,
                    'ingrediente_nome', i.nome,
                    'quantidade', ft.quantidade,
                    'unidade', i.unidade
                  )
                ) FILTER (WHERE ft.id IS NOT NULL), '[]'
              ) AS ficha_tecnica
       FROM produtos p
       LEFT JOIN ficha_tecnica ft ON ft.produto_id = p.id
       LEFT JOIN ingredientes i ON i.id = ft.ingrediente_id
       WHERE p.ativo = true
       GROUP BY p.id
       ORDER BY p.nome`
    );

    let rows = result.rows;
    if (perfil === 'operador') {
      rows = rows.map(({ id, nome, preco_venda, ativo }) => ({ id, nome, preco_venda, ativo }));
    }

    return res.json(rows);
  } catch (err) {
    console.error('Erro ao listar produtos:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function criar(req, res) {
  const { nome, preco_venda, ficha_tecnica } = req.body;
  if (!nome || preco_venda == null) {
    return res.status(400).json({ erro: 'Nome e preco_venda sao obrigatorios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const produtoResult = await client.query(
      'INSERT INTO produtos (nome, preco_venda) VALUES ($1, $2) RETURNING *',
      [nome.trim(), Number(preco_venda)]
    );
    const produto = produtoResult.rows[0];

    if (Array.isArray(ficha_tecnica) && ficha_tecnica.length > 0) {
      for (const item of ficha_tecnica) {
        await client.query(
          'INSERT INTO ficha_tecnica (produto_id, ingrediente_id, quantidade) VALUES ($1, $2, $3)',
          [produto.id, item.ingrediente_id, Number(item.quantidade)]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json(produto);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar produto:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  } finally {
    client.release();
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, preco_venda, ativo, ficha_tecnica } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE produtos
       SET nome = COALESCE($1, nome),
           preco_venda = COALESCE($2, preco_venda),
           ativo = COALESCE($3, ativo)
       WHERE id = $4
       RETURNING *`,
      [nome?.trim(), preco_venda != null ? Number(preco_venda) : null, ativo, id]
    );

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Produto nao encontrado.' });
    }

    if (Array.isArray(ficha_tecnica)) {
      await client.query('DELETE FROM ficha_tecnica WHERE produto_id = $1', [id]);
      for (const item of ficha_tecnica) {
        await client.query(
          'INSERT INTO ficha_tecnica (produto_id, ingrediente_id, quantidade) VALUES ($1, $2, $3)',
          [id, item.ingrediente_id, Number(item.quantidade)]
        );
      }
    }

    await client.query('COMMIT');
    return res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar produto:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  } finally {
    client.release();
  }
}

async function remover(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE produtos SET ativo = false WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ erro: 'Produto nao encontrado.' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao remover produto:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function calcularCusto(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(ft.quantidade * i.preco_compra), 0) AS custo
       FROM ficha_tecnica ft
       JOIN ingredientes i ON i.id = ft.ingrediente_id
       WHERE ft.produto_id = $1`,
      [id]
    );
    return res.json({ produto_id: id, custo: Number(result.rows[0].custo) });
  } catch (err) {
    console.error('Erro ao calcular custo:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { listar, criar, atualizar, remover, calcularCusto };
