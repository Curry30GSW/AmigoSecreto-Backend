const router = require('express').Router();
const ParticipanteController = require('../controllers/ParticipanteController');
const { uploadExcel } = require('../middlewares/UploadMiddleware');
const auth = require('../middlewares/AuthMiddleware');
const admin = require('../middlewares/AdminMiddleware');

router.get('/evento/:eventoId/mi-boleta', auth, ParticipanteController.getMiBoleta);
router.get('/evento/:eventoId', auth, admin, ParticipanteController.getByEvento);
router.get('/:id', auth, admin, ParticipanteController.getById);
router.post('/evento/:eventoId', auth, admin, ParticipanteController.create);
router.post('/evento/:eventoId/importar', auth, admin, uploadExcel, ParticipanteController.importarExcel);
router.put('/:id', auth, admin, ParticipanteController.update);
router.delete('/:id', auth, admin, ParticipanteController.delete);

module.exports = router;