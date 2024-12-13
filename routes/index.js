const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');

router.get('/', (req, res) => {
    res.render('login');
});

// Importa el controlador si es necesario
const { showRegisterPage } = require('../controllers/registerController');

// Ruta para la página de registro
router.get('/register', showRegisterPage);


// Ruta para mostrar el formulario de inicio de sesión
router.get('/login', (req, res) => {
    res.render('login', { title: 'Iniciar Sesión' });
});

// Ruta para manejar el inicio de sesión
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Buscar el usuario por email
        const [user] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

        // Verificar si el usuario existe
        if (user.length === 0) {
            return res.status(401).send('Usuario no encontrado');
        }

        // Obtener la contraseña hash del usuario
        const hash = user[0].password; // Asegúrate de que este campo sea correcto

        // Comparar la contraseña proporcionada con el hash
        const match = await bcrypt.compare(password, hash);

        if (!match) {
            return res.status(401).send('Contraseña incorrecta');
        }

        // Iniciar sesión
        req.session.userId = user[0].id; // Ajusta según tu modelo de usuario
        res.redirect('/PagAgendaSL'); // Redirigir a la página principal después de iniciar sesión

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
});


router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Verifica si el usuario ya existe
        const [existingUser] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existingUser) {
            return res.render('register', { title: 'Register', error: 'El usuario ya existe' });
        }

        // Hashea la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserta el nuevo usuario en la base de datos
        await db.query('INSERT INTO usuarios (email, password) VALUES (?, ?)', [email, hashedPassword]);

        res.redirect('/login'); // Redirige a la página de inicio de sesión después del registro
    } catch (error) {
        console.error(error);
        res.render('register', { title: 'Register', error: 'Error al registrar el usuario' });
    }
});

module.exports = router;