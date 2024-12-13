// config/feriados.js
const feriados = [
    '2025-01-01', // Año Nuevo
    '2025-02-12', // Carnaval
    '2025-03-24', // Día Nacional de la Memoria
    '2025-04-14', // Malvinas
    '2025-05-01', // Día del Trabajador
    '2025-05-25', // Revolución de Mayo
    '2025-06-17', // Paso a la Inmortalidad del General Martín Miguel de Güemes
    '2025-06-20', // Paso a la Inmortalidad del General Manuel Belgrano
    '2025-07-09', // Día de la Independencia
    '2025-08-17', // Paso a la Inmortalidad del General José de San Martín
    '2025-10-12', // Día del Respeto a la Diversidad Cultural
    '2025-11-20', // Día de la Soberanía Nacional
    '2025-12-08', // Inmaculada Concepción de María
    '2024-12-25', // Navidad
];

function esFeriado(fecha) {
    return feriados.includes(fecha);
}

module.exports = { esFeriado };
