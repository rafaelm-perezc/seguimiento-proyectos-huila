const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
<<<<<<< HEAD
const os = require('os');
const xlsx = require('xlsx'); // Necesario para leer los Excel de carga inicial

// ---------------------------------------------------------
// 1. DETECCIÓN DE ENTORNO (DESARROLLO vs PRODUCCIÓN)
// ---------------------------------------------------------
const isPkg = typeof process.pkg !== 'undefined';

let dbPath;
let dbFolder;

if (isPkg) {
    // --- MODO PRODUCCIÓN (Ejecutable .exe) ---
    // Guardamos en AppData para que los datos NO se borren al actualizar el .exe
    const userHome = os.homedir();
    if (process.platform === 'win32') {
        dbFolder = path.join(process.env.APPDATA || path.join(userHome, 'AppData', 'Roaming'), 'SeguimientoProyectos');
    } else {
        dbFolder = path.join(userHome, '.SeguimientoProyectos');
    }
    
    // Crear carpeta si no existe
    if (!fs.existsSync(dbFolder)) {
        fs.mkdirSync(dbFolder, { recursive: true });
    }
    dbPath = path.join(dbFolder, 'proyectos_huila.db');
    console.log("🚀 MODO PRODUCCIÓN: Usando BD en:", dbPath);

} else {
    // --- MODO DESARROLLO (Node.js normal) ---
    // Guardamos AQUÍ MISMO, en la carpeta src/db
    dbFolder = __dirname;
    dbPath = path.join(dbFolder, 'proyectos_huila.db');
    console.log("🛠️ MODO DESARROLLO: Usando BD local en:", dbPath);
}

// ---------------------------------------------------------
// 2. CONEXIÓN A LA BASE DE DATOS
// ---------------------------------------------------------
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Error conectando BD:', err.message);
    else console.log('✅ Conexión exitosa a SQLite.');
});

// ---------------------------------------------------------
// 3. CREACIÓN DE TABLAS Y CARGA INICIAL (SEEDING)
// ---------------------------------------------------------
db.serialize(() => {
    // --- CREACIÓN DE TABLAS ---
=======
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
>>>>>>> 667b63216412e222f0ad98de57635573f2700141
    db.run(`CREATE TABLE IF NOT EXISTS proyectos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_bpin TEXT UNIQUE,
        nombre_proyecto TEXT UNIQUE NOT NULL,
        anio_contrato INTEGER NOT NULL,
        contratista TEXT,
        valor_inicial REAL DEFAULT 0,
        valor_rp REAL DEFAULT 0, valor_sgp REAL DEFAULT 0, valor_men REAL DEFAULT 0, valor_sgr REAL DEFAULT 0,
        fuente_recursos TEXT
    )`);

<<<<<<< HEAD
=======
    // 2. Municipios
>>>>>>> 667b63216412e222f0ad98de57635573f2700141
    db.run(`CREATE TABLE IF NOT EXISTS municipios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
    )`);

<<<<<<< HEAD
=======
    // 3. Instituciones (Única por Municipio)
>>>>>>> 667b63216412e222f0ad98de57635573f2700141
    db.run(`CREATE TABLE IF NOT EXISTS instituciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        municipio_id INTEGER,
        FOREIGN KEY(municipio_id) REFERENCES municipios(id),
        UNIQUE(nombre, municipio_id)
    )`);

<<<<<<< HEAD
=======
    // 4. Sedes (Única por Institución)
>>>>>>> 667b63216412e222f0ad98de57635573f2700141
    db.run(`CREATE TABLE IF NOT EXISTS sedes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        institucion_id INTEGER,
        FOREIGN KEY(institucion_id) REFERENCES instituciones(id),
        UNIQUE(nombre, institucion_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS indicadores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS actividades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proyecto_id INTEGER,
        descripcion TEXT NOT NULL,
        FOREIGN KEY(proyecto_id) REFERENCES proyectos(id)
    )`);

<<<<<<< HEAD
=======
    // 7. Seguimientos (Historia de avances + Adiciones)
>>>>>>> 667b63216412e222f0ad98de57635573f2700141
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

<<<<<<< HEAD
    // --- LÓGICA DE CARGA AUTOMÁTICA (SEEDING) ---
    // Verificamos si la tabla de indicadores está vacía. Si lo está, asumimos que es una BD nueva.
    db.get("SELECT count(*) as count FROM indicadores", (err, row) => {
        if (!err && row.count === 0) {
            console.log("🌱 Base de datos vacía detectada. Iniciando carga automática desde Excel...");
            cargarDatosIniciales();
=======
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
>>>>>>> 667b63216412e222f0ad98de57635573f2700141
        }
    });
});

