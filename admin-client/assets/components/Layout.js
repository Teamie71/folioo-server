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

