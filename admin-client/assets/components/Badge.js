/* eslint-disable */
import { html } from '../lib/setup.js';

const VARIANT_STYLES = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-red-100 text-red-600',
    kakao: 'text-[#3C1E1E]',
    naver: 'text-white',
    google: 'bg-gray-100 text-gray-700',
    login: 'bg-blue-100 text-blue-700',
    ticket: 'bg-primary-50 text-primary-600',
    zero: 'bg-gray-100 text-gray-400',
    purchase: 'bg-emerald-100 text-emerald-700',
    event: 'bg-amber-100 text-amber-700',
    used: 'bg-gray-200 text-gray-500',
    expired: 'bg-red-50 text-red-400',
    available: 'bg-blue-50 text-blue-600',
};

export function Badge({ children, variant }) {
    return html`
        <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                     ${VARIANT_STYLES[variant] || VARIANT_STYLES.active}">
            ${children}
        </span>
    `;
}

export function LoginBadge({ loginType }) {
    if (!loginType) return html`<span class="text-gray-300 text-xs">-</span>`;

    const styles = {
        KAKAO: { bg: '#FEE500', text: '#3C1E1E' },
        NAVER: { bg: '#03C75A', text: '#FFFFFF' },
        GOOGLE: { bg: '#F1F3F4', text: '#3C4043' },
    };

    const s = styles[loginType] || styles.GOOGLE;

    return html`
        <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
              style=${{ backgroundColor: s.bg, color: s.text }}>
            ${loginType}
        </span>
    `;
}
