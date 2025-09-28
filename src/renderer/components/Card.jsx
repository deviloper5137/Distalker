import React, { useState, useRef, useEffect } from 'react';

const themeStyles = {
    global: {
        borderRadius: 12,
        transition: 'box-shadow 0.3s cubic-bezier(.3,1.35,.5,1), background 0.3s ease',
    },
    light: {
        border: '2px solid #0C0C0C',
        background: '#F0F3F9',
        color: '#0C0C0C',
        activeBackground: '#F0F3F9',
        hoverBackground: '#C0C3C9',
        boxShadow: (hover) => hover ? '0 3px 8px #0C0C0C' : '0 0px 0px #0C0C0C'
    },
    dark: {
        border: '2px solid #F0F3F9',
        background: '#0C0C0C',
        color: '#F0F3F9',
        activeBackground: '#232323',
        hoverBackground: '#202020',
        boxShadow: (hover) => hover ? '0 3px 8px #F0F3F9' : '0 0px 0px #F0F3F9',
    }
};

export function Card({ items = [], theme = 'light' }) {
    const [expand, setExpand] = useState(false);
    const [hover, setHover] = useState(false);
    const sidebarRef = useRef(null);
    const iconRef = useRef(null);
    const [iconMargin, setIconMargin] = useState(0);

    const displayItems = React.useMemo(() => [
        {
            icon: distalkerIcon,
            label: 'Distalker',
            separator: true,
            onClick: () => setExpand(expand => !expand),
        },
        ...(items || [])
    ], [items]);

    const g = themeStyles.global;
    const t = themeStyles[theme] || themeStyles.light;

    useEffect(() => {
        if (iconRef.current) {
            const iconSize = iconRef.current.offsetWidth; // 54
            const collapsedContentWidth = 72 - 12; // 60
            const margin = Math.round((collapsedContentWidth - iconSize) / 2);
            setIconMargin(margin);
        }
    }, [expand]);

    return (
        <div
            ref={sidebarRef}
            style={{
                width: expand ? 270 : 72,
                height: 'calc(100vh - 24px)',
                background: t.background,
                border: t.border,
                borderRadius: g.borderRadius,
                justifyContent: 'center',
                overflow: 'visible',
                boxShadow: t.boxShadow(hover),
                transition: g.transition,
                boxSizing: 'border-box',
                padding: 6,
                willChange: 'width, box-shadow',
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <style>
                {`
                .sidebar-scroll { 
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .sidebar-scroll::-webkit-scrollbar { 
                    display: none;
                    width: 0; 
                    height: 0; 
                }
                `}
            </style>
            <FlexAlign 
                options={{ align: 'start', justify: 'center' }}
                style={{ width: '100%', height: '100%' }}
            >
                <div className="sidebar-scroll" style={{ width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                    <ItemList 
                        items={displayItems}
                        theme={theme}
                        expand={expand}
                        iconMargin={iconMargin}
                    />
                </div>
            </FlexAlign>
        </div>
    );
}
