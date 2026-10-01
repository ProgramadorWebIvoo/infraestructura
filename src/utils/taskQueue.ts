/**
 * Cola que ejecuta como máximo `maxConcurrent` tareas asíncronas a la vez; el
 * resto espera en orden de llegada. Evita, por ejemplo, lanzar 70 descargas
 * simultáneas al abrir una lista larga de productos con imagen.
 */
export type TaskRunner = <T>(task: () => Promise<T>) => Promise<T>;

export function createTaskQueue(maxConcurrent: number): TaskRunner {
  const limit = Math.max(1, Math.floor(maxConcurrent));
  let active = 0;
  const waiting: Array<() => void> = [];

  const startNext = () => {
    while (active < limit && waiting.length > 0) {
      active++;
      waiting.shift()!();
    }
  };

  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      waiting.push(() => {
        // `Promise.resolve().then` convierte también un throw síncrono en rechazo.
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            active--;
            startNext();
          });
      });
      startNext();
    });
  };
}
