/* eslint-disable */
import { html } from '../lib/setup.js';
import { TABS } from '../lib/api.js';

export function Header() {
    return html`
        <div class="flex items-center gap-3 mb-5">
            <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center
                        text-white font-bold text-sm">
                F
            </div>
            <h1 class="text-xl font-bold">Folioo Admin</h1>
            <span class="text-xs bg-primary-50 text-primary-500 px-2.5 py-0.5
                         rounded-full font-semibold">
                Dashboard
            </span>
        </div>
    `;
}

export function TabNav({ activeTab, onTabChange }) {
    return html`
        <div class="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            ${TABS.map(tab => html`
                <button key=${tab.id}
                        onClick=${() => tab.enabled && onTabChange(tab.id)}
                        disabled=${!tab.enabled}
                        class="flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all
                               ${activeTab === tab.id
                                   ? 'bg-primary-500 text-white shadow-sm'
                                   : tab.enabled
                                       ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                       : 'text-gray-300 cursor-not-allowed'}">
                    ${tab.label}
                    ${!tab.enabled ? html`<span class="ml-1 text-[10px] opacity-60">Soon</span>` : null}
                </button>
            `)}
        </div>
    `;
}

export function ComingSoonTab({ title }) {
    return html`
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm
                    flex flex-col items-center justify-center py-24">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
            </div>
            <p class="text-gray-400 text-sm font-medium">${title}</p>
            <p class="text-gray-300 text-xs mt-1">준비 중입니다</p>
        </div>
    `;
}
