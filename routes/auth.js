// routes/auth.js
const express = require('express');
const passport = require('passport');
const { crearUsuario, obtenerUsuarioPorId } = require('../models/Usuario');
const GitHubStrategy = require('passport-github2').Strategy;
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { isAuthenticated, checkRole } = require('../middlewares/auth');
const Paciente = require('../models/Paciente');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
//const upload = multer({ dest: 'uploads/' });
const pacienteController = require('../controllers/pacientesController');
//const upload = require('./middlewares/uploadMiddleware');

// Configuración de almacenamiento de archivos usando multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        // Renombramos el archivo para evitar conflictos (usamos la fecha actual)
        cb(null, Date.now() + path.extname(file.originalname));
    }
});;

const upload = multer({ storage: storage });


// Configuración de GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await obtenerUsuarioPorId(profile.id);
            if (!user) {
                let rol = 'paciente';
                if (profile.username.includes('admin')) {
                    rol = 'admin';
                } else if (profile.username.includes('admision')) {
                    rol = 'admisión';
                }
                else if (profile.username.includes('medico')) {
                    rol = 'medico';
                }
                user = await crearUsuario(profile.id, profile.displayName, profile.emails[0].value, profile.username, rol);
            }
            done(null, user);
        } catch (error) {
            done(error);
        }
    }
));

// Ejemplo de ruta que utiliza checkRole
/*router.get('/admin', isAuthenticated, checkRole('admin'), (req, res) => {
    res.render('admin'); // Renderiza la vista de admin si tiene permisos
});*/


// Ejemplo de una ruta que requiere autenticación y un rol específico
// router.get('/admin', isAuthenticated, checkRole('admin'), (req, res) => {
//     res.render('adminDashboard'); // Renderiza la vista del panel de administración
// });

// Ruta para el dashboard
/*router.get('/dashboard', isAuthenticated, (req, res) => {
    console.log(req.user); // Imprime el objeto del usuario para ver su rol
    res.render('dashboard', { user: req.user });
});*/

// Ruta para el dashboard
/*router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        console.log(req.user); // Imprime el objeto del usuario para ver su rol
        const turnos = await Paciente.obtenerTurnosDelPaciente(req.user.id); // Llama a la función del modelo
        res.render('dashboard', { user: req.user, turnos }); // Pasa también los turnos a la vista
    } catch (error) {
        console.error(error);
        res.render('dashboard', { user: req.user, turnos: [] }); // En caso de error, pasa un arreglo vacío
    }
});*/


// Mostrar formulario de inicio de sesión
// router.get('/login', (req, res) => {
//     res.render('login', { messages: {} });
// });

router.get('/loginPac', (req, res) => {
    res.render('loginPac', { messages: {} });
});

// Manejar el inicio de sesión
//router.post('/login', authController.loginPaciente);



router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            console.error('Error en autenticación:', info.message);
            return res.render('login', { messages: { error: info.message } });
        }

        // Verificar el rol del usuario antes de iniciar sesión
        if (user.rol === 'paciente' || user.rol === 'medico') {
            return res.render('login', { messages: { error: 'Acceso denegado para NO pacientes y medicos.' } });
        }

        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect('/dashboard');
        });
    })(req, res, next);
});


router.post('/loginPac', (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.render('loginPac', { messages: { error: info.message } });
        }

        try {
            const [paciente] = await db.query('SELECT idPaciente FROM pacientes WHERE idUsuario = ? AND Activo = 1', [user.id]);
            if (paciente.length === 0) {
                return res.render('loginPac', { messages: { error: 'Paciente no encontrado.' } });
            }

            if (user.rol === 'medico' || user.rol === 'admisión' || user.rol === 'admin') {
                return res.render('login', { messages: { error: 'Acceso denegado para NO pacientes.' } });
            }

            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }
                // Guardar idPaciente en la sesión
                req.session.idPaciente = paciente[0].idPaciente;
                console.log("ID de Paciente guardado en sesión:", req.session.idPaciente);
                return res.redirect('/dashboard');
            });
        } catch (error) {
            return next(error);
        }
    })(req, res, next);
});

router.get('/logMedico', (req, res) => {
    res.render('logMedico');
});


