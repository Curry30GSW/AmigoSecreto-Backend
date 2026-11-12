const axios = require('axios');

const SIGMA_API_URL = process.env.SIGMA_SMS_API_URL || 'https://aio2.sigmamovil.com/api/sms';
const SIGMA_API_KEY = process.env.SIGMA_SMS_API_KEY;
const SIGMA_EMAIL_ACCOUNT = process.env.SIGMA_SMS_EMAIL || 'notificaciones@coopserp.com.co';


const limpiarCelular = (celular) => {
    let limpio = String(celular).replace(/\D/g, '');
    if (limpio.length === 12 && limpio.startsWith('57')) {
        limpio = limpio.substring(2);
    }
    return limpio;
};

const construirNombreEnvio = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fecha = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`;
    const hora = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${now.getMilliseconds()}`;
    return `${fecha} ${hora}`;
};

/**
 * Envía un SMS individual a través de Sigma Móvil.
 * @param {string} celular - Número de celular (10 dígitos, sin indicativo)
 * @param {string} mensaje - Texto del mensaje
 */
const sendSms = async (celular, mensaje) => {
    const celularLimpio = limpiarCelular(celular);

    if (!celularLimpio || celularLimpio.length !== 10) {
        throw new Error(`Número de celular inválido: ${celular}`);
    }

    const now = new Date();
    const scheduleDate = now.toISOString().slice(0, 19).replace('T', ' ');

    const data = {
        idSmsCategory: 1,
        name: construirNombreEnvio(),
        receiver: [
            {
                indicative: 57,
                phone: celularLimpio,
                message: mensaje,
            },
        ],
        scheduleDate,
        dateNow: 1,
        type: 'lote',
        track: 0,
        sendPush: 0,
        api: 1,
        notification: 0,
        email: SIGMA_EMAIL_ACCOUNT,
        rne: 0,
    };

    try {
        const response = await axios.post(SIGMA_API_URL, data, {
            headers: {
                Authorization: `Bearer ${SIGMA_API_KEY}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            timeout: 15000,
        });
        return { success: true, celular: celularLimpio, respuesta: response.data };
    } catch (error) {
        const detalle = error.response?.data || error.message;
        console.error(`❌ Error enviando SMS a ${celularLimpio}:`, detalle);
        throw new Error(typeof detalle === 'string' ? detalle : JSON.stringify(detalle));
    }
};

/**
 * Envía el mismo mensaje a múltiples números, uno por uno,
 * devolviendo un resumen de éxitos y fallos.
 */
const sendSmsMasivo = async (destinatarios) => {
    const resultados = { enviados: 0, fallidos: 0, detalles: [] };

    for (const dest of destinatarios) {
        try {
            await sendSms(dest.celular, dest.mensaje);
            resultados.enviados++;
            resultados.detalles.push({ celular: dest.celular, ok: true });
        } catch (error) {
            resultados.fallidos++;
            resultados.detalles.push({ celular: dest.celular, ok: false, error: error.message });
        }
    }

    return resultados;
};

module.exports = { sendSms, sendSmsMasivo, limpiarCelular };