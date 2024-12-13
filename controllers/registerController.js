
// controllers/registerControler.js
const db = require('../config/db'); // Ajusta la ruta según tu estructura de carpetas
const bcrypt = require('bcrypt');

exports.showRegisterPage = (req, res) => {
    res.render('register', { title: 'Registro' }); // Asegúrate de que 'register' es el nombre correcto de la vista
};

exports.registerUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [existingUser] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (existingUser.length > 0) {
            return res.status(400).send('El usuario ya existe.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO usuarios (email, password) VALUES (?, ?)', [email, hashedPassword]);

        // Redirigir al login después de registrar exitosamente
        res.redirect('/usuarios/login');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al registrar el usuario.');
    }
};
