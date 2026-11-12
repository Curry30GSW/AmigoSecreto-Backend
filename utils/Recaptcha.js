exports.verificar = async (token) => {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
        console.warn('⚠️ RECAPTCHA_SECRET_KEY no definido: saltando validación (solo dev)');
        return true;
    }
    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
    });
    const data = await res.json();
    return data.success === true;
};