router.post('/loginMedico', async (req, res, next) => {  
    passport.authenticate('local', async (err, user, info) => {
        if (err) {
            return next(err);  // Si hay un error en la autenticación, lo pasamos a la siguiente función de manejo de errores
        }
        if (!user) {
            return res.render('logMedico', { messages: { error: info.message } }); // Si no hay un usuario, mostramos el error
        }

        try {
            // Obtener el idMedico asociado al idUsuario del usuario autenticado
            const [medico] = await db.query('SELECT idMedico FROM medicos WHERE idUsuario = ? AND Activo = 1', [user.id]);

            if (medico.length === 0) {
                return res.render('logMedico', { messages: { error: 'Médico no encontrado.' } });
            }

            // Iniciar sesión del usuario (esto es parte del flujo de Passport)
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);  // En caso de error al iniciar sesión, lo pasamos a la siguiente función
                }

                // Almacenar el idMedico en la sesión
                req.session.idMedico = medico[0].idMedico;
                console.log("ID de Medico guardado en sesión:", req.session.idMedico);

                // Redirigir al médico a la página de turnos confirmados
                return res.redirect('/turnos/turnos-confirmados');
            });
        } catch (error) {
            return next(error);  // Si ocurre un error en la consulta SQL, lo pasamos a la siguiente función
        }
    })(req, res, next); // Asegúrate de pasar next a la función de Passport para que maneje correctamente el flujo de autenticación
});






// Mostrar formulario de registro
router.get('/register', (req, res) => {
    const messages = req.session.messages;
    delete req.session.messages;
    res.render('register');
});

// Manejar el registro de usuarios
router.post('/register', async (req, res) => {
    const { email, username, password, rol } = req.body;

    const [existingUser] = await pool.query('SELECT * FROM usuarios WHERE username = ?', [username]);
    if (existingUser.length > 0) {
        return res.render('register', { messages: { error: 'El nombre de usuario ya existe.' } });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (!rol) {
        return res.render('register', { messages: { error: 'El rol es requerido.' } });
    }

    try {
        await pool.query('INSERT INTO usuarios ( email,username, password, rol, Activo) VALUES (?, ?, ?, ?, ?)', [email, username, hashedPassword, rol, 1]);

        res.redirect('/login');
        req.session.messages = { success: 'Usuario registrado con éxito.' };
        console.log(req.session.messages);
    } catch (error) {
        console.error(error);
        res.render('register', { messages: { error: 'Error al registrar el usuario.' } });
    }
});



// Ruta para cerrar sesión
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

// Mostrar formulario de registro como paciente
/*router.get('/registerPac', (req, res) => {
    res.render('registerPac');
});*/

router.get('/RegistroPacIndex', (req, res) => {
    res.render('RegistroPacIndex');
});


// Manejar el registro de usuarios
/*router.post('/registerComoPac', async (req, res) => {
    const { email, username, password } = req.body;

    try {
        // Verificar si el usuario ya existe
        const [existingUser] = await pool.query('SELECT * FROM usuarios WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.render('registerPac', { messages: { error: 'El nombre de usuario ya existe.' } });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Establecer rol automáticamente como "paciente"
        const rol = 'paciente';

        // Insertar nuevo usuario con rol "paciente"
        await pool.query(
            'INSERT INTO usuarios (nombre, email, username, password, rol) VALUES (?, ?, ?, ?, ?)',
            [req.body.nombre, email, username, hashedPassword, rol]
        );

        // Redireccionar a la página de login después de registrar al usuario
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.render('registerPac', { messages: { error: 'Error al registrar el usuario.' } });
    }
});*/

/*router.post('/registerComoPac', [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio.'),
    body('email').isEmail().withMessage('El correo no es válido.'),
    body('username').notEmpty().withMessage('El nombre de usuario es obligatorio.'),
    body('password').isLength({ min: 3 }).withMessage('La contraseña debe tener al menos 3 caracteres.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('registerPac', { messages: { error: errors.array().map(e => e.msg).join(', ') } });
    }

    const { nombre, email, username, password, rol } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const [existingUser] = await pool.query('SELECT * FROM usuarios WHERE username = ? OR email = ?', [username, email]);
        if (existingUser.length > 0) {
            return res.render('registerPac', { messages: { error: 'El nombre de usuario o correo ya existe.' } });
        }

        await pool.query('INSERT INTO usuarios (nombre, email, username, password, rol) VALUES (?, ?, ?, ?, ?)', [nombre, email, username, hashedPassword, rol || 'paciente']);
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.render('registerPac', { messages: { error: 'Error al registrar el usuario.' } });
    }
});*/

router.post('/registerComoPac', upload.single('documentoFotocopia'), pacienteController.registrarPacienteDefnitivo);

module.exports = router;
