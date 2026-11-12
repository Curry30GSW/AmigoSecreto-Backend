const Evento = require('../models/EventoModel');
const { ok, fail } = require('../utils/Response');

exports.getAll = async (req, res) => {
    try {
        const rows = await Evento.findAll();
        return ok(res, rows);
    } catch (error) {
        return fail(res, 'Error al listar eventos', 500, error.message);
    }
};

exports.getMyGames = async (req, res) => {
    try {
        const rows = await Evento.findByUsuario(req.usuario.cedula);
        return ok(res, rows);
    } catch (error) {
        return fail(res, 'Error al listar tus juegos', 500, error.message);
    }
};

exports.getMyGame = async (req, res) => {
    try {
        const rows = await Evento.findByUsuario(
            req.usuario.cedula,
            req.params.id
        );
        if (!rows.length) return fail(res, 'No estás inscrito en este juego', 404);
        return ok(res, rows[0]);
    } catch (error) {
        return fail(res, 'Error al buscar tu juego', 500, error.message);
    }
};

exports.getById = async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return fail(res, 'Evento no encontrado', 404);
        return ok(res, evento);
    } catch (error) {
        return fail(res, 'Error al buscar evento', 500, error.message);
    }
};

exports.create = async (req, res) => {
    try {
        const { nombre, descripcion, fecha_evento } = req.body;
        if (!nombre) return fail(res, 'El nombre es obligatorio', 400);

        const evento = await Evento.create({ nombre, descripcion, fecha_evento });
        return ok(res, evento, 'Evento creado', 201);
    } catch (error) {
        return fail(res, 'Error al crear evento', 500, error.message);
    }
};

exports.delete = async (req, res) => {
    try {
        const eliminado = await Evento.delete(req.params.id);
        if (!eliminado) return fail(res, 'Evento no encontrado', 404);
        return ok(res, null, 'Evento eliminado');
    } catch (error) {
        return fail(res, 'Error al eliminar evento', 500, error.message);
    }
};


exports.configurarAsignacionAutomatica = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha_asignacion_automatica } = req.body;

        const evento = await Evento.findById(id);
        if (!evento) return fail(res, 'Evento no encontrado', 404);

        if (!fecha_asignacion_automatica) {
            return fail(res, 'Debes indicar fecha y hora de la asignación', 400);
        }

        const fecha = new Date(`${fecha_asignacion_automatica}:00.000Z`);
        if (isNaN(fecha.getTime())) {
            return fail(res, 'Fecha inválida', 400);
        }

        await Evento.updateAsignacionAutomatica(
            id,
            fecha.toISOString().slice(0, 19).replace('T', ' '),
        );

        return ok(res, null, 'Fecha de asignación automática configurada');
    } catch (error) {
        return fail(res, 'Error al configurar la asignación', 500, error.message);
    }
};