import { useEffect, useRef } from "react";

export function usePolling(
    callback: () => void | Promise<void>,
    interval: number,
    enabled: boolean = true
) {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled || interval <= 0) {
            console.log("🔍 usePolling: disabled or invalid interval", { enabled, interval });
            return;
        }
        
        let timerId: NodeJS.Timeout;
        let isSubscribed = true;

        const loop = async () => {
            if (isSubscribed) {
                console.log("🔄 usePolling: executing callback");
                await savedCallback.current();
                timerId = setTimeout(loop, interval);
            }
        };

        console.log("🔍 usePolling: starting", { interval, enabled });
        timerId = setTimeout(loop, interval);

        return () => {
            console.log("🔍 usePolling: cleanup");
            isSubscribed = false;
            clearTimeout(timerId);
        };
    }, [interval, enabled]);
}
