/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Utilidades DOM para el panel del DEBUG-MODE en ventana emergente
 * (experimental). La ventana DEBE abrirse dentro del handler del click del
 * usuario: el bloqueador de popups del navegador rechaza window.open fuera
 * de un gesto (por eso este modo es de sesión y nunca se restaura solo).
 */

export const POPUP_NAME = "ivoo-debug-window";

/** null si el navegador bloqueó la ventana o no soporta window.open. */
export function openDebugPopup(): Window | null {
  try {
    return window.open("", POPUP_NAME, "popup=yes,width=560,height=760,resizable=yes");
  } catch {
    return null;
  }
}

/**
 * Copia los estilos de la app al documento del popup (Tailwind compilado:
 * <link> en build, <style> en dev) y replica tema/clases del <html> y <body>.
 */
export function copyDocumentStyles(from: Document, to: Document): void {
  from.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
    const clone = node.cloneNode(true) as HTMLElement;
    // href absoluto: el about:blank del popup no garantiza la misma base URL.
    if (node instanceof HTMLLinkElement && clone instanceof HTMLLinkElement) clone.href = node.href;
    to.head.appendChild(clone);
  });

  to.documentElement.className = from.documentElement.className;
  for (const attr of Array.from(from.documentElement.attributes)) {
    if (attr.name.startsWith("data-")) to.documentElement.setAttribute(attr.name, attr.value);
  }
  to.body.className = from.body.className;
  to.body.style.margin = "0";
}
