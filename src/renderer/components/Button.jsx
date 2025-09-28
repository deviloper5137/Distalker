import { useState } from "react";

/**
 * 메인에서 theme을 prop으로 넘겨받거나, Context로 관리하는 것이 일반적입니다.
 * 여기서는 theme prop을 받아서 색상을 동적으로 적용하는 예시를 보여드립니다.
 * 
 * main.jsx에서 <Button theme="light"> 또는 <Button theme="dark">로 사용하세요.
 */
const themeStyles = {
    light: {
        border: '2px solid #0C0C0C',
        background: '#0C0C0C',
        color: '#F0F3F9',
        boxShadow: (pressed) => pressed ? '0 0px 0px #0C0C0C' : '0 3px 8px #0C0C0C',
    },
    dark: {
        border: '2px solid #F0F3F9',
        background: '#F0F3F9',
        color: '#0C0C0C',
        boxShadow: (pressed) => pressed ? '0 0px 0px #F0F3F9' : '0 3px 8px #F0F3F9',
    }
};

export function Button({ children, theme = "light", style, onClick, ...restProps }) {
    const [pressed, setPressed] = useState(false);

    // theme이 잘못 들어오면 light로 fallback
    const t = themeStyles[theme] || themeStyles.light;

    const styles = {
        borderRadius: 30,
        border: t.border,
        height: 56,
        background: t.background,
        boxSizing: 'border-box',
        paddingLeft: 46,
        paddingRight: 46,
        color: t.color,
        fontWeight: 'bold',
        boxShadow: t.boxShadow(pressed),
        fontSize: 20,
        cursor: 'pointer',
        transition: 'transform 0.3s cubic-bezier(.3,1.35,.5,1), box-shadow 0.3s cubic-bezier(.3,1.35,.5,1)',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        lineHeight: 1,
        minWidth: 64,
        ...style,
    }

    return (
        <button
            style={styles}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            onClick={onClick}
            {...restProps}
        >
            {children}
        </button>
    );
}
