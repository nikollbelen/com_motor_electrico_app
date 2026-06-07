import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

/**
 * TTSService - Senior Architecture Implementation
 * Following the Provider/Adapter pattern for scalability.
 */
export class TTSService {
    constructor() {
        this.client = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY
        });
        this.defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
        this.modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
    }

    /**
     * Converts text to speech and saves it to a file.
     * @param {string} text - Text to convert.
     * @param {string} outputDir - Directory to save the mp3.
     * @param {string} fileName - Name of the file (without extension).
     * @returns {Promise<string>} - Path to the generated file.
     */
    async generateAudio(text, outputDir, fileName, lang = 'es') {
        try {
            console.log(`[TTS] Generating audio (${lang}) for: "${text.substring(0, 30)}..."`);

            const audioResponse = await this.client.textToSpeech.convert(
                this.defaultVoiceId,
                {
                    text: text,
                    modelId: this.modelId,
                    outputFormat: 'mp3_44100_128',
                    language_code: lang,
                }
            );

            // Asegurar que el directorio existe
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const filePath = path.join(outputDir, `${fileName}.mp3`);
            
            // Convertimos el stream de respuesta a un Buffer para guardarlo de forma segura en Node.js
            const chunks = [];
            for await (const chunk of audioResponse) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            
            fs.writeFileSync(filePath, buffer);
            console.log(`[TTS] File saved: ${filePath}`);
            return filePath;
            
        } catch (error) {
            console.error('[TTS] Error generating audio:', error);
            throw error;
        }
    }
}
