const fs = require('fs');
const Participante = require('../models/ParticipanteModel');
const Evento = require('../models/EventoModel');
const Deseo = require('../models/DeseoModel');
const Dulce = require('../models/DulceModel');
const { parsearExcelParticipantes } = require('../services/ImportarParticipantesService');
const { crearUsuarioDesdeParticipante } = require('../services/AutoUserService');
const { ok, fail } = require('../utils/Response');

exports.getByEvento = async (req, res) => {
    try {
        const rows = await Participante.findByEvento(req.params.eventoId);
        return ok(res, rows);
    } catch (error) {
        return fail(res, 'Error al listar participantes', 500, error.message);
    }
};

exports.getMiBoleta = async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.eventoId);
        if (!evento) return fail(res, 'Juego no encontrado', 404);

        const participante = await Participante.findByCedulaYEvento(
            req.usuario.cedula,
            req.params.eventoId
        );
        if (!participante) return fail(res, 'No estás inscrito en este juego', 404);

        const [deseos, dulces] = await Promise.all([
            Deseo.findByParticipante(participante.id),
            Dulce.findByParticipante(participante.id),
        ]);
        return ok(res, {
            evento,
            participante: { ...participante, deseos, dulces },
        });
    } catch (error) {
        return fail(res, 'Error al cargar tu boleta', 500, error.message);
    }
};

exports.getById = async (req, res) => {
    try {
        const p = await Participante.findById(req.params.id);
        if (!p) return fail(res, 'Participante no encontrado', 404);
        return ok(res, p);
    } catch (error) {
        return fail(res, 'Error al buscar participante', 500, error.message);
    }
};

exports.create = async (req, res) => {
    try {
        const {
            cedula,
            nombre,
            correo,
            sexo,
            agencia,
            fecha_nacimiento,
            rol,
        } = req.body;

        if (!nombre || !sexo) {
            return fail(res, 'Nombre y sexo son obligatorios', 400);
        }
        if (!cedula) {
            return fail(res, 'La cédula es obligatoria', 400);
        }

        const resultado = await Participante.create({
            evento_id: req.params.eventoId,
            cedula: String(cedula).trim(),
            nombre: String(nombre).trim(),
            correo: correo || null,
            sexo,
            agencia: agencia || null,
            fecha_nacimiento: fecha_nacimiento || null,
            rol: rol || 'usuario',
        });

        return ok(
            res,
            {
                participante: resultado.participante,
                passwordInicial: resultado.passwordInicial,
                usuarioExistente: resultado.usuarioExistente,
            },
            'Participante creado',
            201
        );
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return fail(
                res,
                'Ya existe un participante con esa cédula en este evento',
                409
            );
        }
        if (error.code === 'INSCRIPCIONES_CERRADAS') {
            return fail(res, error.message, 409);
        }
        if (error.code === 'EVENTO_NO_EXISTE') {
            return fail(res, error.message, 404);
        }
        return fail(res, 'Error al crear participante', 500, error.message);
    }
};


exports.importarExcel = async (req, res) => {
    if (!req.file) return fail(res, 'Debe adjuntar un archivo Excel en el campo "excel"');

    const filePath = req.file.path;
    const eventoId = req.params.eventoId;

    try {
        const evento = await Evento.findById(eventoId);
        if (!evento) {
            fs.unlinkSync(filePath);
            return fail(res, 'Juego no encontrado', 404);
        }
        if (evento.estado !== 'borrador') {
            fs.unlinkSync(filePath);
            return fail(res, 'El juego ya inició y no acepta más participantes', 409);
        }

        const { participantes, errores } = await parsearExcelParticipantes(filePath);

        if (participantes.length === 0) {
            fs.unlinkSync(filePath);
            return fail(res, 'El Excel no contiene participantes válidos', 400, errores);
        }

        const creados = [];
        const fallidos = [...errores];

        for (const p of participantes) {
            try {
                const { participante, passwordInicial, usuarioExistente } =
                    await Participante.create({
                        evento_id: eventoId,
                        cedula: p.cedula,
                        nombre: p.nombre,
                        correo: p.correo,
                        sexo: p.sexo,
                        agencia: p.agencia,
                        fecha_nacimiento: p.fecha_nacimiento,
                        rol: p.rol,
                    });

                creados.push({
                    id: participante.id,
                    nombre: participante.nombre,
                    cedula: participante.cedula,
                    passwordInicial,
                    usuarioExistente,
                });
            } catch (err) {
                fallidos.push(`Fila ${p.fila} (${p.nombre}): ${err.message}`);
            }
        }

        fs.unlinkSync(filePath);

        return ok(
            res,
            { total: participantes.length, creados, errores: fallidos },
            `Importados ${creados.length} de ${participantes.length} participantes`,
        );
    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return fail(res, 'Error al procesar el Excel', 500, error.message);
    }
};

exports.update = async (req, res) => {
    try {
        const participante = await Participante.findById(req.params.id);
        if (!participante) return fail(res, 'Participante no encontrado', 404);
        const evento = await Evento.findById(participante.evento_id);
        if (evento?.estado !== 'borrador') {
            return fail(res, 'El juego ya inició y sus participantes están bloqueados', 409);
        }
        const actualizado = await Participante.update(req.params.id, req.body);
        if (!actualizado) return fail(res, 'Participante no encontrado o sin cambios', 404);
        return ok(res, null, 'Participante actualizado');
    } catch (error) {
        return fail(res, 'Error al actualizar participante', 500, error.message);
    }
};

exports.delete = async (req, res) => {
    try {
        const participante = await Participante.findById(req.params.id);
        if (!participante) return fail(res, 'Participante no encontrado', 404);
        const evento = await Evento.findById(participante.evento_id);
        if (evento?.estado !== 'borrador') {
            return fail(res, 'El juego ya inició y sus participantes están bloqueados', 409);
        }
        const eliminado = await Participante.delete(req.params.id);
        if (!eliminado) return fail(res, 'Participante no encontrado', 404);
        return ok(res, null, 'Participante eliminado');
    } catch (error) {
        return fail(res, 'Error al eliminar participante', 500, error.message);
    }
};