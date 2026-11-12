const ok = (res, data, message = 'OK', status = 200) => {
    return res.status(status).json({ success: true, message, data });
};

const fail = (res, message, status = 500, detail = null) => {
    return res.status(status).json({
        success: false,
        message,
        ...(detail ? { detail } : {}),
    });
};

module.exports = { ok, fail };