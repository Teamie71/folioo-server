/* eslint-disable */
// Folioo Admin Dashboard — Entry Point
import { html, useState } from './lib/setup.js';
import { Header, TabNav, ComingSoonTab } from './components/Layout.js';
import { UserManagementTab } from './pages/UserManagement.js';
import { TicketHistoryTab } from './pages/TicketHistory.js';
import { TicketGrantHistoryTab } from './pages/TicketGrantHistory.js';

function App() {
    const [activeTab, setActiveTab] = useState('users');

    return html`
        <div class="max-w-[1200px] mx-auto p-6">
            <${Header} />
            <${TabNav} activeTab=${activeTab} onTabChange=${setActiveTab} />

            ${activeTab === 'users' && html`<${UserManagementTab} />`}
            ${activeTab === 'tickets' && html`<${TicketHistoryTab} />`}
            ${activeTab === 'grants' && html`<${TicketGrantHistoryTab} />`}
        </div>
    `;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
