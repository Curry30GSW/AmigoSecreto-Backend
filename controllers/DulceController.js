const Dulce = require('../models/DulceModel');
const Participante = require('../models/ParticipanteModel');
const { ok, fail } = require('../utils/Response');

async function puedeGestionar(req, id) {
    if (req.usuario.rol === 'admin') return true;
    return Dulce.perteneceAUsuario(id, req.usuario.cedula);
}

exports.listarPorParticipante = async (req, res) => {
    try {
        const participante = await Participante.findById(req.params.participanteId);
        if (!participante) return fail(res, 'Participante no encontrado', 404);
        if (req.usuario.rol !== 'admin' && participante.cedula !== req.usuario.cedula) {
            return fail(res, 'No puedes consultar esta lista', 403);
        }
        const items = await Dulce.findByParticipante(req.params.participanteId);
        return ok(res, items);
    } catch (error) {
        return fail(res, 'Error al listar dulces', 500, error.message);
    }
};

exports.crear = async (req, res) => {
    try {
        const { descripcion } = req.body;
        if (!String(descripcion || '').trim()) return fail(res, 'La descripción es obligatoria', 400);
        if (String(descripcion).trim().length > 120) {
            return fail(res, 'La descripción no puede superar 120 caracteres', 400);
        }
        const participante = await Participante.findById(req.params.participanteId);
        if (!participante) return fail(res, 'Participante no encontrado', 404);
        if (req.usuario.rol !== 'admin' && participante.cedula !== req.usuario.cedula) {
            return fail(res, 'No puedes agregar opciones a esta lista', 403);
        }
        const item = await Dulce.create({
            participante_id: req.params.participanteId,
            descripcion: String(descripcion).trim(),
        });
        return ok(res, item, 'Dulce agregado', 201);
    } catch (error) {
        return fail(res, 'Error al crear dulce', 500, error.message);
    }
};

exports.actualizar = async (req, res) => {
    try {
        if (!(await puedeGestionar(req, req.params.id))) {
            return fail(res, 'No puedes modificar esta opción', 403);
        }
        const actualizado = await Dulce.update(req.params.id, req.body);
        if (!actualizado) return fail(res, 'Dulce no encontrado', 404);
        return ok(res, null, 'Dulce actualizado');
    } catch (error) {
        return fail(res, 'Error al actualizar dulce', 500, error.message);
    }
};

exports.eliminar = async (req, res) => {
    try {
        if (!(await puedeGestionar(req, req.params.id))) {
            return fail(res, 'No puedes eliminar esta opción', 403);
        }
        const eliminado = await Dulce.delete(req.params.id);
        if (!eliminado) return fail(res, 'Dulce no encontrado', 404);
        return ok(res, null, 'Dulce eliminado');
    } catch (error) {
        return fail(res, 'Error al eliminar dulce', 500, error.message);
    }
};