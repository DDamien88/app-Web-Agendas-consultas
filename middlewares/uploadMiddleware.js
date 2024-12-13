// middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// Configuración de Multer para definir el destino y el nombre de los archivos cargados
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Definir la carpeta donde se almacenarán los archivos cargados
        cb(null, 'uploads'); // Los archivos se guardarán en la carpeta 'uploads' en la raíz del proyecto
    },
    filename: (req, file, cb) => {
        // Establecer un nombre único para cada archivo cargado
        cb(null, Date.now() + path.extname(file.originalname)); // Ejemplo: 1631773645111.jpg
    }
});

// Crear el middleware de Multer para gestionar las cargas de archivos
const upload = multer({ storage: storage });

module.exports = upload;
