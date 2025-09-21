import React from 'react';
import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { Button } from './components/Button.jsx';
import Sidebar from './components/Sidebar.jsx';
import FlexAlign from './components/FlexAlign.jsx';
import { Start } from './tabs/Start.jsx';
import { ActivityManager } from './tabs/ActivityManager.jsx';
import { Settings } from './tabs/Settings.jsx';

function formatWithVars(format, app, title) {
    return format.replace(/\{app\}/g, app).replace(/\{title\}/g, title);
}

const root = createRoot(document.getElementById('root'));
const styles = {
    global: {
        fontFamily: `'Inter', 'Noto Sans KR', 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'`
    },
    light: {
        background: '#F0F3F9',
        color: '#0C0C0C',
        border: '2px solid #0C0C0C',
    },
    dark: {
        background: '#0C0C0C',
        color: '#F0F3F9',
        border: '2px solid #F0F3F9'
    }
}

const theme = 'dark';

function App() {
    const [activeTab, setActiveTab] = useState('start');
    const sidebarItems = [
        {
            icon: '🌙',
            label: '활동 관리',
            onClick: () => setActiveTab('activity')
        },
        {
            icon: '⚙',
            label: '설정',
            onClick: () => setActiveTab('settings')
        },
    ];

    return (
        <FlexAlign options={{ align: 'center', justify: 'start' }} style={{ width: '100vw', height: '100vh', background: styles[theme].background, color: styles[theme].color, fontFamily: styles.global.fontFamily, boxSizing: 'border-box', padding: 12, gap: 12, overflow: 'hidden' }}>
            <Sidebar theme={theme} items={sidebarItems} />
            {activeTab === 'start' && <Start theme={theme} />}
            {activeTab === 'activity' && <ActivityManager theme={theme} />}
            {activeTab === 'settings' && <Settings theme={theme} />}
        </FlexAlign>
    )
}

root.render(<App />);