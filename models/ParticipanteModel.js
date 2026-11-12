const pool = require('../config/ConectDb');
const Usuario = require('./UsuarioModel');
const { crearUsuarioDesdeParticipante } = require('../services/AutoUserService');

class Participante {
    static async findByEvento(eventoId, connection = pool) {
        const [rows] = await connection.query(
            'SELECT * FROM participantes WHERE evento_id = ? ORDER BY id DESC',
            [eventoId]
        );
        return rows;
    }

    static async findByCedulaYEvento(cedula, eventoId) {
        const [rows] = await pool.query(
            'SELECT * FROM participantes WHERE cedula = ? AND evento_id = ? AND estado = 1 LIMIT 1',
            [cedula, eventoId]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM participantes WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0];
    }

    static calcularEdad(fechaNacimiento) {
        if (!fechaNacimiento) return null;
        const hoy = new Date();
        const nac = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return edad;
    }

    static async create(data) {
        const {
            evento_id, cedula, nombre, correo = null, sexo,
            agencia = null, fecha_nacimiento = null, rol = 'usuario',
        } = data;

        const edad = this.calcularEdad(fecha_nacimiento);
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            const [eventos] = await conn.query(
                'SELECT id, estado FROM eventos WHERE id = ? FOR UPDATE',
                [evento_id]
            );
            if (!eventos[0]) {
                const error = new Error('El juego no existe');
                error.code = 'EVENTO_NO_EXISTE';
                throw error;
            }
            if (eventos[0].estado !== 'borrador') {
                const error = new Error('El juego ya inició y no acepta más participantes');
                error.code = 'INSCRIPCIONES_CERRADAS';
                throw error;
            }

            // 1) Insertar participante
            const [result] = await conn.query(
                `INSERT INTO participantes
          (evento_id, cedula, nombre, correo, sexo, agencia,
           fecha_nacimiento, edad, rol)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    evento_id, cedula, nombre, correo, sexo,
                    agencia, fecha_nacimiento, edad, rol,
                ]
            );

            const [rows] = await conn.query(
                'SELECT * FROM participantes WHERE id = ?',
                [result.insertId]
            );
            const participante = rows[0];

            // 2) Crear (o sincronizar) el usuario global
            const resultadoUsuario = await crearUsuarioDesdeParticipante(conn, participante);
            if (resultadoUsuario.error) {
                throw new Error(resultadoUsuario.error);
            }

            await conn.commit();

            return {
                participante,
                passwordInicial: resultadoUsuario.passwordPlano || null,
                usuarioExistente: !!resultadoUsuario.actualizado,
            };
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }

    static async update(id, datos) {
        const permitidos = [
            'nombre', 'correo', 'sexo', 'agencia',
            'fecha_nacimiento', 'rol', 'estado', 'cedula',
        ];
        const campos = [];
        const valores = [];

        for (const key of permitidos) {
            if (datos[key] !== undefined) {
                campos.push(`${key} = ?`);
                valores.push(datos[key]);
            }
        }
        if (datos.fecha_nacimiento !== undefined) {
            campos.push('edad = ?');
            valores.push(this.calcularEdad(datos.fecha_nacimiento));
        }
        if (!campos.length) return false;
        valores.push(id);

        const [r] = await pool.query(
            `UPDATE participantes SET ${campos.join(', ')} WHERE id = ?`,
            valores
        );

        if (r.affectedRows > 0) {
            const actualizado = await this.findById(id);
            // Sincronizar al usuario global
            const conn = await pool.getConnection();
            try {
                await crearUsuarioDesdeParticipante(conn, actualizado);
            } finally {
                conn.release();
            }
        }

        return r.affectedRows > 0;
    }


    static async delete(id) {
        const [r] = await pool.query('DELETE FROM participantes WHERE id = ?', [id]);
        return r.affectedRows > 0;
    }
}

module.exports = Participante;