export interface EmbeddingSupplier {
    getEmbedding(text: string): Promise<number[]>;
}

// 의존성 주입(DI)을 위한 토큰 생성
export const EMBEDDING_SERVICE = 'EMBEDDING_SERVICE';
