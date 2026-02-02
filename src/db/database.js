const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');
const xlsx = require('xlsx'); 

// ---------------------------------------------------------
// 1. DETECCIÓN DE ENTORNO
// ---------------------------------------------------------
const isPkg = typeof process.pkg !== 'undefined';
let dbPath;
let dbFolder;

if (isPkg) {
    // MODO PRODUCCIÓN (.exe) -> AppData
    const userHome = os.homedir();
    if (process.platform === 'win32') {
        dbFolder = path.join(process.env.APPDATA || path.join(userHome, 'AppData', 'Roaming'), 'SeguimientoProyectos');
    } else {
        dbFolder = path.join(userHome, '.SeguimientoProyectos');
    }
    
    if (!fs.existsSync(dbFolder)) {
        fs.mkdirSync(dbFolder, { recursive: true });
    }
    dbPath = path.join(dbFolder, 'proyectos_huila.db');
    console.log("🚀 MODO PRODUCCIÓN. BD en:", dbPath);
} else {
    // MODO DESARROLLO -> Carpeta local
    dbFolder = __dirname;
    dbPath = path.join(dbFolder, 'proyectos_huila.db');
    console.log("🛠️ MODO DESARROLLO. BD local en:", dbPath);
}

// ---------------------------------------------------------
// 2. CONEXIÓN
// ---------------------------------------------------------
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Error conectando BD:', err.message);
    else console.log('✅ Conexión exitosa a SQLite.');
});

// ---------------------------------------------------------
// 3. TABLAS Y CARGA (SEEDING)
// ---------------------------------------------------------
db.serialize(() => {
    // --- CREACIÓN DE TABLAS (Sin cambios) ---
    db.run(`CREATE TABLE IF NOT EXISTS proyectos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_bpin TEXT UNIQUE, nombre_proyecto TEXT UNIQUE NOT NULL, anio_contrato INTEGER NOT NULL, contratista TEXT,
        valor_inicial REAL DEFAULT 0, valor_rp REAL DEFAULT 0, valor_sgp REAL DEFAULT 0, valor_men REAL DEFAULT 0, valor_sgr REAL DEFAULT 0,
        fuente_recursos TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS municipios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL)`);

    db.run(`CREATE TABLE IF NOT EXISTS instituciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, municipio_id INTEGER,
        FOREIGN KEY(municipio_id) REFERENCES municipios(id), UNIQUE(nombre, municipio_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sedes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, institucion_id INTEGER,
        FOREIGN KEY(institucion_id) REFERENCES instituciones(id), UNIQUE(nombre, institucion_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS indicadores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL)`);

    db.run(`CREATE TABLE IF NOT EXISTS actividades (
        id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER, descripcion TEXT NOT NULL,
        FOREIGN KEY(proyecto_id) REFERENCES proyectos(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS seguimientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER, actividad_id INTEGER, sede_id INTEGER, indicador_id INTEGER,
        porcentaje_avance REAL, fecha_seguimiento TEXT, responsable TEXT, observaciones TEXT,
        es_adicion INTEGER DEFAULT 0, valor_adicion REAL DEFAULT 0, fuente_adicion TEXT, 
        FOREIGN KEY(proyecto_id) REFERENCES proyectos(id), FOREIGN KEY(actividad_id) REFERENCES actividades(id),
        FOREIGN KEY(sede_id) REFERENCES sedes(id), FOREIGN KEY(indicador_id) REFERENCES indicadores(id)
    )`);

    // --- VERIFICACIÓN DE CARGA ---
    db.get("SELECT count(*) as count FROM indicadores", (err, row) => {
        if (!err && row.count === 0) {
            console.log("🌱 BD Nueva detectada. Iniciando carga desde Excel interno...");
            cargarDatosIniciales();
        } else {
            console.log("✅ La BD ya tiene datos. No se requiere carga inicial.");
        }
    });
});

// ---------------------------------------------------------
// 4. FUNCIÓN DE CARGA MASIVA (CORREGIDA PARA PKG)
// ---------------------------------------------------------
function cargarDatosIniciales() {
    // Rutas relativas al archivo compilado
    const rutaIndicadores = path.join(__dirname, 'indicadores.xlsx');
    const rutaSedes = path.join(__dirname, 'sedes.xlsx');

    // Función auxiliar para leer Excel ya sea en disco o dentro del .exe
    const leerExcel = (ruta) => {
        try {
            // TRUCO: Leemos el archivo como Buffer con 'fs' (que sí lee dentro del exe)
            // y luego se lo pasamos a xlsx.read
            const archivoBuffer = fs.readFileSync(ruta);
            return xlsx.read(archivoBuffer, { type: 'buffer' });
        } catch (error) {
            console.error(`❌ Error leyendo archivo en ${ruta}:`, error.message);
            return null;
        }
    };

    // 1. CARGAR INDICADORES
    const wbInd = leerExcel(rutaIndicadores);
    if (wbInd) {
        const sheet = wbInd.Sheets[wbInd.SheetNames[0]];
        const datos = xlsx.utils.sheet_to_json(sheet);
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare("INSERT OR IGNORE INTO indicadores (nombre) VALUES (?)");
            datos.forEach(fila => {
                const nombreInd = fila['NOMBRE'] || fila['INDICADOR'] || fila['nombre']; 
                if (nombreInd) stmt.run(nombreInd.toString().trim().toUpperCase());
            });
            stmt.finalize();
            db.run("COMMIT", () => console.log(`✅ Indicadores cargados: ${datos.length}`));
        });
    }

    // 2. CARGAR MUNICIPIOS, INSTITUCIONES Y SEDES
    const wbSedes = leerExcel(rutaSedes);
    if (wbSedes) {
        const sheet = wbSedes.Sheets[wbSedes.SheetNames[0]];
        const datos = xlsx.utils.sheet_to_json(sheet);
        console.log(`⏳ Cargando ${datos.length} registros geográficos...`);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // Preparamos sentencias para mayor velocidad
            const insertMuni = db.prepare("INSERT OR IGNORE INTO municipios (nombre) VALUES (?)");
            
            // Usamos un Set para no intentar insertar el mismo municipio 100 veces
            const municipiosVistos = new Set();
            
            datos.forEach(fila => {
                const mun = (fila['MUNICIPIO'] || '').toString().trim().toUpperCase();
                if(mun && !municipiosVistos.has(mun)) {
                    insertMuni.run(mun);
                    municipiosVistos.add(mun);
                }
            });
            insertMuni.finalize();

            // Ahora Instituciones y Sedes (uno a uno para asegurar relaciones)
            datos.forEach(fila => {
                const mun = (fila['MUNICIPIO'] || '').toString().trim().toUpperCase();
                const inst = (fila['INSTITUCION'] || '').toString().trim().toUpperCase();
                const sede = (fila['SEDE'] || '').toString().trim().toUpperCase();

                if (mun && inst) {
                    db.run(`INSERT OR IGNORE INTO instituciones (nombre, municipio_id) 
                            SELECT ?, id FROM municipios WHERE nombre = ?`, [inst, mun]);
                    
                    if (sede) {
                        db.run(`INSERT OR IGNORE INTO sedes (nombre, institucion_id) 
                                SELECT ?, id FROM instituciones WHERE nombre = ? 
                                AND municipio_id = (SELECT id FROM municipios WHERE nombre = ?)`, 
                                [sede, inst, mun]);
                    }
                }
            });

            db.run("COMMIT", () => console.log("✅ Estructura geográfica cargada exitosamente."));
        });
    }
}

module.exports = db;