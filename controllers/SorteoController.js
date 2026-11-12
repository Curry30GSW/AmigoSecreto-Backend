const Evento = require('../models/EventoModel');
const Participante = require('../models/ParticipanteModel');
const Asignacion = require('../models/AsignacionModel');
const Deseo = require('../models/DeseoModel');
const Dulce = require('../models/DulceModel');
const pool = require('../config/ConectDb');
const { generarSorteoParcial } = require('../services/SorteoService');
const { generarExcelAsignaciones } = require('../services/ExcelService');
const { generarAsignacionIndividual } = require('../services/generarAsignacionIndividual');
const { ok, fail } = require('../utils/Response');


exports.iniciarJuego = async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [eventos] = await conn.query(
            'SELECT id, estado FROM eventos WHERE id = ? FOR UPDATE',
            [id]
        );
        if (!eventos[0]) throw Object.assign(new Error('Evento no encontrado'), { code: 'NO_EXISTE' });

        if (eventos[0].estado !== 'borrador') {
            throw Object.assign(
                new Error('Este juego ya fue iniciado o está finalizado'),
                { code: 'YA_INICIADO' }
            );
        }

        // Verificar que haya al menos 2 participantes activos
        const [participantes] = await conn.query(
            'SELECT COUNT(*) AS total FROM participantes WHERE evento_id = ? AND estado = 1',
            [id]
        );
        if (participantes[0].total < 2) {
            throw Object.assign(
                new Error('Se necesitan al menos 2 participantes para iniciar'),
                { code: 'SIN_PARTICIPANTES' }
            );
        }
        await conn.query("UPDATE eventos SET estado = 'en_curso' WHERE id = ?", [id]);
        await conn.commit();

        return ok(res, { estado: 'en_curso' }, 'Juego iniciado. Cada persona debe girar su ruleta.');
    } catch (error) {
        await conn.rollback();
        if (error.code === 'NO_EXISTE') return fail(res, error.message, 404);
        if (error.code === 'YA_INICIADO') return fail(res, error.message, 409);
        if (error.code === 'SIN_PARTICIPANTES') return fail(res, error.message, 400);
        return fail(res, 'Error al iniciar el juego', 500, error.message);
    } finally {
        conn.release();
    }
};

exports.getAsignaciones = async (req, res) => {
    try {
        const rows = await Asignacion.findByEvento(req.params.id);
        return ok(res, rows);
    } catch (error) {
        return fail(res, 'Error al listar asignaciones', 500, error.message);
    }
};

exports.getMiResultado = async (req, res) => {
    try {
        const participante = await Participante.findByCedulaYEvento(
            req.usuario.cedula,
            req.params.id
        );
        if (!participante) return fail(res, 'No estás inscrito en este juego', 403);

        const asignacion = await Asignacion.findByParticipante(
            req.params.id,
            participante.id
        );
        if (!asignacion || !asignacion.revelado) return ok(res, null);

        const [deseos, dulces] = await Promise.all([
            Deseo.findByParticipante(asignacion.amigo_id),
            Dulce.findByParticipante(asignacion.amigo_id),
        ]);
        return ok(res, {
            id: asignacion.amigo_id,
            nombre: asignacion.amigo_nombre,
            sexo: asignacion.amigo_sexo,
            deseos: deseos.map(d => ({
                id: d.id,
                descripcion: d.descripcion,
                comprado: !!d.comprado,
            })),
            dulces: dulces.map(d => ({
                id: d.id,
                descripcion: d.descripcion,
                comprado: !!d.comprado,
            })),
        });
    } catch (error) {
        return fail(res, 'Error al consultar tu resultado', 500, error.message);
    }
};

exports.exportarExcel = async (req, res) => {
    const { id } = req.params;
    try {
        const evento = await Evento.findById(id);
        if (!evento) return fail(res, 'Evento no encontrado', 404);

        const asignaciones = await Asignacion.findByEvento(id);

        const filas = asignaciones.map(a => ({
            participante: a.participante_nombre,
            sexo: a.participante_sexo === 'masculino'
                ? 'Masculino'
                : a.participante_sexo === 'femenino'
                    ? 'Femenino'
                    : 'Otro',
            amigo: a.amigo_nombre,
            amigoSexo: a.amigo_sexo === 'masculino'
                ? 'Masculino'
                : a.amigo_sexo === 'femenino'
                    ? 'Femenino'
                    : 'Otro',
            deseos: a.listaDeseos || '',
            dulces: a.listaDulces || '',
        }));

        await generarExcelAsignaciones(evento, filas, res);
    } catch (error) {
        return fail(res, 'Error al exportar Excel', 500, error.message);
    }
};

