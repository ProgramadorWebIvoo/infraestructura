import { describe, it, expect } from "vitest";
import { createTaskQueue } from "@/utils/taskQueue";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe("createTaskQueue", () => {
  it("nunca ejecuta más de maxConcurrent tareas a la vez", async () => {
    const run = createTaskQueue(2);
    let active = 0;
    let peak = 0;
    const gates = Array.from({ length: 6 }, deferred);

    const results = gates.map((gate, i) =>
      run(async () => {
        active++;
        peak = Math.max(peak, active);
        await gate.promise;
        active--;
        return i;
      }),
    );

    await Promise.resolve();
    expect(active).toBe(2);
    gates.forEach((g) => g.resolve());
    expect(await Promise.all(results)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
  });

  it("respeta el orden de llegada", async () => {
    const run = createTaskQueue(1);
    const order: number[] = [];
    await Promise.all([1, 2, 3].map((n) => run(async () => void order.push(n))));
    expect(order).toEqual([1, 2, 3]);
  });

  it("una tarea que falla no bloquea la cola", async () => {
    const run = createTaskQueue(1);
    const failing = run(async () => {
      throw new Error("boom");
    });
    const next = run(async () => "ok");
    await expect(failing).rejects.toThrow("boom");
    await expect(next).resolves.toBe("ok");
  });

  it("convierte un throw síncrono en rechazo", async () => {
    const run = createTaskQueue(1);
    await expect(
      run((() => {
        throw new Error("sync");
      }) as () => Promise<never>),
    ).rejects.toThrow("sync");
  });
});
