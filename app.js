const express = require('express');
const path = require('path');
const open = require('open'); 
const multer = require('multer');

// Importamos el controlador
const projectController = require('./src/controllers/projectController');

const app = express();
const isDevelopment = process.env.NODE_ENV === 'development';
const DEFAULT_PORT = isDevelopment ? 3000 : 8080;
const PORT = process.env.PORT || DEFAULT_PORT;

// 1. Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Configuración de Archivos Estáticos
app.use(express.static(path.join(__dirname, 'public')));

// 3. Configuración de Carga de Archivos
const upload = multer({ dest: 'uploads/' });

// =========================================================
// RUTAS
// =========================================================

// Vistas
app.get('/', projectController.index);
app.get('/estadisticas', projectController.statsView);

// API
app.get('/api/search', projectController.search);
app.get('/api/project/:bpin', projectController.getProject);
app.get('/api/activity-details/:activityId', projectController.getActivityDetails);
app.post('/api/save', projectController.saveData);
app.post('/api/upload-excel', upload.single('archivoExcel'), projectController.uploadExcel);
app.get('/api/export-excel', projectController.exportExcel);
app.get('/api/municipios', projectController.getMunicipios);
app.get('/api/instituciones/:municipioId', projectController.getInstituciones);
app.get('/api/sedes/:institucionId', projectController.getSedes);
app.get('/api/indicadores', projectController.getIndicadores);
app.get('/api/stats/general', projectController.apiGetGeneralStats);
app.get('/api/stats/evolution', projectController.apiGetEvolution);
app.post('/api/shutdown', (req, res) => {
    res.sendStatus(200);
    console.log("👋 Cierre de sesión solicitado. Cerrando aplicación...");
    process.exit(0);
});

// =========================================================
// INICIAR SERVIDOR
// =========================================================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    
    // Abrir navegador automáticamente
    try {
        open(`http://localhost:${PORT}`);
    } catch (err) {
        console.log("No se pudo abrir el navegador automáticamente.");
    }
});