const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { listar, criar, atualizar, remover, calcularCusto } = require('../controllers/produtos.controller');

const router = Router();

router.get('/',          auth, listar);
router.post('/',         auth, authorize('estoque', 'administrador'), criar);
router.put('/:id',       auth, authorize('estoque', 'administrador'), atualizar);
router.delete('/:id',    auth, authorize('estoque', 'administrador'), remover);
router.get('/:id/custo', auth, authorize('estoque', 'administrador'), calcularCusto);

module.exports = router;
