const pool = require('../config/ConectDb');

class Asignacion {
    static async findByEvento(eventoId) {
        const [rows] = await pool.query(
            `SELECT a.id, a.participante_id, p.nombre AS usuario,
              p.nombre AS participante_nombre, p.sexo AS sexoUsuario,
              p.sexo AS participante_sexo,
              a.amigo_secreto_id, s.nombre AS amigo, s.nombre AS amigo_nombre,
              s.sexo AS sexoAmigo, s.sexo AS amigo_sexo, a.revelado,
              (SELECT GROUP_CONCAT(d.descripcion ORDER BY d.creado_en SEPARATOR '\\n')
               FROM deseos d WHERE d.participante_id = s.id) AS listaDeseos,
              (SELECT GROUP_CONCAT(u.descripcion ORDER BY u.creado_en SEPARATOR '\\n')
               FROM dulces u WHERE u.participante_id = s.id) AS listaDulces
       FROM asignaciones a
       JOIN participantes p ON p.id = a.participante_id
       JOIN participantes s ON s.id = a.amigo_secreto_id
       WHERE a.evento_id = ?`,
            [eventoId]
        );
        return rows;
    }

    static async findByParticipante(eventoId, participanteId) {
        const [rows] = await pool.query(
            `SELECT a.*, s.nombre AS amigo_nombre, s.sexo AS amigo_sexo, s.id AS amigo_id
     FROM asignaciones a
     JOIN participantes s ON s.id = a.amigo_secreto_id
     WHERE a.evento_id = ? AND a.participante_id = ?
     LIMIT 1`,
            [eventoId, participanteId]
        );
        return rows[0];
    }

    static async replaceAll(eventoId, asignaciones, connection = null) {
        const conn = connection || await pool.getConnection();
        try {
            if (!connection) await conn.beginTransaction();
            await conn.query('DELETE FROM asignaciones WHERE evento_id = ?', [eventoId]);

            for (const { participanteId, amigoSecretoId } of asignaciones) {
                await conn.query(
                    `INSERT INTO asignaciones (evento_id, participante_id, amigo_secreto_id)
           VALUES (?, ?, ?)`,
                    [eventoId, participanteId, amigoSecretoId]
                );
            }
            if (!connection) await conn.commit();
        } catch (e) {
            if (!connection) await conn.rollback();
            throw e;
        } finally {
            if (!connection) conn.release();
        }
    }

    static async marcarRevelado(eventoId, participanteId) {
        await pool.query(
            'UPDATE asignaciones SET revelado = 1 WHERE evento_id = ? AND participante_id = ?',
            [eventoId, participanteId]
        );
    }


    static async contarAsignaciones(eventoId) {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS total FROM asignaciones WHERE evento_id = ?',
            [eventoId]
        );
        return rows[0].total;
    }

    static async obtenerAsignadosIds(eventoId) {
        const [rows] = await pool.query(
            'SELECT participante_id, amigo_secreto_id FROM asignaciones WHERE evento_id = ?',
            [eventoId]
        );
        return rows;
    }

    static async ejecutarGlobal(eventoId, participantes, asignacionesExistentes) {
        const { generarSorteoParcial } = require('../services/SorteoService');
        const nuevas = generarSorteoParcial(participantes, asignacionesExistentes);

        if (nuevas.length === 0) return [];

        const conn = await pool.getConnection();
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
            return nuevas;
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }
}

module.exports = Asignacion;