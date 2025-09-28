import React, { useState, useRef, useEffect } from 'react';
import FlexAlign from './FlexAlign';
import distalkerIcon from '/assets/icon.png';

const themeStyles = {
    global: {
        borderRadius: 12,
        transition: 'width 0.3s cubic-bezier(.3,1.35,.5,1), box-shadow 0.3s cubic-bezier(.3,1.35,.5,1), background 0.3s ease',
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

function Separator({ theme }) {
    const t = themeStyles[theme] || themeStyles.light;
    return (
        <div style={{ width: '100%', height: 1, background: t.color, marginTop: 0, marginBottom: 0, opacity: 0.5 }}></div>
    );
}

function SidebarIcon({ icon, theme, hovered, onClick, onMouseEnter, onMouseLeave, iconRef }) {
    const t = themeStyles[theme] || themeStyles.light;
    const baseStyle = {
        width: 54,
        height: 54,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        borderRadius: 8,
        background: 'transparent',
        transition: 'background 0.3s ease',
        cursor: onClick ? 'pointer' : 'default',
        willChange: 'background',
    };

    if (typeof icon === 'string' && /\.(png|jpe?g|gif|svg)$/.test(icon)) {
        return (
            <div
                ref={iconRef}
                style={baseStyle}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <img
                    src={icon}
                    alt=""
                    style={{
                        width: 40,
                        height: 40,
                        objectFit: 'contain',
                        display: 'block',
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                    draggable={false}
                />
            </div>
        );
    } else if (typeof icon === 'string') {
        return (
            <div
                ref={iconRef}
                style={{
                    ...baseStyle,
                    fontSize: 32,
                }}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {icon}
            </div>
        );
    } else if (React.isValidElement(icon)) {
        return (
            <div
                ref={iconRef}
                style={baseStyle}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {React.cloneElement(icon, {
                    style: {
                        width: 54,
                        height: 54,
                        objectFit: 'contain',
                        ...icon.props.style,
                    }
                })}
            </div>
        );
    } else {
        return null;
    }
}

function ItemList({ items = [], theme = 'light', expand, iconMargin }) {
    const t = themeStyles[theme] || themeStyles.light;
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [activeIdx, setActiveIdx] = useState(null);

    if (!items || items.length === 0) {
        return null;
    }

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    <FlexAlign
                        options={{ align: 'center', justify: 'start' }}
                        style={{
                            cursor: 'pointer',
                            borderRadius: 8,
                            transition: 'background 0.3s ease',
                            background:
                                activeIdx === index
                                    ? t.activeBackground
                                    : hoveredIdx === index
                                        ? t.hoverBackground
                                        : 'transparent',
                            willChange: 'background',
                        }}
                        onMouseEnter={() => setHoveredIdx(index)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onMouseDown={() => setActiveIdx(index)}
                        onMouseUp={() => setActiveIdx(null)}
                        onMouseOut={() => {
                            setActiveIdx(null);
                            setHoveredIdx(null);
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget && item.onClick) {
                                item.onClick();
                            }
                        }}
                    >
                        {item.icon && (
                            <div
                                style={{
                                    marginLeft: expand ? 0 : Math.round(iconMargin),
                                    transition: 'margin-left 0.3s cubic-bezier(.3,1.35,.5,1)',
                                    willChange: 'margin-left',
                                }}
                            >
                                <SidebarIcon
                                    icon={item.icon}
                                    theme={theme}
                                    hovered={hoveredIdx === index}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.onClick) item.onClick();
                                    }}
                                />
                            </div>
                        )}
                        <div
                            className="label-container"
                            style={{
                                marginLeft: expand ? 8 : 0,
                                color: t.color,
                                fontSize: 18,
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                opacity: expand ? 1 : 0,
                                transform: expand ? 'translateX(0)' : 'translateX(-15px)',
                                maxWidth: expand ? 200 : 0, // calc 제거, 고정값으로 부드러운 전환
                                transition: 'opacity 0.3s cubic-bezier(.3,1.35,.5,1), transform 0.3s cubic-bezier(.3,1.35,.5,1), max-width 0.3s cubic-bezier(.3,1.35,.5,1)', // max-width 복원
                                pointerEvents: expand ? 'auto' : 'none',
                                willChange: 'opacity, transform, max-width', // max-width 추가
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (item.onClick) item.onClick();
                            }}
                        >
                            {item.label}
                        </div>
                    </FlexAlign>
                    {item.separator && index < items.length - 1 && (
                        <Separator theme={theme} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

function Sidebar({ items = [], theme = 'light' }) {
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

export default Sidebar;