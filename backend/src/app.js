require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const ingredientesRoutes = require('./routes/ingredientes.routes');
const produtosRoutes = require('./routes/produtos.routes');
const comprasRoutes = require('./routes/compras.routes');
const vendasRoutes = require('./routes/vendas.routes');
const financeiroRoutes = require('./routes/financeiro.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const listaComprasRoutes = require('./routes/lista-compras.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../../')));

app.use('/api/auth', authRoutes);
app.use('/api/ingredientes', ingredientesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/lista-compras', listaComprasRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ erro: 'Rota nao encontrada.' });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error('Erro nao tratado:', err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Frontend disponivel em http://localhost:${PORT}`);
});

module.exports = app;
