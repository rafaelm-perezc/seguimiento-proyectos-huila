const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os'); // Módulo para detectar rutas del sistema operativo

// ---------------------------------------------------------
// 1. CONFIGURACIÓN DE RUTA SEGURA (PERSISTENCIA DE DATOS)
// ---------------------------------------------------------

// Buscamos la carpeta del usuario
const userHome = os.homedir();
let appDataPath;

// Definimos la ruta según el Sistema Operativo
if (process.platform === 'win32') {
    // Windows: C:\Users\Nombre\AppData\Roaming\SeguimientoProyectos
    appDataPath = path.join(process.env.APPDATA || path.join(userHome, 'AppData', 'Roaming'), 'SeguimientoProyectos');
} else {
    // Mac / Linux: /home/usuario/.SeguimientoProyectos
    appDataPath = path.join(userHome, '.SeguimientoProyectos');
}

// Creamos la carpeta si no existe (Mágicamente, la primera vez que abras el .exe)
if (!fs.existsSync(appDataPath)) {
    try {
        fs.mkdirSync(appDataPath, { recursive: true });
        console.log("✅ Carpeta de datos creada en:", appDataPath);
    } catch (err) {
        console.error("❌ Error creando carpeta en AppData. Usando carpeta local como respaldo.", err);
        // Si falla por permisos, usamos la carpeta donde está el ejecutable
        appDataPath = path.dirname(process.execPath);
    }
}

// Ruta final del archivo .db
const dbPath = path.join(appDataPath, 'proyectos_huila.db');

console.log("📂 Conectando a Base de Datos en:", dbPath);

// ---------------------------------------------------------
// 2. CONEXIÓN E INICIALIZACIÓN
// ---------------------------------------------------------

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error crítico al conectar con la BD:', err.message);
    } else {
        console.log('✅ Conexión exitosa a SQLite.');
    }
});

// ---------------------------------------------------------
// 3. CREACIÓN DE TABLAS (SCHEMA ACTUALIZADO)
// ---------------------------------------------------------
db.serialize(() => {
    
    // 1. Proyectos
    // IMPORTANTE: codigo_bpin es UNIQUE pero permite NULL (Opcional)
    // nombre_proyecto es UNIQUE y NOT NULL (Obligatorio y único)
    db.run(`CREATE TABLE IF NOT EXISTS proyectos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_bpin TEXT UNIQUE,
        nombre_proyecto TEXT UNIQUE NOT NULL,
        anio_contrato INTEGER NOT NULL,
        contratista TEXT,
        valor_inicial REAL DEFAULT 0,
        valor_rp REAL DEFAULT 0,
        valor_sgp REAL DEFAULT 0,
        valor_men REAL DEFAULT 0,
        valor_sgr REAL DEFAULT 0,
        fuente_recursos TEXT
    )`);

    // 2. Municipios
    db.run(`CREATE TABLE IF NOT EXISTS municipios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
    )`);

    // 3. Instituciones (Única por Municipio)
    db.run(`CREATE TABLE IF NOT EXISTS instituciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        municipio_id INTEGER,
        FOREIGN KEY(municipio_id) REFERENCES municipios(id),
        UNIQUE(nombre, municipio_id)
    )`);

    // 4. Sedes (Única por Institución)
    db.run(`CREATE TABLE IF NOT EXISTS sedes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        institucion_id INTEGER,
        FOREIGN KEY(institucion_id) REFERENCES instituciones(id),
        UNIQUE(nombre, institucion_id)
    )`);

    // 5. Indicadores
    db.run(`CREATE TABLE IF NOT EXISTS indicadores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
    )`);

    // 6. Actividades
    db.run(`CREATE TABLE IF NOT EXISTS actividades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proyecto_id INTEGER,
        descripcion TEXT NOT NULL,
        FOREIGN KEY(proyecto_id) REFERENCES proyectos(id)
    )`);

    // 7. Seguimientos (Historia de avances + Adiciones)
    db.run(`CREATE TABLE IF NOT EXISTS seguimientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proyecto_id INTEGER,
        actividad_id INTEGER,
        sede_id INTEGER,
        indicador_id INTEGER,
        porcentaje_avance REAL,
        fecha_seguimiento TEXT,
        responsable TEXT,
        observaciones TEXT,
        es_adicion INTEGER DEFAULT 0,
        valor_adicion REAL DEFAULT 0,
        fuente_adicion TEXT, 
        FOREIGN KEY(proyecto_id) REFERENCES proyectos(id),
        FOREIGN KEY(actividad_id) REFERENCES actividades(id),
        FOREIGN KEY(sede_id) REFERENCES sedes(id),
        FOREIGN KEY(indicador_id) REFERENCES indicadores(id)
    )`);

    // --- DATOS SEMILLA (OPCIONAL) ---
    // Insertamos indicadores básicos si la tabla está vacía
    db.get("SELECT count(*) as count FROM indicadores", (err, row) => {
        if (!err && row.count === 0) {
            console.log("🌱 Insertando indicadores base...");
            const indicadoresBase = [
                "COBERTURA EDUCATIVA",
                "INFRAESTRUCTURA FÍSICA",
                "DOTACIÓN TECNOLÓGICA",
                "CALIDAD EDUCATIVA",
                "ALIMENTACIÓN ESCOLAR (PAE)"
            ];
            const stmt = db.prepare("INSERT INTO indicadores (nombre) VALUES (?)");
            indicadoresBase.forEach(ind => stmt.run(ind));
            stmt.finalize();
        }
    });
});

module.exports = db;