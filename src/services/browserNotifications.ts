/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Notification API nativa del navegador — SOLO para alertas del backend
 * (useNotifications), nunca para el feedback de acción local (Toast success/
 * error/warning/info). El permiso se solicita una vez, justo después de un
 * login exitoso (useAuth::handleLogin). La notificación nativa solo se
 * dispara si la pestaña está en segundo plano (document.hidden) — si el
 * usuario la tiene abierta y visible, el toast en pantalla ya es suficiente
 * aviso y duplicarlo sería ruido.
 */

/** Pide permiso de notificaciones nativas. No-op si ya fue concedido/denegado antes, o si el navegador no soporta la API. */
export function requestNotificationPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "default") return; // ya decidido (granted/denied), no volver a preguntar

  Notification.requestPermission().catch(() => {
    // Silencioso: el navegador puede rechazar la promesa en contextos no
    // seguros (http) o si el usuario cierra el prompt sin decidir.
  });
}

/**
 * Dispara una notificación nativa si: la API existe, el permiso está
 * concedido, y la pestaña está oculta (background). Click en la notificación
 * enfoca la pestaña y la cierra.
 */
export function notifyBrowser(title: string, body?: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!document.hidden) return; // pestaña visible: el toast en pantalla alcanza

  const notification = new Notification(title, {
    body,
    icon: "/favicon.svg",
    tag: "ivoo-notification", // agrupa notificaciones consecutivas en vez de apilar
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
