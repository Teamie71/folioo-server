/* eslint-disable */
import { html } from '../lib/setup.js';

export function Toast({ message, type, visible }) {
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    const stateClass = visible ? 'toast-active' : 'toast-enter';

    return html`
        <div class="fixed bottom-8 left-1/2 ${bgColor} text-white px-5 py-3 rounded-xl
                    text-sm font-semibold shadow-lg z-50 transition-all duration-300
                    max-w-[90%] whitespace-nowrap ${stateClass}"
             style=${{ pointerEvents: 'none' }}>
            ${message}
        </div>
    `;
}
