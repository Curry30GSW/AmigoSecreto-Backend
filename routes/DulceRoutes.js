const router = require('express').Router();
const DulceController = require('../controllers/DulceController');
const auth = require('../middlewares/AuthMiddleware');

router.get('/participante/:participanteId', auth, DulceController.listarPorParticipante);
router.post('/participante/:participanteId', auth, DulceController.crear);
router.put('/:id', auth, DulceController.actualizar);
router.delete('/:id', auth, DulceController.eliminar);

module.exports = router;