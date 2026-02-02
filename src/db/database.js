const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear conexión
const dbPath = path.resolve(__dirname, 'proyectos_huila.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error al conectar con la base de datos:', err.message);
    else console.log('Conectado a la base de datos SQLite.');
});

// Crear tablas
db.serialize(() => {
    // 1. Proyectos
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

    // 2. Municipios (Nombre único globalmente)
    db.run(`CREATE TABLE IF NOT EXISTS municipios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
    )`);

    // 3. Instituciones (Nombre único DENTRO del municipio)
    db.run(`CREATE TABLE IF NOT EXISTS instituciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        municipio_id INTEGER,
        FOREIGN KEY(municipio_id) REFERENCES municipios(id),
        UNIQUE(nombre, municipio_id)
    )`);

    // 4. Sedes (Nombre único DENTRO de la institución)
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

    // 7. Seguimientos
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
});

module.exports = db;