import { Insight } from '../../domain/entities/insight.entity';

export interface InsightDetailPayload {
    insight: Insight;
    activityNames: string[];
}

export interface InsightSimilarityPayload extends InsightDetailPayload {
    similarityScore: number | null;
}
