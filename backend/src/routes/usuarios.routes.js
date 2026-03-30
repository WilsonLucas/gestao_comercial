const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { listar, criar, atualizar, remover } = require('../controllers/usuarios.controller');

const router = Router();

router.get('/',       auth, authorize('administrador'), listar);
router.post('/',      auth, authorize('administrador'), criar);
router.put('/:id',    auth, authorize('administrador'), atualizar);
router.delete('/:id', auth, authorize('administrador'), remover);

module.exports = router;
