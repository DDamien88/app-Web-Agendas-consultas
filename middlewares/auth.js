// middlewares/auth.js
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'Debes iniciar sesión para acceder a esta página');
    res.redirect('/login');
}

function checkRole(role) {
    return (req, res, next) => {
        console.log('Usuario autenticado:', req.user);
        if (req.isAuthenticated() && req.user.role === role) {
            return next();
        } else {
            return res.status(403).send('No tienes permisos para acceder a esta página');
        }
    };
}


module.exports = { isAuthenticated, checkRole };
