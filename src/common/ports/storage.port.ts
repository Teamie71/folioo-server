export abstract class StoragePort {
    abstract getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}
