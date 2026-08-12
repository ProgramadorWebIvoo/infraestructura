/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sincroniza el <title> y el favicon de la pestaña con la vista activa:
 * "IVOO Gestión // {Vista}" y un favicon que reproduce el ícono/color usado
 * para esa ruta en el sidebar. Sin vista reconocida, cae a los defaults
 * estáticos declarados en index.html.
 */

import { useEffect } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useLocation } from "react-router-dom";
import { getRouteMeta } from "../routeMeta.tsx";

const DEFAULT_TITLE = "IVOO Gestión de Infraestructura";
const DEFAULT_FAVICON = "/favicon.svg";

function buildFaviconHref(icon: Parameters<typeof createElement>[0], color: string): string {
  // Los íconos de lucide-react se dibujan en un viewBox de 24×24 con el trazo
  // en el atributo stroke (fill="none") del <svg> raíz — ver defaultAttributes
  // de la librería. Extraer solo los <path> internos (regex) descarta TODO lo
  // que vivía en ese <svg> raíz: no solo el viewBox (que hay que reponer via
  // scale/translate para no dibujar el ícono gigante/recortado) sino también
  // el stroke="#FFFFFF" — sin reponerlo en el <g> contenedor, los <path> no
  // heredan ningún color de trazo y quedan invisibles (bug: favicon en blanco).
  const svgInner = renderToStaticMarkup(
    createElement(icon as never, {
      color: "#FFFFFF",
      strokeWidth: 2.25,
    })
  );
  const iconPaths = svgInner.replace(/^<svg[^>]*>|<\/svg>$/g, "");
  const ICON_SIZE = 20;
  const SOURCE_SIZE = 24;
  const scale = ICON_SIZE / SOURCE_SIZE;
  const offset = (32 - ICON_SIZE) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill="${color}" />
    <g transform="translate(${offset}, ${offset}) scale(${scale})" fill="none" stroke="#FFFFFF" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</g>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function setFaviconHref(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = href;
}

export function useDocumentHead() {
  const location = useLocation();

  useEffect(() => {
    const meta = getRouteMeta(location.pathname);

    if (!meta) {
      document.title = DEFAULT_TITLE;
      setFaviconHref(DEFAULT_FAVICON);
      return;
    }

    document.title = `IVOO-Gestión // ${meta.label}`;
    setFaviconHref(buildFaviconHref(meta.icon, meta.color));

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [location.pathname]);
}
