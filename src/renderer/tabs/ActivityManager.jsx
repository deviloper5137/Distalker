import React, { useState, useEffect } from 'react';
import FlexAlign from '../components/FlexAlign.jsx';
import { Button } from '../components/Button.jsx';
import { Card } from '../components/Card.jsx';

const styles = {
    light: {
        background: '#F0F3F9',
        color: '#0C0C0C',
        border: '2px solid #0C0C0C',
        cardBackground: '#F0F3F9',
        subText: '#444',
        chipBg: '#222',
        chipText: '#fff',
        inputBorder: '#888',
    },
    dark: {
        background: '#0C0C0C',
        color: '#F0F3F9',
        border: '2px solid #F0F3F9',
        cardBackground: '#0C0C0C',
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

    // 상태 포맷 자동 저장 (디바운스)
    useEffect(() => {
        const timer = setTimeout(() => {
            window.distalker.saveUserSettings({
                appBlacklist: blacklist,
                detailsFormat,
                stateFormat
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [blacklist, detailsFormat, stateFormat]);

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
        <div style={{ width: '100%', height: '100%', overflow: 'auto', padding: '20px', boxSizing: 'border-box' }}>
            <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ width: '100%', minHeight: '100%', gap: 12 }}>
                <FlexAlign options={{ align: 'center', justify: 'center' }} style={{ width: '100%', height: 80, fontSize: 32, fontWeight: 'bold' }}>
                    활동 관리
                </FlexAlign>

                <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ gap: 12 }}>
                <Card theme={theme} style={{ width: '100%', height: null }}>
                    <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ width: '100%', height: null, boxSizing: 'border-box', padding: 22, gap: 12}}>
                        <FlexAlign options={{ align: 'start', justify: 'start' }} style={{ fontSize: 22, fontWeight: 'bold' }}>
                            앱 블랙리스트
                        </FlexAlign>

                        <FlexAlign options={{ justify: 'start' }}>선택한 앱을 알 수 없는 앱으로 표시하도록 설정할 수 있습니다.</FlexAlign>

                        <FlexAlign options={{ align: 'center', justify: 'start' }} style={{ gap: 12 }}>
                            <input
                                type="text"
                                value={blacklistInput}
                                onChange={e => setBlacklistInput(e.target.value)}
                                placeholder="앱 이름을 입력하여 블랙리스트에 추가하세요."
                                style={{ padding: 12, borderRadius: 22, border: `1px solid ${t.inputBorder}`, width: '100%', height: 42, fontSize: 16, boxSizing: 'border-box' }}
                                onKeyDown={e => { if (e.key === 'Enter') addToBlacklist(); }}
                            />
                            <Button theme={theme} onClick={addToBlacklist} style={{ height: 42, fontSize: 16, paddingLeft: 24, paddingRight: 24 }}>추가</Button>
                        </FlexAlign>

                        {/* 등록된 앱 리스트 */}
                        <div style={{ width: '100%' }}>
                            {blacklist.length === 0 ? (
                                <span style={{ color: '#B0B0B0' }}>등록된 앱 없음</span>
                            ) : (
                                <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {blacklist.map(app => (
                                        <li key={app} style={{ background: '#222', color: '#fff', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {app}
                                            <button onClick={() => removeFromBlacklist(app)} style={{ marginLeft: 4, background: 'none', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: 16 }}>×</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </FlexAlign>
                </Card>

                <Card theme={theme} style={{ width: '100%', height: null }}>
                    <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ width: '100%', height: null, boxSizing: 'border-box', padding: 22, gap: 12}}>
                        <FlexAlign options={{ align: 'start', justify: 'start' }} style={{ fontSize: 22, fontWeight: 'bold' }}>
                            상태 포맷 설정
                        </FlexAlign>

                        <FlexAlign options={{ justify: 'start' }}>아래 포맷에 변수, {'{app}'}과 {'{title}'}을 넣어 표시 내용을 지정할 수 있습니다.</FlexAlign>

                        <div style={{ width: '100%' }}>
                            <label style={{ fontSize: 14, fontWeight: 600, color: '#F0F3F9' }}>Details 포맷</label>
                            <input
                                type="text"
                                value={detailsFormat}
                                onChange={e => setDetailsFormat(e.target.value)}
                                style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${t.inputBorder}`, marginTop: 6, fontSize: 16, boxSizing: 'border-box' }}
                            />
                            <div style={{ fontSize: 13, color: '#3A8DFF', marginTop: 6 }}>예시: {detailsPreview}</div>
                        </div>

                        <div style={{ width: '100%' }}>
                            <label style={{ fontSize: 14, fontWeight: 600, color: '#F0F3F9' }}>State 포맷</label>
                            <input
                                type="text"
                                value={stateFormat}
                                onChange={e => setStateFormat(e.target.value)}
                                style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${t.inputBorder}`, marginTop: 6, fontSize: 16, boxSizing: 'border-box' }}
                            />
                            <div style={{ fontSize: 13, color: '#3A8DFF', marginTop: 6 }}>예시: {statePreview}</div>
                        </div>

                        {variableDesc}
                    </FlexAlign>
                </Card>
                </FlexAlign>
            </FlexAlign>
        </div>
    );
}
