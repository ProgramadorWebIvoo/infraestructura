/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Copia texto al portapapeles con fallback para contextos no seguros
 * (HTTP sobre IP de LAN, donde `navigator.clipboard` no existe).
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // cae al fallback
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);

  return succeeded;
}
