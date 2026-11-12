const cron = require('node-cron');
const { ejecutarCierreInscripciones } = require('./ejecutarCierreInscripciones');

console.log('🔄 Inicializando todos los jobs programados...');


// =============================================
// JOB 1: CIERRE DE INSCRIPCIONES - Cada minuto
// =============================================
cron.schedule('* * * * *', async () => {
    try {
        await ejecutarCierreInscripciones();
    } catch (error) {
        console.error(`❌ Error en cierre de inscripciones:`, error.message);
    }
});


module.exports = {
    ejecutarCierreInscripciones
};