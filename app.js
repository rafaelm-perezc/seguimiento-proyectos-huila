const express = require('express');
const path = require('path');
const open = require('open'); // Librería para abrir el navegador automáticamente

// IMPORTANTE: Ajustamos la ruta para buscar dentro de 'src/controllers'
const projectController = require('./src/controllers/projectController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar carpeta de archivos estáticos (CSS, JS del frontend, Imágenes)
// Asumimos que la carpeta 'public' está en la raíz, junto a app.js
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------
// RUTAS DE VISTAS (Páginas HTML)
// ---------------------------------------------------------

// Página Principal
app.get('/', projectController.index);

// Página de Estadísticas (NUEVA)
app.get('/estadisticas', projectController.statsView);


// ---------------------------------------------------------
// RUTAS DE API (Datos y Lógica)
// ---------------------------------------------------------

// 1. Búsquedas y Carga de Proyectos
app.get('/api/search', projectController.search);
app.get('/api/project/:bpin', projectController.getProject);
app.get('/api/activity-details/:activityId', projectController.getActivityDetails);

// 2. Guardado y Procesamiento
app.post('/api/save', projectController.saveData);
// Multer se usa dentro del controlador para la carga, pero aquí definimos la ruta
// Nota: Necesitamos configurar multer aquí si no está en el controlador, 
// pero en tu caso el controlador maneja 'req.file', así que necesitamos el middleware intermedio.
// VAMOS A AGREGAR LA CONFIGURACIÓN DE MULTER AQUÍ PARA QUE FUNCIONE LA CARGA:
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Carpeta temporal
app.post('/api/upload-excel', upload.single('archivoExcel'), projectController.uploadExcel);

app.get('/api/export-excel', projectController.exportExcel);

// 3. Catálogos (Municipios, Instituciones, etc.)
app.get('/api/municipios', projectController.getMunicipios);
app.get('/api/instituciones/:municipioId', projectController.getInstituciones);
app.get('/api/sedes/:institucionId', projectController.getSedes);
app.get('/api/indicadores', projectController.getIndicadores);

// 4. Datos para Estadísticas (NUEVO)
app.get('/api/stats/general', projectController.apiGetGeneralStats);
app.get('/api/stats/evolution', projectController.apiGetEvolution);


// ---------------------------------------------------------
// INICIAR SERVIDOR
// ---------------------------------------------------------
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    
    // Abrir el navegador automáticamente (útil para el ejecutable)
    // Solo si estamos en entorno de producción o ejecución local directa
    try {
        open(`http://localhost:${PORT}`);
    } catch (err) {
        console.log("No se pudo abrir el navegador automáticamente:", err.message);
    }
});