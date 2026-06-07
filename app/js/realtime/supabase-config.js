/**
 * supabase-config.js — Cliente Supabase (Singleton)
 * 
 * Las credenciales se leen de <meta> tags en el HTML:
 *   <meta name="supabase-url" content="https://xxxxx.supabase.co">
 *   <meta name="supabase-anon-key" content="eyJhbGciOi...">
 * 
 * Alternativa: se pueden inyectar en window.__SUPABASE_CONFIG__ antes
 * de importar este módulo.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getConfig() {
    // Prioridad 1: window.__SUPABASE_CONFIG__
    if (window.__SUPABASE_CONFIG__) {
        return {
            url: window.__SUPABASE_CONFIG__.url,
            anonKey: window.__SUPABASE_CONFIG__.anonKey
        };
    }

    // Prioridad 2: <meta> tags
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    const keyMeta = document.querySelector('meta[name="supabase-anon-key"]');

    if (urlMeta && keyMeta) {
        return {
            url: urlMeta.getAttribute('content'),
            anonKey: keyMeta.getAttribute('content')
        };
    }

    throw new Error(
        '[Supabase] No se encontraron credenciales. Agrega <meta name="supabase-url"> y ' +
        '<meta name="supabase-anon-key"> al HTML, o define window.__SUPABASE_CONFIG__'
    );
}

const { url, anonKey } = getConfig();

/**
 * Cliente Supabase singleton.
 * Configuración optimizada para conexiones lentas:
 * - Realtime con reconexión automática
 * - Timeout generoso para operaciones de DB
 */
export const supabase = createClient(url, anonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: {
            'x-client-info': 'laboratorio-3d-realtime'
        }
    }
});

console.log('%c[Supabase] %cCliente inicializado → ' + url,
    'color: #3ECF8E; font-weight: bold;', 'color: white;');
