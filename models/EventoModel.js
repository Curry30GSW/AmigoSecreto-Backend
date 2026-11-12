const pool = require('../config/ConectDb');

class Evento {
    static async findAll() {
        const [rows] = await pool.query(
            'SELECT * FROM eventos ORDER BY creado_en DESC'
        );
        return rows;
    }

    static async findById(id, connection = pool) {
        const [rows] = await connection.query(
            'SELECT * FROM eventos WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0];
    }

    static async findByUsuario(cedula, eventoId = null) {
        const condiciones = ['p.cedula = ?', 'p.estado = 1'];
        const valores = [cedula];
        if (eventoId !== null) {
            condiciones.push('e.id = ?');
            valores.push(eventoId);
        }

        const [rows] = await pool.query(
            `SELECT e.*, p.id AS participante_id, p.nombre AS participante_nombre,
                    COALESCE(a.revelado, 0) AS revelado
             FROM eventos e
             JOIN participantes p ON p.evento_id = e.id
             LEFT JOIN asignaciones a
               ON a.evento_id = e.id AND a.participante_id = p.id
             WHERE ${condiciones.join(' AND ')}
             ORDER BY e.creado_en DESC`,
            valores
        );
        return rows;
    }

    static async create({ nombre, descripcion = '', fecha_evento = null }) {
        const [result] = await pool.query(
            `INSERT INTO eventos (nombre, descripcion, fecha_evento)
       VALUES (?, ?, ?)`,
            [nombre, descripcion, fecha_evento]
        );
        return this.findById(result.insertId);
    }

    static async updateEstado(id, estado) {
        await pool.query('UPDATE eventos SET estado = ? WHERE id = ?', [estado, id]);
    }

    static async delete(id) {
        const [r] = await pool.query('DELETE FROM eventos WHERE id = ?', [id]);
        return r.affectedRows > 0;
    }

    static async updateAsignacionAutomatica(id, fecha) {
        await pool.query(
            `UPDATE eventos
     SET fecha_asignacion_automatica = ?, asignacion_automatica_ejecutada = 0
     WHERE id = ?`,
            [fecha, id]
        );
    }

    static async findEventosPendientesAutomatico() {
        const [rows] = await pool.query(
            `SELECT * FROM eventos
     WHERE fecha_asignacion_automatica IS NOT NULL
       AND asignacion_automatica_ejecutada = 0
       AND fecha_asignacion_automatica <= NOW()`
        );
        return rows;
    }

    static async marcarAutomaticoEjecutado(id) {
        await pool.query(
            'UPDATE eventos SET asignacion_automatica_ejecutada = 1 WHERE id = ?',
            [id]
        );
    }
}

module.exports = Evento;