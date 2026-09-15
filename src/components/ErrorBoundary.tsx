import { Component, type ReactNode, type ErrorInfo } from "react";
import { motion, useReducedMotion } from 'motion/react';
import { AlertCircle, RefreshCw, Clipboard, Check } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "./UI/colorTokens";
import { copyToClipboard } from "@/utils/clipboard";
import { logError } from "@/services/logger";
import Button from "./UI/Button";


interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  prefersReduced?: boolean;
};

interface State {
  hasError: boolean;
  error: Error | null;
  stackTrace: ErrorInfo | null;
  errorId: string;
  copied: boolean;
};

class ErrorBoundary extends Component<Props, State> {
  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  state: State = {
    hasError: false,
    error: null,
    stackTrace: null,
    errorId: "",
    copied: false,
  };

  static getDerivedStateFromError(error: Error, errorInfo: ErrorInfo): Partial<State> {
    return {
      hasError: true,
      error,
      stackTrace: errorInfo,
      errorId: `err-${Date.now().toString(36)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError("ErrorBoundary", error, errorInfo.componentStack);
  }

  componentWillUnmount(): void {
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
  }

  private handleRetry = () => {
    this.setState({ 
      hasError: false,
      error: null,
      stackTrace: null,
      errorId: "",
      copied: false,
    });
  }
  
  private handleCopy = async() => {
    const { error, stackTrace, errorId } = this.state;
    const text = [
      `Error ID ${errorId}`,
      `Fecha: ${new Date().toISOString()}`,
      `Mensaje: ${error?.message ?? "Sin mensaje."}`,
      `Stack: ${stackTrace?.componentStack ?? "N/A"}`,
    ].join("\n");

    const ok = await copyToClipboard(text);
    if(ok) {
      this.setState({ copied: true });
      this.copyTimeout = setTimeout(() => this.setState({ copied: false}), 2000);
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const danger = SEMANTIC_COLOR_MAP.danger;
    const prefersReduced = this.props.prefersReduced ?? false;

    return (
      <div
        className="flex min-h-[400px] items-center justify-center p-8"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <motion.div
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.3, ease: [0, 0, 0.2, 1] }}
          className="w-full max-w-lg rounded-[var(--radius-container)] border border-border-default bg-white p-8 text-center shadow-lg space-y-6"
        >
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 ${danger.bg100} ${danger.border200}`}
          >
            <AlertCircle className={`h-8 w-8 ${danger.icon500}`} aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-text-primary">Algo salió mal</h1>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-text-secondary">
              Ocurrió un error inesperado al cargar esta sección.
              Puedes intentar recargar o copiar los detalles para reportarlo.
            </p>
          </div>

          {this.state.errorId && (
            <p className="text-xs font-mono text-text-tertiary">
              {this.state.errorId} · {new Date().toLocaleDateString("es-MX")}
            </p>
          )}

          {this.state.error && (
            <details className="rounded-[var(--radius-control)] border border-border-default bg-surface-sunken p-4 text-left">
              <summary className="cursor-pointer text-xs font-semibold text-text-secondary">
                Detalles técnicos
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs font-mono text-text-secondary">
                {this.state.error.message}
              </pre>
              {this.state.stackTrace?.componentStack && (
                <details className="mt-3 rounded-[var(--radius-control)] border border-border-default bg-surface-sunken p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-text-secondary">
                    Stack trace
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs font-mono text-text-secondary">
                    {this.state.stackTrace.componentStack}
                  </pre>
                </details>
              )}
            </details>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              icon={this.state.copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
              onClick={this.handleCopy}
            >
              {this.state.copied ? "¡Copiado!" : "Copiar error"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={this.handleRetry}
            >
              Reintentar
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }
}

export default function ErrorBoundaryWrapper(props: Omit<Props, "prefersReduced">) {
  const prefersReduced = useReducedMotion();
  return <ErrorBoundary {...props} prefersReduced={!!prefersReduced} />;
}