// Función para leer Excel y llenar tablas
function cargarDatosIniciales() {
    
    // Rutas de los archivos Excel (asumiendo que están en la misma carpeta src/db)
    // __dirname funciona tanto en dev como dentro del ejecutable (pkg snapshot)
    const rutaIndicadores = path.join(__dirname, 'indicadores.xlsx');
    const rutaSedes = path.join(__dirname, 'sedes.xlsx');

    // 1. CARGAR INDICADORES
    if (fs.existsSync(rutaIndicadores)) {
        try {
            const wb = xlsx.readFile(rutaIndicadores);
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const datos = xlsx.utils.sheet_to_json(sheet);
            
            const stmt = db.prepare("INSERT OR IGNORE INTO indicadores (nombre) VALUES (?)");
            datos.forEach(fila => {
                // Ajusta 'NOMBRE_INDICADOR' al nombre real de la columna en tu Excel
                const nombreInd = fila['NOMBRE'] || fila['INDICADOR'] || fila['nombre']; 
                if (nombreInd) stmt.run(nombreInd.toString().trim().toUpperCase());
            });
            stmt.finalize();
            console.log("✅ Indicadores cargados.");
        } catch (e) { console.error("Error cargando indicadores:", e.message); }
    }

    // 2. CARGAR MUNICIPIOS, INSTITUCIONES Y SEDES
    // Estructura esperada del Excel: Columnas MUNICIPIO, INSTITUCION, SEDE
    if (fs.existsSync(rutaSedes)) {
        try {
            const wb = xlsx.readFile(rutaSedes);
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const datos = xlsx.utils.sheet_to_json(sheet);

            console.log("⏳ Cargando estructura geográfica... esto puede tardar unos segundos.");

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                
                datos.forEach(fila => {
                    const mun = (fila['MUNICIPIO'] || '').toString().trim().toUpperCase();
                    const inst = (fila['INSTITUCION'] || '').toString().trim().toUpperCase();
                    const sede = (fila['SEDE'] || '').toString().trim().toUpperCase();

                    if (mun) {
                        // Insertar Municipio (si no existe)
                        db.run("INSERT OR IGNORE INTO municipios (nombre) VALUES (?)", [mun], function(err) {
                             // Necesitamos recuperar el ID, pero como es asíncrono dentro del loop, 
                             // en SQLite para cargas masivas iniciales es mejor usar sub-queries en el INSERT de las hijas
                             // para evitar el "callback hell" en este script simple.
                        });

                        // Truco para insertar jerarquía usando Sub-Selects (Más rápido y seguro en scripts)
                        if (inst) {
                            db.run(`INSERT OR IGNORE INTO instituciones (nombre, municipio_id) 
                                    SELECT ?, id FROM municipios WHERE nombre = ?`, [inst, mun]);
                        }
                        if (sede && inst) {
                            // Primero buscamos el ID del municipio para asegurar unicidad de institución
                            db.run(`INSERT OR IGNORE INTO sedes (nombre, institucion_id) 
                                    SELECT ?, id FROM instituciones WHERE nombre = ? 
                                    AND municipio_id = (SELECT id FROM municipios WHERE nombre = ?)`, 
                                    [sede, inst, mun]);
                        }
                    }
                });

                db.run("COMMIT", () => {
                    console.log("✅ Municipios, Instituciones y Sedes cargados exitosamente.");
                });
            });

        } catch (e) { 
            console.error("Error cargando sedes:", e.message); 
            db.run("ROLLBACK");
        }
    } else {
        console.warn("⚠️ No se encontró el archivo sedes.xlsx en:", rutaSedes);
    }
}

module.exports = db;