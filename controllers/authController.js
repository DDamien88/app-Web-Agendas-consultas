// controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcrypt');

exports.loginPaciente = async (req, res) => {
    const { username, password } = req.body;
    console.log('Datos de inicio de sesión:', { username, password });

    try {
        // Verifica las credenciales del paciente en la base de datos
        const [usuario] = await db.query('SELECT * FROM usuarios WHERE username = ?', [username]);

        if (usuario.length > 0) {
            // Compara la contraseña ingresada con la contraseña hasheada
            const match = await bcrypt.compare(password, usuario[0].password);

            if (match) {
                // Asigna los datos del paciente a la sesión
                req.session.usuario = {
                    idPaciente: usuario[0].idPaciente,
                    nombre: usuario[0].username,

                };
                req.flash('success', 'Inicio de sesión exitoso');
                return res.redirect('/medicos/medicosDesdePac');
            } else {
                req.flash('error', 'Credenciales incorrectas');
                return res.redirect('/login');
            }
        } else {
            req.flash('error', 'Credenciales incorrectas');
            return res.redirect('/login');
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        req.flash('error', 'Error interno del servidor');
        return res.redirect('/login');
    }
};
