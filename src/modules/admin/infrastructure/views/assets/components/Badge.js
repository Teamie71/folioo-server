/* eslint-disable */
import { html } from '../lib/setup.js';

const VARIANT_STYLES = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-red-100 text-red-600',
    login: 'bg-blue-100 text-blue-700',
    ticket: 'bg-primary-50 text-primary-600',
    zero: 'bg-gray-100 text-gray-400',
};

export function Badge({ children, variant }) {
    return html`
        <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                     ${VARIANT_STYLES[variant] || VARIANT_STYLES.active}">
            ${children}
        </span>
    `;
}
