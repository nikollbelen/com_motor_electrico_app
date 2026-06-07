const fs = require('fs');
const path = require('path');

function runScanner() {
    // Configuración de rutas
    const INFO_PATH = path.join(__dirname, '../app/info.json');
    
    if (!fs.existsSync(INFO_PATH)) {
        console.error(`[Error] No se encontró info.json en: ${INFO_PATH}`);
        return false;
    }

    const infoData = JSON.parse(fs.readFileSync(INFO_PATH, 'utf8'));

    // Deducir el archivo GLTF a partir de la URL configurada en info.json
    const htmlName = path.basename(infoData.verge3dUrl || 'index.html');
    const gltfName = htmlName.replace('.html', '.gltf');

    const GLTF_PATH = path.join(__dirname, '../app/verge3d_assets', gltfName);
    const OUTPUT_PATH = path.join(__dirname, '../app/assets_db.json');

    console.log('--- Asset Scanner (Modo Senior) ---');
    console.log(`[Scanner] Leyendo archivo: ${GLTF_PATH}`);

    try {
        if (!fs.existsSync(GLTF_PATH)) {
            console.error(`[Error] No se encontró el archivo GLTF en: ${GLTF_PATH}`);
            return false;
        }

        const gltfData = JSON.parse(fs.readFileSync(GLTF_PATH, 'utf8'));
        
        // 1. Extraer Meshes (Nodes)
        const meshes = [];
        if (gltfData.nodes) {
            gltfData.nodes.forEach(node => {
                if (node.name) {
                    meshes.push(node.name);
                }
            });
        }

        // 2. Extraer Animaciones
        const anims = [];
        if (gltfData.animations) {
            gltfData.animations.forEach(anim => {
                if (anim.name) {
                    anims.push(anim.name);
                }
            });
        }

        // 3. Guardar Base de Datos
        const assetsDB = {
            meshes: [...new Set(meshes)].sort(),
            anims: [...new Set(anims)].sort(),
            lastUpdated: new Date().toISOString(),
            source: 'GLTF Scanner'
        };

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(assetsDB, null, 2));

        console.log('\n✅ Escaneo completado con éxito.');
        console.log(`   - Meshes encontrados: ${assetsDB.meshes.length}`);
        console.log(`   - Animaciones encontradas: ${assetsDB.anims.length}`);
        console.log(`   - Resultado guardado en: ${OUTPUT_PATH}\n`);
        
        return true;
    } catch (err) {
        console.error('[Error] Error crítico durante el escaneo:', err.message);
        return false;
    }
}

// Permitir ejecución directa o importación
if (require.main === module) {
    const success = runScanner();
    process.exit(success ? 0 : 1);
}

module.exports = { runScanner };
