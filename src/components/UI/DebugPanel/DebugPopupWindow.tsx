/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Renderiza el panel del DEBUG-MODE en una ventana emergente independiente
 * (portal hacia el documento del popup). EXPERIMENTAL — limitaciones
 * conocidas: los tooltips de IconActionButton y los toasts siguen
 * apareciendo en la ventana principal; el atajo Ctrl+Shift+D solo escucha en
 * la ventana principal. Si el popup se cierra, `onClosed` devuelve el panel
 * al acople anterior.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { copyDocumentStyles } from "@/utils/debugPopup";

interface DebugPopupWindowProps {
  popup: Window;
  onClosed: () => void;
  children: ReactNode;
}

export default function DebugPopupWindow({ popup, onClosed, children }: DebugPopupWindowProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // Ref: un onClosed con identidad nueva en cada render no debe reiniciar el efecto (cerraría el popup).
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  useEffect(() => {
    popup.document.title = "IVOO DEBUG-MODE";
    copyDocumentStyles(document, popup.document);
    const root = popup.document.createElement("div");
    popup.document.body.appendChild(root);
    setContainer(root);

    const handlePageHide = () => onClosedRef.current();
    const closeWithOpener = () => popup.close();
    popup.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", closeWithOpener);

    return () => {
      popup.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", closeWithOpener);
      root.remove();
      popup.close();
      setContainer(null);
    };
  }, [popup]);

  return container ? createPortal(children, container) : null;
}
