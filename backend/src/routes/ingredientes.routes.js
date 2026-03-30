const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { listar, criar, atualizar, remover } = require('../controllers/ingredientes.controller');

const router = Router();

router.get('/',     auth, authorize('estoque', 'administrador'), listar);
router.post('/',    auth, authorize('estoque', 'administrador'), criar);
router.put('/:id',  auth, authorize('estoque', 'administrador'), atualizar);
router.delete('/:id', auth, authorize('estoque', 'administrador'), remover);

module.exports = router;