exports.girar = async (req, res) => {
    const { id, participanteId } = req.params;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Estado del evento
        const [eventos] = await conn.query(
            'SELECT id, estado FROM eventos WHERE id = ? FOR UPDATE',
            [id]
        );
        if (!eventos[0]) throw Object.assign(new Error('Evento no encontrado'), { code: 'NO_EXISTE' });
        if (eventos[0].estado === 'borrador') {
            throw Object.assign(new Error('El juego aún no ha iniciado'), { code: 'NO_INICIADO' });
        }
        if (eventos[0].estado === 'finalizado') {
            throw Object.assign(new Error('El juego ya finalizó'), { code: 'FINALIZADO' });
        }

        // 2. ¿Ya giró?
        const [yaGiro] = await conn.query(
            'SELECT id FROM asignaciones WHERE evento_id = ? AND participante_id = ? LIMIT 1',
            [id, participanteId]
        );
        if (yaGiro.length > 0) {
            throw Object.assign(new Error('Ya giraste tu ruleta'), { code: 'YA_GIRO' });
        }

        // 3. Buscar candidatos disponibles
        const [participantes] = await conn.query(
            `SELECT id, sexo FROM participantes
       WHERE evento_id = ? AND estado = 1`,
            [id]
        );

        const [asignacionesExistentes] = await conn.query(
            'SELECT participante_id, amigo_secreto_id FROM asignaciones WHERE evento_id = ?',
            [id]
        );

        const participante = participantes.find(p => p.id === Number(participanteId));
        if (!participante) throw Object.assign(new Error('Participante no encontrado'), { code: 'NO_PARTICIPANTE' });

        // 4. Generar asignación SOLO para este participante
        const resultado = generarAsignacionIndividual(
            participante,
            participantes,
            asignacionesExistentes
        );

        if (!resultado) {
            throw Object.assign(
                new Error('No hay suficientes personas disponibles para asignar'),
                { code: 'SIN_DISPONIBLES' }
            );
        }

        // 5. Guardar la asignación
        await conn.query(
            `INSERT INTO asignaciones (evento_id, participante_id, amigo_secreto_id, revelado)
       VALUES (?, ?, ?, 1)`,
            [id, resultado.participanteId, resultado.amigoSecretoId]
        );

        // 6. ¿Ya giraron todos?
        const [conteo] = await conn.query(
            `SELECT
        (SELECT COUNT(*) FROM participantes WHERE evento_id = ? AND estado = 1) AS total,
        (SELECT COUNT(*) FROM asignaciones WHERE evento_id = ?) AS girados`,
            [id, id]
        );
        if (conteo[0].girados >= conteo[0].total) {
            await conn.query("UPDATE eventos SET estado = 'finalizado' WHERE id = ?", [id]);
        }

        await conn.commit();

        // 7. Devolver los datos del amigo secreto (con deseos y dulces)
        const [amigo] = await conn.query(
            'SELECT * FROM participantes WHERE id = ?',
            [resultado.amigoSecretoId]
        );
        const [deseos] = await conn.query(
            'SELECT id, descripcion, comprado FROM deseos WHERE participante_id = ?',
            [resultado.amigoSecretoId]
        );
        const [dulces] = await conn.query(
            'SELECT id, descripcion, comprado FROM dulces WHERE participante_id = ?',
            [resultado.amigoSecretoId]
        );

        return ok(res, {
            amigoSecreto: {
                id: amigo[0].id,
                nombre: amigo[0].nombre,
                sexo: amigo[0].sexo,
                deseos: deseos.map(d => ({ ...d, comprado: !!d.comprado })),
                dulces: dulces.map(d => ({ ...d, comprado: !!d.comprado })),
            },
        }, '¡Aquí está tu amigo secreto!');
    } catch (error) {
        await conn.rollback();
        const status =
            error.code === 'NO_EXISTE' || error.code === 'NO_PARTICIPANTE' ? 404 :
                error.code === 'YA_GIRO' || error.code === 'FINALIZADO' ? 409 :
                    error.code === 'NO_INICIADO' || error.code === 'SIN_DISPONIBLES' ? 400 : 500;
        return fail(res, error.message, status);
    } finally {
        conn.release();
    }
};

exports.asignarFaltantes = async (eventoId) => {
    // Llamado por el scheduler, NO por HTTP
    const participantes = await Participante.findByEvento(eventoId);
    const existentes = await Asignacion.obtenerAsignadosIds(eventoId);
    const nuevas = generarSorteoParcial(participantes, existentes);

    if (nuevas.length === 0) return 0;

    const conn = await require('../config/ConectDb').getConnection();
    try {
        await conn.beginTransaction();
        for (const a of nuevas) {
            await conn.query(
                `INSERT INTO asignaciones (evento_id, participante_id, amigo_secreto_id)
         VALUES (?, ?, ?)`,
                [eventoId, a.participanteId, a.amigoSecretoId]
            );
        }
        await conn.commit();
        return nuevas.length;
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
};