/** Minimal typed observer. Keeps every service decoupled from React. */
export type Listener<T> = (payload: T) => void;

export class Emitter<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    (this.listeners[event] ??= new Set()).add(fn);
    return () => this.listeners[event]?.delete(fn);
  }

  emit<K extends keyof Events>(event: K, ...[payload]: Events[K] extends void ? [] : [Events[K]]): void {
    this.listeners[event]?.forEach((fn) => fn(payload as Events[K]));
  }

  clear(): void {
    this.listeners = {};
  }
}
