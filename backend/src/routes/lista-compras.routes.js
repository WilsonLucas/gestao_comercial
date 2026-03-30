const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { listar } = require('../controllers/lista-compras.controller');

const router = Router();

router.get('/', auth, authorize('estoque', 'administrador'), listar);

module.exports = router;
