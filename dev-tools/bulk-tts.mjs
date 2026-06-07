import fs from 'fs';
import path from 'path';
import { TTSService } from './services/TTSService.mjs';

const tts = new TTSService();
const infoPath = path.join(process.cwd(), 'app/info.json');
const outputDir = path.join(process.cwd(), 'app/audios');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function run() {
    try {
        const config = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
        const menu = config.menu;
        
        // 1. Recolectar todos los pares {id, texto}
        const allTasks = [];
        function collect(nodes) {
            for (const node of nodes) {
                if (node.ESdescription && node.id) {
                    allTasks.push({
                        id: node.id,
                        fileName: node.id.replace('paso', ''),
                        text: node.ESdescription.trim()
                    });
                }
                if (node.children) collect(node.children);
            }
        }
        collect(menu);

        // 2. Agrupar por texto para evitar locuciones duplicadas
        const groups = {};
        allTasks.forEach(task => {
            if (!groups[task.text]) groups[task.text] = [];
            groups[task.text].push(task);
        });

        console.log("==================================================");
        console.log("🎙️  ELEVENLABS BULK GENERATOR (OPTIMIZADO)");
        console.log(`📊 Total textos únicos a locutar: ${Object.keys(groups).length}`);
        console.log("==================================================");

        // 3. Procesar cada grupo de texto único
        for (const text of Object.keys(groups)) {
            const tasks = groups[text];
            const firstTask = tasks[0];
            const firstFilePath = path.join(outputDir, `${firstTask.fileName}.mp3`);

            // Si el primer archivo no existe, lo generamos
            if (!fs.existsSync(firstFilePath)) {
                try {
                    await tts.generateAudio(text, outputDir, firstTask.fileName);
                    console.log(`[API] ✅ Generado: "${text}" -> ${firstTask.fileName}.mp3`);
                    await new Promise(r => setTimeout(r, 500)); // Delay preventivo
                } catch (err) {
                    console.error(`[Error] ❌ Falló locución para "${text}":`, err.message);
                    continue; // Saltar copias si falló la base
                }
            } else {
                console.log(`[Skip] ℹ️ Usando archivo existente para: "${text}"`);
            }

            // 4. Clonar el archivo para el resto de IDs en el grupo
            for (let i = 1; i < tasks.length; i++) {
                const targetPath = path.join(outputDir, `${tasks[i].fileName}.mp3`);
                if (!fs.existsSync(targetPath)) {
                    fs.copyFileSync(firstFilePath, targetPath);
                    console.log(`   └─ 📂 Clonado a ${tasks[i].fileName}.mp3`);
                }
            }
        }

        console.log("==================================================");
        console.log("🏁 Proceso de optimización completado.");
        console.log("==================================================");

    } catch (error) {
        console.error("Error crítico:", error);
    }
}

run();
