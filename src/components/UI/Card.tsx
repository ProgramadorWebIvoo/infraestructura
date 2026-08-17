/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenedor Card reutilizable con estilo bento consistente.
 */

import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}

export default function Card({ children, className = "", hoverable = true }: CardProps) {
  return (
    <div
      className={`bg-surface rounded-container border border-border-default/80 shadow-sm p-6 ${
        hoverable ? "hover:shadow-md transition-all duration-300" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
