const pool = require('../config/ConectDb');

const ejecutarCierreInscripciones = async () => {
    const connection = await pool.getConnection();
    try {
        const ahora = new Date();
        const fechaHoraActual = ahora.toISOString().slice(0, 19).replace('T', ' ');

        const [sorteos] = await connection.query(`
            SELECT id, nombre 
            FROM sorteos 
            WHERE cierre_automatico = TRUE 
            AND cierre_programado <= ?
            AND estado = 'programado'
            AND inscripciones_abiertas = TRUE
        `, [fechaHoraActual]);

        for (const sorteo of sorteos) {
            // Cerrar inscripciones
            await connection.query(`
                UPDATE sorteos 
                SET inscripciones_abiertas = FALSE,
                    cierre_automatico = FALSE,
                    cierre_programado = NULL
                WHERE id = ?
            `, [sorteo.id]);

            console.log(`🔒 Sorteo "${sorteo.nombre}" (ID: ${sorteo.id}) cerrado automáticamente`);
        }

        if (sorteos.length > 0) {
            console.log(`✅ ${sorteos.length} sorteos cerrados automáticamente`);
        }

    } catch (error) {
        console.error('❌ Error en ejecutarCierreInscripciones:', error);
    } finally {
        connection.release();
    }
};

module.exports = { ejecutarCierreInscripciones };