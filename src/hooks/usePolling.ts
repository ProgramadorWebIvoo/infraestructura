import { useEffect, useRef } from "react";

/**
 * @param pauseWhenHidden Si es false, sigue sondeando con la pestaña en
 * background (sin la pausa de ahorro de requests). Úsalo solo cuando el
 * callback necesita ejecutarse en tiempo real aunque el usuario no esté
 * mirando la pestaña — ej. notificaciones que disparan la Notification API
 * nativa: si el polling se pausa en background, nunca detectan nada nuevo
 * mientras el usuario no mira la pestaña, y al volver ya es tarde para la
 * notificación nativa (solo debe dispararse si la pestaña sigue oculta en
 * ese momento). Default true — el resto de pollings (proyectos, dashboard)
 * no necesitan seguir corriendo sin que nadie los esté mirando.
 */
export function usePolling(
    callback: () => void | Promise<void>,
    interval: number,
    enabled: boolean = true,
    pauseWhenHidden: boolean = true,
) {
    const savedCallback = useRef(callback);
    const isHidden = useRef(typeof document !== "undefined" ? document.hidden : false);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled || interval <= 0) return;

        let timerId: ReturnType<typeof setTimeout>;
        let isSubscribed = true;
        let isRunning = false;

        const tick = async () => {
            if (!isSubscribed) return;
            // Pausa por pestaña oculta (opcional) + guarda de overlap (no apila requests)
            if ((!pauseWhenHidden || !isHidden.current) && !isRunning) {
                isRunning = true;
                try {
                    await savedCallback.current();
                } finally {
                    isRunning = false;
                }
            }
            if (isSubscribed) timerId = setTimeout(tick, interval);
        };

        const onVisibility = () => {
            isHidden.current = document.hidden;
        };

        document.addEventListener("visibilitychange", onVisibility);
        timerId = setTimeout(tick, interval);

        return () => {
            isSubscribed = false;
            clearTimeout(timerId);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [interval, enabled, pauseWhenHidden]);
}
