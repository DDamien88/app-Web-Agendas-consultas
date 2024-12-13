// config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const pool = require('./db');

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const [users] = await pool.query('SELECT * FROM usuarios WHERE username = ?', [username]);
            const user = users[0];

            if (!user) {
                return done(null, false, { message: 'Usuario no encontrado.' });
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return done(null, false, { message: 'Contraseña incorrecta.' });
            }

            //console.log('Usuario autenticado:', user);
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

/*passport.serializeUser((user, done) => {
    // Serializa tanto `user.id` como `user.idPaciente` en la sesión
    done(null, { id: user.id, idPaciente: user.idPaciente });
    console.log('Serializado:', { id: user.id, idPaciente: user.idPaciente });
});*/

/*passport.deserializeUser(async (sessionData, done) => {
    try {
        // Recupera el usuario usando `id` desde la base de datos
        const [users] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [sessionData.id]);
        const user = users[0];

        if (user) {
            // Asigna `idPaciente` a `user` desde los datos de sesión
            user.idPaciente = sessionData.idPaciente;
        }
        console.log('Deserializado:', user);
        done(null, user);
    } catch (error) {
        done(error);
    }
});*/

// Versión 2
passport.serializeUser((user, done) => {
    done(null, { id: user.id, idPaciente: user.idPaciente });
    //console.log('Usuario serializado:', { id: user.id, idPaciente: user.idPaciente });
});

passport.deserializeUser(async (sessionData, done) => {
    try {
        // Recupera el usuario usando `id` desde la base de datos
        const [users] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [sessionData.id]);
        const user = users[0];

        if (!user) {
            return done(null, false, { message: 'Usuario no encontrado.' });
        }

        // Busca el idPaciente relacionado con el idUsuario en la tabla pacientes
        const [pacientes] = await pool.query('SELECT idPaciente FROM pacientes WHERE idUsuario = ?', [user.id]);
        const paciente = pacientes[0];

        // Agrega el idPaciente al objeto del usuario
        if (paciente) {
            user.idPaciente = paciente.idPaciente;
        } else {
            user.idPaciente = null;
        }

        // console.log('Usuario autenticado:', user);
        // console.log('Usuario serializado:', sessionData);
        // console.log('Usuario deserializado:', user);
        done(null, user);
    } catch (error) {
        console.error('Error en la deserialización:', error);
        done(error, null);
    }
});


module.exports = passport;
