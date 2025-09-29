import React, { useState, useRef, useEffect } from 'react';
import FlexAlign from './FlexAlign';

const themeStyles = {
    global: {
        borderRadius: 22,
        transition: 'box-shadow 0.3s ease, background 0.3s ease, opacity 0.3s ease, transform 0.3s cubic-bezier(.3,1.35,.5,1)',
        opacity: (hover) => hover ? 1 : 0.8,
    },
    light: {
        border: '2px solid #0C0C0C',
        background: '#F6F9FF',
        color: '#0C0C0C',
        activeBackground: '#F0F3F9',
        hoverBackground: '#C0C3C9',
        boxShadow: (hover) => hover ? '0 3px 16px #0C0C0CAA' : '0 0px 0px #0c0c0cAA'
    },
    dark: {
        border: '2px solid #F0F3F9',
        background: '#0F0F0F',
        color: '#F0F3F9',
        activeBackground: '#232323',
        hoverBackground: '#202020',
        boxShadow: (hover) => hover ? '0 3px 16px #F0F3F9AA' : '0 0px 0px #F0F3F9AA',
    }
};

export function Card({ theme = 'light', children, style = {} }) {
    const t = themeStyles[theme] || themeStyles.light;

    const [hover, setHover] = useState(false);
    const containerRef = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setSize({ width, height });
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const transform = (() => {
        if (!hover) return 'scale(1)';
        const { width, height } = size;
        if (width <= 0 || height <= 0) return 'scale(1)';
        const scaleX = (width + 4) / width; // +2px left, +2px right
        const scaleY = (height + 4) / height; // +2px top, +2px bottom
        return `scale(${scaleX}, ${scaleY})`;
    })();

    return (
        <FlexAlign
            options={{ justify: 'center', align: 'center' }}
            style={{
                borderRadius: themeStyles.global.borderRadius,
                border: t.border,
                background: t.background,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: themeStyles.global.transition,
                opacity: themeStyles.global.opacity(hover),
                boxShadow: t.boxShadow(hover),
                transform,
                ...style
            }}
            ref={containerRef}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {children}
        </FlexAlign>
    )
}
