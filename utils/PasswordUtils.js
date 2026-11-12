const bcrypt = require('bcryptjs');

const hash = (plano) => bcrypt.hashSync(plano, 10);
const verificar = (plano, hashGuardado) => bcrypt.compareSync(plano, hashGuardado);

module.exports = { hash, verificar };