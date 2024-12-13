const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');

exports.login = async (req, res) => {
    console.log(req.body); // Esto te mostrará el contenido del cuerpo de la solicitud

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }
};


exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    try {
        const usuario = await Usuario.findOne({ where: { email } });

        if (!usuario) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        const isMatch = await bcrypt.compare(password, usuario.password); // Aquí es donde se compara

        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // Lógica de inicio de sesión exitosa
        return res.status(200).json({ message: 'Inicio de sesión exitoso' });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
};
