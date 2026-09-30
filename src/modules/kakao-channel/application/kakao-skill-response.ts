import { KakaoOutput, KakaoSkillResDTO } from './dtos/kakao-skill.dto';

export interface KakaoLinkCard {
    title: string;
    description: string;
    buttonLabel: string;
}

function response(output: KakaoOutput): KakaoSkillResDTO {
    return { version: '2.0', template: { outputs: [output] } };
}

export function textResponse(text: string): KakaoSkillResDTO {
    return response({ simpleText: { text } });
}

export function linkCardResponse(card: KakaoLinkCard, webLinkUrl: string): KakaoSkillResDTO {
    return response({
        basicCard: {
            title: card.title,
            description: card.description,
            buttons: [{ action: 'webLink', label: card.buttonLabel, webLinkUrl }],
        },
    });
}
