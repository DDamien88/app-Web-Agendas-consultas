// routes/usuarios.js
const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/registerController');

// Ruta para mostrar el formulario de registro
router.get('/register', (req, res) => {
    res.render('register', { title: 'Registrar Usuario' });
});

// Ruta para manejar el registro del usuario
router.post('/register', registerUser);

// Definir rutas específicas para usuarios
router.get('/', (req, res) => {
    res.send('Listado de usuarios');
});

module.exports = router;
