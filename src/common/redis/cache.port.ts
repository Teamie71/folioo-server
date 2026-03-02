export abstract class CachePort {
    abstract get(key: string): Promise<string | null>;
    abstract set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    abstract del(key: string): Promise<number>;
    abstract exists(key: string): Promise<boolean>;
    abstract ping(): Promise<string>;
    abstract quit(): Promise<void>;
}
