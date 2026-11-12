const COOKIE_NAME = 'amigo_secreto_token';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: String(process.env.COOKIE_SECURE).toLowerCase() === 'true',
    sameSite: 'lax',
    path: '/',
};
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000;

const optionsForSession = (remember = true) => ({
    ...COOKIE_OPTIONS,
    ...(remember ? { maxAge: COOKIE_MAX_AGE } : {}),
});

module.exports = { COOKIE_NAME, COOKIE_OPTIONS, optionsForSession };
