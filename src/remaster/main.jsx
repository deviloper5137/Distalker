import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from './components/Button.jsx';
import Sidebar from './components/Sidebar.jsx';
import FlexAlign from './components/FlexAlign.jsx';
import { Start } from './tabs/Start.jsx';

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

const theme = 'light';

function App() {
    const icons = ['📁','⭐','🔔','📝','⚙','🗂','🧭','📊'];
    const sidebarItems = Array.from({ length: 40 }, (_, i) => ({
        icon: icons[i % icons.length],
        label: `메뉴 ${i + 1}`,
        onClick: () => console.log(`메뉴 ${i + 1} 클릭`),
        separator: (i + 1) % 8 === 0
    }));

    return (
        <FlexAlign options={{ align: 'center', justify: 'start' }} style={{ width: '100vw', height: '100vh', background: styles[theme].background, color: styles[theme].color, fontFamily: styles.global.fontFamily, boxSizing: 'border-box', padding: 12, gap: 12 }}>
            <Sidebar theme={theme} items={sidebarItems} />
            <Start theme = {theme}/>
        </FlexAlign>
    )
}

root.render(<App />);