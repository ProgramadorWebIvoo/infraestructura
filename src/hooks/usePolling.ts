import { useEffect, useRef } from "react";

export function usePolling(
    callback: () => void | Promise<void>,
    interval: number,
    enabled: boolean = true
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
            // Pausa por pestaña oculta + guarda de overlap (no apila requests)
            if (!isHidden.current && !isRunning) {
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
    }, [interval, enabled]);
}
