/**
 * Configuración de la app móvil.
 *
 * API_BASE_URL viene de EXPO_PUBLIC_API_URL (ver `.env` / `.env.example`),
 * inlineada en build-time por Expo — nunca hardcodear la URL de producción
 * aquí, cada entorno (dev/staging/prod) define la suya.
 *
 * - Android emulator: http://10.0.2.2:8000/api
 * - iOS simulator / Expo web: http://127.0.0.1:8000/api
 * - Physical phone: usar IP LAN del servidor, ej. http://192.168.1.20:8000/api
 * - Producción: setear EXPO_PUBLIC_API_URL en el entorno de build (EAS secrets/.env.production)
 */

if (!process.env.EXPO_PUBLIC_API_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL no está definida. Copia .env.example a .env y configúrala.",
  );
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
