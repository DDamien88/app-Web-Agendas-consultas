// utilidades/utils.js
function formatDate(date) {
    const fecha = typeof date === 'string' ? new Date(date) : date;
    
    const opciones = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return fecha.toLocaleDateString('es-AR', opciones);
}

module.exports = { formatDate };
