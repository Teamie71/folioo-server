/* eslint-disable */
// Folioo Admin Dashboard — Entry Point
import { html, useState } from './lib/setup.js';
import { Header, TabNav, ComingSoonTab } from './components/Layout.js';
import { UserManagementTab } from './pages/UserManagement.js';

function App() {
    const [activeTab, setActiveTab] = useState('users');

    return html`
        <div class="max-w-[1200px] mx-auto p-6">
            <${Header} />
            <${TabNav} activeTab=${activeTab} onTabChange=${setActiveTab} />

            ${activeTab === 'users' && html`<${UserManagementTab} />`}
            ${activeTab === 'tickets' && html`<${ComingSoonTab} title="이용권 거래 내역" />`}
            ${activeTab === 'events' && html`<${ComingSoonTab} title="이벤트 모달 관리" />`}
        </div>
    `;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
