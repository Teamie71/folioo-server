/* eslint-disable */
import { html } from '../lib/setup.js';
import { Badge, LoginBadge } from './Badge.js';

export function UserTable({ users, onGrant, onEventGrant }) {
    if (!users || users.length === 0) {
        return html`
            <div class="text-center py-16 text-gray-400 text-sm">
                사용자가 없습니다
            </div>
        `;
    }

    return html`
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-gray-100/80">
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">ID</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">이름</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">이메일</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">로그인</th>
                        <th class="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">상태</th>
                        <th class="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">경험 정리</th>
                        <th class="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">첨삭</th>
                        <th class="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap"></th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map((u, i) => html`
                        <tr key=${u.userId}
                            class="border-b border-gray-100 hover:bg-primary-50/50 transition-colors
                                   ${i % 2 === 1 ? 'bg-gray-50/50' : ''}">
                            <td class="px-4 py-3 text-gray-400 tabular-nums">${u.userId}</td>
                            <td class="px-4 py-3 font-medium">${u.name}</td>
                            <td class="px-4 py-3 text-gray-500 text-xs">${u.email || '-'}</td>
                            <td class="px-4 py-3">
                                <${LoginBadge} loginType=${u.loginType} />
                            </td>
                            <td class="px-4 py-3">
                                <${Badge} variant=${u.isActive ? 'active' : 'inactive'}>
                                    ${u.isActive ? '활성' : '비활성'}
                                <//>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <${Badge} variant=${u.experienceTickets > 0 ? 'ticket' : 'zero'}>
                                    ${u.experienceTickets}
                                <//>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <${Badge} variant=${u.correctionTickets > 0 ? 'ticket' : 'zero'}>
                                    ${u.correctionTickets}
                                <//>
                            </td>
                            <td class="px-4 py-3 text-right">
                                <div class="flex justify-end gap-2">
                                    <button onClick=${() => onGrant(u)}
                                            class="px-3 py-1.5 text-xs font-semibold text-primary-500
                                                   bg-primary-50 border border-primary-500 rounded-full
                                                   hover:bg-primary-100 transition-colors whitespace-nowrap">
                                        이용권 지급
                                    </button>
                                    <button onClick=${() => onEventGrant(u)}
                                            class="px-3 py-1.5 text-xs font-semibold text-amber-600
                                                   bg-amber-50 border border-amber-300 rounded-full
                                                   hover:bg-amber-100 transition-colors whitespace-nowrap">
                                        이벤트 보상
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `)}
                </tbody>
            </table>
        </div>
    `;
}

export function SearchToolbar({ keyword, onKeywordChange, onSearch, total, loading, countLabel }) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') onSearch();
    };

    return html`
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4
                    flex gap-3 items-center flex-wrap">
            <span class="text-sm font-semibold text-gray-500 whitespace-nowrap">검색</span>
            <input type="text" value=${keyword}
                   onInput=${(e) => onKeywordChange(e.target.value)}
                   onKeyDown=${handleKeyDown}
                   placeholder="이름 또는 이메일로 검색..."
                   class="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2
                          text-sm outline-none focus:border-primary-500
                          placeholder:text-gray-400" />
            <button onClick=${onSearch} disabled=${loading}
                    class="px-5 py-2 bg-primary-500 text-white text-sm font-semibold
                           rounded-full hover:bg-primary-600 disabled:bg-gray-300
                           disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                검색
            </button>
            ${total !== null ? html`
                <span class="text-sm text-gray-400 ml-auto">
                    총 <strong class="text-primary-500">${total}</strong>${countLabel || '명'}
                </span>
            ` : null}
        </div>
    `;
}
