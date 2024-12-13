/*const express = require('express');
const session = require('express-session');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./config/db');
const usuariosRoutes = require('./routes/usuarios');
const medicosRoutes = require('./routes/medicos');
const turnosRoutes = require('./routes/turnos');
const pacientesRoutes = require('./routes/pacientes');
const horariosRoutes = require('./routes/horarios');
const agendasRoutes = require('./routes/agendas');
const authRoutes = require('./routes/auth');
const fs = require('fs');
const multer = require('multer');
const indexRouter = require('./routes/index');
const flash = require('connect-flash');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;

require('dotenv').config();

app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOrCreate({ githubId: profile.id }, {
                nombre: profile.displayName,
                email: profile.emails ? profile.emails[0].value : null,
                username: profile.username
            });
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

/*const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configura la carpeta 'uploads' para servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Configurar el motor de plantillas PUG
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true })); // Para analizar el cuerpo de las solicitudes
// En tu archivo principal (app.js o server.js)
/*app.use(session({
    secret: 'tu', // Cambia esto por un secreto fuerte
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Cambia a true si estás usando HTTPS
}));

// Configuración de flash
app.use(flash());
//app.use(session({ secret: 'tu_secreto', resave: false, saveUninitialized: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', './views');

app.use('/dashboard', authRoutes);

// Ruta para la página principal
app.get('/', (req, res) => {
    res.render('index');
});


app.get('/PagAgendaSL', (req, res) => {
    res.render('PagAgendaSL');
});

// Manejar rutas no encontradas
/*app.use((req, res) => {
    res.status(404).render('404', { title: 'Página no encontrada' });
});

// Usar el router
app.use('/', indexRouter);

//app.use('/', usuariosRoutes); // Usar las rutas de usuarios
app.use('/medicos', medicosRoutes);

app.use('/turnos', turnosRoutes);

app.use('/pacientes', pacientesRoutes);

app.use('/horarios', horariosRoutes);

app.use('/usuarios', usuariosRoutes);

app.use('/agendas', agendasRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});*/

// OPCIÓN 2

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const flash = require('connect-flash');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('./models/Usuario');
const isAuthenticated = require('./middlewares/auth');
const passportConfig = require('./config/passport');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Rutas
const usuariosRoutes = require('./routes/usuarios');
const medicosRoutes = require('./routes/medicos');
const turnosRoutes = require('./routes/turnos');
const pacientesRoutes = require('./routes/pacientes');
const horariosRoutes = require('./routes/horarios');
const agendasRoutes = require('./routes/agendas');
const authRoutes = require('./routes/auth');
const indexRouter = require('./routes/index');
const dashboardRoutes = require('./routes/dashboard');

// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'tu-secreto-aqui',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(flash());
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    next();
});

// Inicialización de Passport
app.use(passport.initialize());
app.use(passport.session());

// Configuración de GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOrCreate({ githubId: profile.id }, {
                nombre: profile.displayName,
                email: profile.emails ? profile.emails[0].value : null,
                username: profile.username
            });
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

// Serialización y deserialización del usuario
passport.serializeUser((user, done) => done(null, user));
//passport.deserializeUser((obj, done) => done(null, obj));
passport.deserializeUser((obj, done) => {
    User.findById(obj.id).then(user => {
        done(null, { id: user.id, role: user.role });
    }).catch(err => done(err));
});



// Configuración de PUG
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
app.use('/', indexRouter);
app.use('/auth', authRoutes);
app.use('/medicos', medicosRoutes);
app.use('/turnos', turnosRoutes);
app.use('/pacientes', pacientesRoutes);
app.use('/horarios', horariosRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/agendas', agendasRoutes);
app.use('/dashboard', dashboardRoutes);

// Middleware para manejar errores 404
app.use((req, res, next) => {
    res.status(404).send('Página no encontrada');
});

// Ruta de inicio de sesión
// app.get('/', (req, res) => {
//     res.render('login');
// });

// Ruta del dashboard
// app.get('/dashboard', isAuthenticated, (req, res) => {
//     res.render('dashboard', { user: req.user });
// });

// Página de Agenda de San Luis
app.get('/PagAgendaSL', (req, res) => {
    res.render('PagAgendaSL');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});