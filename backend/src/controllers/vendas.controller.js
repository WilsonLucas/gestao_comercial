const pool = require('../config/database');

async function criar(req, res) {
  const { itens } = req.body;
  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'itens e obrigatorio e deve ser uma lista nao vazia.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itensComCusto = [];
    let totalVenda = 0;
    let custoTotalVenda = 0;
    const data = new Date().toISOString().split('T')[0];

    for (const item of itens) {
      const prodResult = await client.query(
        'SELECT id, nome, preco_venda FROM produtos WHERE id = $1 AND ativo = true',
        [item.produto_id]
      );
      if (!prodResult.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(422).json({ erro: `Produto ${item.produto_id} nao encontrado ou inativo.` });
      }
      const produto = prodResult.rows[0];

      const fichaResult = await client.query(
        `SELECT ft.ingrediente_id, ft.quantidade AS qtd_ficha,
                i.nome AS ingrediente_nome, i.preco_compra, i.estoque_atual
         FROM ficha_tecnica ft
         JOIN ingredientes i ON i.id = ft.ingrediente_id
         WHERE ft.produto_id = $1`,
        [item.produto_id]
      );

      let custoUnitario = 0;
      for (const linha of fichaResult.rows) {
        const necessario = Number(linha.qtd_ficha) * Number(item.quantidade);
        if (Number(linha.estoque_atual) < necessario) {
          await client.query('ROLLBACK');
          return res.status(422).json({
            erro: `Estoque insuficiente para o ingrediente "${linha.ingrediente_nome}". Necessario: ${necessario}, disponivel: ${linha.estoque_atual}.`,
            ingrediente: linha.ingrediente_nome
          });
        }
        custoUnitario += Number(linha.qtd_ficha) * Number(linha.preco_compra);
      }

      const subtotalVenda = Number(produto.preco_venda) * Number(item.quantidade);
      const subtotalCusto = custoUnitario * Number(item.quantidade);
      totalVenda += subtotalVenda;
      custoTotalVenda += subtotalCusto;

      itensComCusto.push({
        produto_id: produto.id,
        quantidade: Number(item.quantidade),
        preco_unitario: Number(produto.preco_venda),
        custo_unitario: custoUnitario,
        ficha: fichaResult.rows
      });
    }

    const vendaResult = await client.query(
      `INSERT INTO vendas (data, total, custo_total, operador_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data, totalVenda, custoTotalVenda, req.usuario.id]
    );
    const venda = vendaResult.rows[0];

    for (const item of itensComCusto) {
      await client.query(
        `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, custo_unitario)
         VALUES ($1, $2, $3, $4, $5)`,
        [venda.id, item.produto_id, item.quantidade, item.preco_unitario, item.custo_unitario]
      );

      for (const linha of item.ficha) {
        await client.query(
          `UPDATE ingredientes
           SET estoque_atual = estoque_atual - $1,
               atualizado_em = NOW()
           WHERE id = $2`,
          [Number(linha.qtd_ficha) * item.quantidade, linha.ingrediente_id]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json(venda);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar venda:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  } finally {
    client.release();
  }
}

async function listar(req, res) {
  try {
    const result = await pool.query(
      `SELECT v.id, v.data, v.total, v.custo_total, v.lucro, v.criado_em,
              u.nome AS operador_nome,
              COALESCE(
                json_agg(
                  json_build_object(
                    'produto_id', iv.produto_id,
                    'produto_nome', p.nome,
                    'quantidade', iv.quantidade,
                    'preco_unitario', iv.preco_unitario,
                    'custo_unitario', iv.custo_unitario,
                    'total', iv.total,
                    'lucro', iv.lucro
                  )
                ) FILTER (WHERE iv.id IS NOT NULL), '[]'
              ) AS itens
       FROM vendas v
       LEFT JOIN usuarios u ON u.id = v.operador_id
       LEFT JOIN itens_venda iv ON iv.venda_id = v.id
       LEFT JOIN produtos p ON p.id = iv.produto_id
       GROUP BY v.id, u.nome
       ORDER BY v.data DESC, v.criado_em DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar vendas:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function listarHoje(req, res) {
  const hoje = new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query(
      `SELECT v.id, v.data, v.total, v.custo_total, v.lucro, v.criado_em,
              u.nome AS operador_nome,
              COALESCE(
                json_agg(
                  json_build_object(
                    'produto_id', iv.produto_id,
                    'produto_nome', p.nome,
                    'quantidade', iv.quantidade,
                    'preco_unitario', iv.preco_unitario,
                    'total', iv.total,
                    'lucro', iv.lucro
                  )
                ) FILTER (WHERE iv.id IS NOT NULL), '[]'
              ) AS itens
       FROM vendas v
       LEFT JOIN usuarios u ON u.id = v.operador_id
       LEFT JOIN itens_venda iv ON iv.venda_id = v.id
       LEFT JOIN produtos p ON p.id = iv.produto_id
       WHERE v.data = $1
       GROUP BY v.id, u.nome
       ORDER BY v.criado_em DESC`,
      [hoje]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar vendas de hoje:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { criar, listar, listarHoje };
