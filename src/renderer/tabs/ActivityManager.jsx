import React, { useState, useEffect } from 'react';
import FlexAlign from '../components/FlexAlign.jsx';
import { Button } from '../components/Button.jsx';

const styles = {
    light: {
        background: '#F0F3F9',
        color: '#0C0C0C',
        border: '2px solid #0C0C0C',
        cardBg: '#fff',
        subText: '#444',
        chipBg: '#222',
        chipText: '#fff',
        inputBorder: '#888',
    },
    dark: {
        background: '#0C0C0C',
        color: '#F0F3F9',
        border: '2px solid #F0F3F9',
        cardBg: '#181818',
        subText: '#B0B0B0',
        chipBg: '#222',
        chipText: '#fff',
        inputBorder: '#888',
    }
}

function formatWithVars(format, title, app) {
    return format.replace(/\{title\}/g, title).replace(/\{app}/g, app);
}

export function ActivityManager({ theme }) {
    const t = styles[theme] || styles.light

    const [blacklist, setBlacklist] = useState([]);
    const [blacklistInput, setBlacklistInput] = useState('');
    const [detailsFormat, setDetailsFormat] = useState('{title}');
    const [stateFormat, setStateFormat] = useState('by {app}');
    const [saveMsg, setSaveMsg] = useState('');

    useEffect(() => {
        (async () => {
            const settings = await window.distalker.getUserSettings();
            setBlacklist(settings.appBlacklist || []);
            setDetailsFormat(settings.detailsFormat || '{title}');
            setStateFormat(settings.stateFormat || 'by {app}');
        })();
    }, []);

    const addToBlacklist = () => {
        const app = blacklistInput.trim();
        if (app && !blacklist.includes(app)) {
            setBlacklist([...blacklist, app]);
            setBlacklistInput('');
        }
    };
    const removeFromBlacklist = (app) => {
        setBlacklist(blacklist.filter(a => a !== app));
    };
    const saveActivitySettings = async () => {
        await window.distalker.saveUserSettings({
            appBlacklist: blacklist,
            detailsFormat,
            stateFormat
        });
        setSaveMsg('저장됨!');
        setTimeout(() => setSaveMsg(''), 1500);
    };

    const variableDesc = (
        <div style={{ fontSize: 13, color: t.subText, marginTop: 8 }}>
            사용 가능한 포맷팅 <b>{'{app}'}</b> (앱 이름), <b>{'{title}'}</b> (창 제목)
        </div>
    );

    const exampleApp = 'Distalker';
    const exampleTitle = 'Distalker';
    const detailsPreview = formatWithVars(detailsFormat, exampleApp, exampleTitle);
    const statePreview = formatWithVars(stateFormat, exampleApp, exampleTitle);

    return (
        <FlexAlign options={{ direction: 'vertical', align: 'center', justify: 'center' }} style={{ width: '100%', height: '100%', gap: 24 }}>
            <div style={{ fontWeight: 'bold', fontSize: 32, marginBottom: 4, color: t.color }}>
                활동 관리
            </div>

            <div style={{ width: 420, background: t.cardBg, borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #0002', border: '1px solid #0001' }}>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: t.color }}>앱 블랙리스트</div>
                <div style={{ fontSize: 14, marginBottom: 12, color: t.subText }}>여기에 추가된 앱은 실행 중일 때 RPC 상태가 표시되지 않습니다.</div>

                <FlexAlign options={{ align: 'center', justify: 'start' }} style={{ gap: 8, marginBottom: 12, height: 'auto' }}>
                    <input
                        type="text"
                        value={blacklistInput}
                        onChange={e => setBlacklistInput(e.target.value)}
                        placeholder="앱 이름 입력 (예: chrome, code)"
                        style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${t.inputBorder}` }}
                        onKeyDown={e => { if (e.key === 'Enter') addToBlacklist(); }}
                    />
                    <Button theme={theme} onClick={addToBlacklist}>추가</Button>
                </FlexAlign>

                <div style={{ minHeight: 32 }}>
                    {blacklist.length === 0 ? (
                        <span style={{ color: '#888' }}>등록된 앱 없음</span>
                    ) : (
                        <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {blacklist.map(app => (
                                <li key={app} style={{ background: t.chipBg, color: t.chipText, borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {app}
                                    <button onClick={() => removeFromBlacklist(app)} style={{ marginLeft: 4, background: 'none', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: 16 }}>×</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div style={{ width: 420, background: t.cardBg, borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #0002', border: '1px solid #0001' }}>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: t.color }}>상태 포맷 설정</div>
                <div style={{ fontSize: 14, marginBottom: 8, color: t.subText }}>아래 포맷에 변수({'{app}'}, {'{title}'})를 넣어 RPC에 표시할 내용을 직접 지정할 수 있습니다.</div>

                <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: t.color }}>Details 포맷</label>
                    <input
                        type="text"
                        value={detailsFormat}
                        onChange={e => setDetailsFormat(e.target.value)}
                        style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${t.inputBorder}`, marginTop: 6 }}
                    />
                    <div style={{ fontSize: 13, color: '#3A8DFF', marginTop: 4 }}>예시: {detailsPreview}</div>
                </div>

                <div style={{ marginBottom: 4 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: t.color }}>State 포맷</label>
                    <input
                        type="text"
                        value={stateFormat}
                        onChange={e => setStateFormat(e.target.value)}
                        style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${t.inputBorder}`, marginTop: 6 }}
                    />
                    <div style={{ fontSize: 13, color: '#3A8DFF', marginTop: 4 }}>예시: {statePreview}</div>
                </div>

                {variableDesc}
            </div>

            <FlexAlign options={{ align: 'center', justify: 'center' }} style={{ gap: 12, height: 'auto' }}>
                <Button theme={theme} onClick={saveActivitySettings}>
                    저장
                </Button>
                {saveMsg && <div style={{ color: '#3A8DFF', fontWeight: 600 }}>{saveMsg}</div>}
            </FlexAlign>
        </FlexAlign>
    );
}
