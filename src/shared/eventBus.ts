type EventMap = Record<string, unknown>;
type Handler<T> = (payload: T) => void;

export class TypedEventBus<Events extends EventMap> {
  private readonly handlers = new Map<keyof Events, Set<Handler<Events[keyof Events]>>>();

  on<Key extends keyof Events>(event: Key, handler: Handler<Events[Key]>): () => void {
    const bucket = this.handlers.get(event) ?? new Set();
    bucket.add(handler as Handler<Events[keyof Events]>);
    this.handlers.set(event, bucket);
    return () => this.off(event, handler);
  }

  off<Key extends keyof Events>(event: Key, handler: Handler<Events[Key]>): void {
    const bucket = this.handlers.get(event);
    bucket?.delete(handler as Handler<Events[keyof Events]>);
    if (bucket?.size === 0) this.handlers.delete(event);
  }

  emit<Key extends keyof Events>(event: Key, payload: Events[Key]): void {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }

  clear(): void {
    this.handlers.clear();
  }
}

export interface GameEvents extends EventMap {
  'scene:ready': { page: PageNumber };
  'mission:complete': { page: PageNumber };
  'feedback:show': { message: string; tone: 'info' | 'success' | 'warning' };
}

import type { PageNumber } from './types';
export const gameEvents = new TypedEventBus<GameEvents>();
