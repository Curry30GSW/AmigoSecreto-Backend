const router = require('express').Router();
const DeseoController = require('../controllers/DeseoController');
const auth = require('../middlewares/AuthMiddleware');

router.get('/participante/:participanteId', auth, DeseoController.listarPorParticipante);
router.post('/participante/:participanteId', auth, DeseoController.crear);
router.put('/:id', auth, DeseoController.actualizar);
router.delete('/:id', auth, DeseoController.eliminar);

module.exports = router;