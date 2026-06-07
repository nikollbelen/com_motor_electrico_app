const http = require('http');
const fs = require('fs');
const path = require('path');
const { runScanner } = require('./scan-assets');

const PORT = 3001;
const TARGET_FILE = path.join(__dirname, '../app/info.json');
const ASSETS_FILE = path.join(__dirname, '../app/assets_db.json');
const ASSETS_DIR = path.join(__dirname, '../app/verge3d_assets');


const server = http.createServer((req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Normalizar URL
    const url = req.url.split('?')[0]; 
    console.log(`[Request] ${req.method} ${url}`);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // --- ENDPOINT: GUARDAR CONFIG ---
    if (req.method === 'POST' && url === '/save') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const config = JSON.parse(body);
                const audioDir = path.join(__dirname, '../app/audios');
                const tempDir = path.join(audioDir, '_tmp_sync_' + Date.now());

                // 1. Si hay reordenamiento detectado por originalId, procedemos a renombrar audios
                const findRenames = (nodes, list = []) => {
                    nodes.forEach(node => {
                        if (node.originalId && node.originalId !== node.id) {
                            list.push({ old: node.originalId.replace('paso', ''), new: node.id.replace('paso', '') });
                        }
                        if (node.children) findRenames(node.children, list);
                    });
                    return list;
                };

                const renames = findRenames(config.menu || []);
                
                if (renames.length > 0) {
                    console.log(`[AudioSync] Detectados ${renames.length} reordenamientos. Sincronizando archivos...`);
                    
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

                    // Mover todos los audios actuales a temp para evitar colisiones
                    const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));
                    files.forEach(f => {
                        fs.renameSync(path.join(audioDir, f), path.join(tempDir, f));
                    });

                    // Mover de vuelta con los nuevos nombres
                    renames.forEach(r => {
                        const oldFile = `${r.old}.mp3`;
                        const newFile = `${r.new}.mp3`;
                        if (fs.existsSync(path.join(tempDir, oldFile))) {
                            fs.renameSync(path.join(tempDir, oldFile), path.join(audioDir, newFile));
                            console.log(`[AudioSync] Renombrado: ${oldFile} -> ${newFile}`);
                        }
                    });

                    // Los que no cambiaron también deben volver
                    const remaining = fs.readdirSync(tempDir);
                    remaining.forEach(f => {
                        if (!fs.existsSync(path.join(audioDir, f))) {
                            fs.renameSync(path.join(tempDir, f), path.join(audioDir, f));
                        }
                    });

                    // Limpiar temp
                    fs.rmdirSync(tempDir, { recursive: true });
                }

                // Limpiar los originalId antes de guardar el JSON final
                const cleanOriginalIds = (nodes) => {
                    nodes.forEach(node => {
                        delete node.originalId;
                        if (node.children) cleanOriginalIds(node.children);
                    });
                };
                cleanOriginalIds(config.menu || []);

                fs.writeFile(TARGET_FILE, JSON.stringify(config, null, 2), 'utf8', (err) => {
                    if (err) { 
                        res.writeHead(500); 
                        res.end(JSON.stringify({ status: 'error', message: err.message })); 
                    } else { 
                        console.log(`[OK] info.json actualizado y audios sincronizados.`); 
                        res.writeHead(200); 
                        res.end(JSON.stringify({ status: 'success' })); 
                    }
                });
            } catch (e) { 
                console.error("[Save Error]", e);
                res.writeHead(400); 
                res.end(JSON.stringify({ status: 'error', message: 'JSON inválido o error en sincronización' })); 
            }
        });
    } 
    // --- ENDPOINT: GENERAR TTS (ElevenLabs) ---
    else if (req.method === 'POST' && url === '/tts') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { text, lang = 'es', fileName, extraFileNames } = JSON.parse(body);
                if (!text || !fileName) throw new Error('Faltan parámetros (text, fileName)');

                const { TTSService } = await import('./services/TTSService.mjs');
                const tts = new TTSService();

                const outputDir = path.join(__dirname, `../app/audios/${lang}`);
                if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

                const filePath = await tts.generateAudio(text, outputDir, fileName, lang);

                if (Array.isArray(extraFileNames)) {
                    extraFileNames.forEach(extraName => {
                        const targetPath = path.join(outputDir, `${extraName}.mp3`);
                        fs.copyFileSync(filePath, targetPath);
                        console.log(`[TTS] Clonado: ${extraName}.mp3 (${lang})`);
                    });
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', path: `audios/${lang}/${fileName}.mp3` }));
            } catch (e) {
                console.error('[TTS Error]', e.message);
                res.writeHead(500);
                res.end(JSON.stringify({ status: 'error', message: e.message }));
            }
        });
    }
    // --- ENDPOINT: GUARDAR AUDIO GENERADO EN EL BROWSER (Puter AI) ---
    else if (req.method === 'POST' && url === '/save-audio') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { lang = 'es', fileName, audioBase64, extraFileNames } = JSON.parse(body);
                if (!fileName || !audioBase64) throw new Error('Faltan parámetros (fileName, audioBase64)');

                const outputDir = path.join(__dirname, `../app/audios/${lang}`);
                if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

                const buffer = Buffer.from(audioBase64, 'base64');
                const filePath = path.join(outputDir, `${fileName}.mp3`);
                fs.writeFileSync(filePath, buffer);
                console.log(`[Puter TTS] Audio guardado: audios/${lang}/${fileName}.mp3`);

                if (Array.isArray(extraFileNames)) {
                    extraFileNames.forEach(extraName => {
                        const targetPath = path.join(outputDir, `${extraName}.mp3`);
                        fs.copyFileSync(filePath, targetPath);
                        console.log(`[Puter TTS] Clonado: ${extraName}.mp3 (${lang})`);
                    });
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', path: `audios/${lang}/${fileName}.mp3` }));
            } catch (e) {
                console.error('[Save Audio Error]', e.message);
                res.writeHead(500);
                res.end(JSON.stringify({ status: 'error', message: e.message }));
            }
        });
    }
    // --- ENDPOINT: GUARDAR MÚLTIPLES AUDIOS EN BATCH (Puter AI) ---
    // Recibe todos los blobs ya generados en el browser y los escribe de una vez,
    // para que el live-reload solo dispare una recarga en lugar de una por idioma.
    else if (req.method === 'POST' && url === '/save-audios-batch') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { audios } = JSON.parse(body);
                if (!Array.isArray(audios) || audios.length === 0) throw new Error('Falta el array "audios"');

                const saved = [];
                for (const { lang = 'es', fileName, audioBase64, extraFileNames } of audios) {
                    if (!fileName || !audioBase64) throw new Error('Faltan parámetros (fileName, audioBase64)');

                    const outputDir = path.join(__dirname, `../app/audios/${lang}`);
                    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

                    const buffer = Buffer.from(audioBase64, 'base64');
                    const filePath = path.join(outputDir, `${fileName}.mp3`);
                    fs.writeFileSync(filePath, buffer);
                    console.log(`[Puter Batch] Guardado: audios/${lang}/${fileName}.mp3`);
                    saved.push(`audios/${lang}/${fileName}.mp3`);

                    if (Array.isArray(extraFileNames)) {
                        extraFileNames.forEach(extraName => {
                            const targetPath = path.join(outputDir, `${extraName}.mp3`);
                            fs.copyFileSync(filePath, targetPath);
                            console.log(`[Puter Batch] Clonado: ${extraName}.mp3 (${lang})`);
                            saved.push(`audios/${lang}/${extraName}.mp3`);
                        });
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', saved }));
            } catch (e) {
                console.error('[Save Batch Error]', e.message);
                res.writeHead(500);
                res.end(JSON.stringify({ status: 'error', message: e.message }));
            }
        });
    }
    // --- ENDPOINT: RECIBIR/OBTENER ASSETS ---
    else if (url === '/assets' || url === '/assets/') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                fs.readFile(ASSETS_FILE, 'utf8', (err, existingData) => {
                    const isDifferent = err || (existingData !== body);
                    if (isDifferent) {
                        fs.writeFile(ASSETS_FILE, body, 'utf8', (err) => {
                            if (err) { res.writeHead(500); res.end(); }
                            else { console.log(`[SYNC] Assets DB actualizada.`); res.writeHead(200); res.end(); }
                        });
                    } else {
                        res.writeHead(200);
                        res.end();
                    }
                });
            });
        } else if (req.method === 'GET') {
            fs.readFile(ASSETS_FILE, 'utf8', (err, data) => {
                if (err) { 
                    console.log(`[Warn] No se encontró assets_db.json, enviando vacío.`);
                    res.writeHead(200); 
                    res.end(JSON.stringify({ meshes: [], anims: [] })); 
                } else { 
                    res.writeHead(200, { 'Content-Type': 'application/json' }); 
                    res.end(data); 
                }
            });
        }
    }
    else {
        res.writeHead(404);
        res.end();
    }
});

// --- INICIO DEL SERVIDOR ---
server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 SERVIDOR DE GUARDADO ACTIVO`);
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`📝 Destino: ${TARGET_FILE}`);
    console.log(`=========================================`);

    // 1. Ejecutar escaneo inicial al arrancar
    console.log(`[Init] Ejecutando escaneo de activos inicial...`);
    runScanner();

});
