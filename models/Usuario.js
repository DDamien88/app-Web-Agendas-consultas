// models/Usuario.js
const pool = require('../config/db');

async function crearUsuario(id, nombre, email, username, rol) {
    const [result] = await pool.query(
        'INSERT INTO usuarios (id, nombre, email, username, rol) VALUES (?, ?, ?, ?, ?)',
        [id, nombre, email, username, rol]
    );
    return result.insertId;
}

async function obtenerUsuarioPorId(id) {
    const [users] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    return users[0];
}

async function obtenerUsuarioPorRol(rol) {
    const [users] = await pool.query('SELECT * FROM usuarios WHERE rol = ? ', ["paciente"]);
    return users[0];
}

module.exports = {
    crearUsuario,
    obtenerUsuarioPorId,
    obtenerUsuarioPorRol
};
