import { KakaoLinkCard } from './kakao-skill-response';

// 카카오톡 챗봇 응답 문구. 회원 안내는 2026-09-30 확정 문구를 사용한다.
// basicCard 제한: title 50자, description 230자.
export const KAKAO_MESSAGES = {
    UNLINKED: {
        title: 'Folioo 계정 연결이 필요해요',
        description:
            '카카오톡에서 경험을 정리하려면 Folioo 계정 연결이 필요해요.\n웹에서 기존 계정으로 로그인하거나 새로 가입한 뒤 카카오톡 채널 이용을 위한 연결을 완료해 주세요.\n완료 후 이 채팅으로 돌아와 활동을 선택해 주세요.',
        buttonLabel: 'Folioo 계정 연결하기',
    },
    PENDING: {
        title: '가입을 마무리해 주세요',
        description:
            'Folioo 가입과 약관 동의를 아직 마치지 않았어요.\n웹에서 가입을 마친 뒤 이 채팅으로 돌아와 활동을 선택해 주세요.',
        buttonLabel: '웹에서 가입 마무리',
    },
    NOT_READY: '카카오톡 경험 정리 기능을 준비하고 있어요. 조금만 기다려 주세요!',
    ERROR: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
} as const satisfies Record<string, KakaoLinkCard | string>;
