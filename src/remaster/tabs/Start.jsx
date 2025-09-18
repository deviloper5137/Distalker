import { Button } from '../components/Button.jsx';
import FlexAlign from '../components/FlexAlign.jsx';

const styles = {
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

export function Start({ theme = 'light' }) {
    const t = styles[theme];

    return(
        <FlexAlign options={{ direction: 'vertical', align: 'center', justify: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: 56, color: t.color, marginBottom: 8 }}>Distalker에 오신 것을 환영합니다!</div>
            <div style={{ fontSize: 22, color: t.color, marginBottom: 32 }}>게임과 앱을 포함한 모든 활동을 Discord에서 공유해보세요.</div>
            <Button theme={theme}>시작하기</Button>
        </FlexAlign>
    )
}
