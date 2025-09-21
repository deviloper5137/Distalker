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
        inputBorder: '#888',
    },
    dark: {
        background: '#0C0C0C',
        color: '#F0F3F9',
        border: '2px solid #F0F3F9',
        cardBg: '#181818',
        subText: '#B0B0B0',
        inputBorder: '#888',
    }
}

export function Settings({ theme }) {
    const t = styles[theme] || styles.light;

    const [settings, setSettings] = useState({
        clientId: '',
        idleTimeout: 10,
        onlineImageKey: 'online',
        idleImageKey: 'idle',
        errorImageKey: 'error',
        warningImageKey: 'warning',
    });
    const [loading, setLoading] = useState(true);
    const [saveMsg, setSaveMsg] = useState('');

    useEffect(() => {
        (async () => {
            const userSettings = await window.distalker.getUserSettings();
            setSettings(prev => ({ ...prev, ...userSettings }));
            setLoading(false);
        })();
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const saveSettings = async () => {
        setLoading(true);
        await window.distalker.saveUserSettings(settings);
        setSaveMsg('저장됨!');
        setTimeout(() => setSaveMsg(''), 1500);
        setLoading(false);
    };

    return (
        <FlexAlign options={{ direction: 'vertical', align: 'center', justify: 'center' }} style={{ width: '100%', height: '100%', gap: 24 }}>
            <div style={{ fontWeight: 'bold', fontSize: 32, marginBottom: 4, color: t.color }}>
                설정
            </div>

            <div style={{ width: 420, background: t.cardBg, borderRadius: 12, padding: 24, boxShadow: '0 2px 8px #0002', border: '1px solid #0001' }}>
                <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ gap: 14, height: 'auto' }}>
                    <div>
                        <label style={{ fontWeight: 600, fontSize: 15, color: t.color }}>Discord 클라이언트 ID</label>
                        <input
                            type="text"
                            value={settings.clientId}
                            onChange={e => handleChange('clientId', e.target.value)}
                            placeholder="Discord 애플리케이션 클라이언트 ID"
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${t.inputBorder}`, marginTop: 6 }}
                        />
                    </div>

                    <div>
                        <label style={{ fontWeight: 600, fontSize: 15, color: t.color }}>자리비움 타임아웃 (분)</label>
                        <input
                            type="number"
                            min={1}
                            max={60}
                            value={settings.idleTimeout}
                            onChange={e => handleChange('idleTimeout', parseInt(e.target.value) || 10)}
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${t.inputBorder}`, marginTop: 6 }}
                        />
                    </div>

                    <div>
                        <label style={{ fontWeight: 600, fontSize: 15, color: t.color }}>Discord 이미지 키</label>
                        <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ gap: 8, marginTop: 6, height: 'auto', width: '100%' }}>
                            <input
                                type="text"
                                value={settings.onlineImageKey}
                                onChange={e => handleChange('onlineImageKey', e.target.value)}
                                placeholder="온라인 상태 이미지 키"
                                style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${t.inputBorder}` }}
                            />
                            <input
                                type="text"
                                value={settings.idleImageKey}
                                onChange={e => handleChange('idleImageKey', e.target.value)}
                                placeholder="자리비움 상태 이미지 키"
                                style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${t.inputBorder}` }}
                            />
                            <input
                                type="text"
                                value={settings.errorImageKey}
                                onChange={e => handleChange('errorImageKey', e.target.value)}
                                placeholder="오류 상태 이미지 키"
                                style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${t.inputBorder}` }}
                            />
                            <input
                                type="text"
                                value={settings.warningImageKey}
                                onChange={e => handleChange('warningImageKey', e.target.value)}
                                placeholder="경고 상태 이미지 키"
                                style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${t.inputBorder}` }}
                            />
                        </FlexAlign>
                    </div>

                    <Button theme={theme} onClick={saveSettings} disabled={loading} style={{ width: '100%', marginTop: 4 }}>
                        {loading ? '설정을 적용하는 중...' : '저장'}
                    </Button>
                    {saveMsg && <div style={{ color: '#3A8DFF', fontWeight: 600 }}>{saveMsg}</div>}
                </FlexAlign>
            </div>
        </FlexAlign>
    );
}
