import React, { useState, useEffect } from 'react';
import FlexAlign from '../components/FlexAlign.jsx';
import { Card } from '../components/Card.jsx';

const styles = {
    light: {
        background: '#F0F3F9',
        color: '#0C0C0C',
        border: '2px solid #0C0C0C',
        cardBackground: '#F0F3F9',
        subText: '#444',
        inputBorder: '#888',
    },
    dark: {
        background: '#0C0C0C',
        color: '#F0F3F9',
        border: '2px solid #F0F3F9',
        cardBackground: '#0C0C0C',
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
    const [startupEnabled, setStartupEnabled] = useState(false);
    const [startupMinimized, setStartupMinimized] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const userSettings = await window.distalker.getUserSettings();
            setSettings(prev => ({ ...prev, ...userSettings }));
            
            // 자동실행 설정 불러오기
            const startupEnabled = await window.distalker.getStartupEnabled();
            const startupMinimized = await window.distalker.getStartupMinimized();
            setStartupEnabled(startupEnabled);
            setStartupMinimized(startupMinimized);
            
            setLoading(false);
        })();
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const toggleStartup = async () => {
        try {
            const next = !startupEnabled;
            const applied = await window.distalker.setStartupEnabled(next);
            setStartupEnabled(!!applied);
            
            // 자동실행이 비활성화되면 최소화 옵션도 비활성화
            if (!next) {
                const appliedMin = await window.distalker.setStartupMinimized(false);
                setStartupMinimized(!!appliedMin);
            }
        } catch (error) {
            console.error('자동실행 설정 변경 실패:', error);
        }
    };

    const toggleStartupMinimized = async () => {
        try {
            const next = !startupMinimized;
            const applied = await window.distalker.setStartupMinimized(next);
            setStartupMinimized(!!applied);
        } catch (error) {
            console.error('자동실행 최소화 설정 변경 실패:', error);
        }
    };

    // 자동 저장 (디바운스)
    useEffect(() => {
        const timer = setTimeout(() => {
            window.distalker.saveUserSettings(settings);
        }, 500);
        return () => clearTimeout(timer);
    }, [settings]);

    return (
        <div style={{ width: '100%', height: '100%', overflow: 'auto', padding: '20px', boxSizing: 'border-box' }}>
            <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ width: '100%', minHeight: '100%', gap: 12 }}>
                <FlexAlign options={{ align: 'center', justify: 'center' }} style={{ width: '100%', height: 80, fontSize: 32, fontWeight: 'bold' }}>
                    설정
                </FlexAlign>

                <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ gap: 12 }}>
                <Card theme={theme} style={{ width: '100%', height: null }}>
                    <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ width: '100%', height: null, boxSizing: 'border-box', padding: 22, gap: 12}}>
                        <FlexAlign options={{ align: 'start', justify: 'start' }} style={{ fontSize: 22, fontWeight: 'bold' }}>
                            자동실행 설정
                        </FlexAlign>

                        <FlexAlign options={{ justify: 'start' }}>시스템 시작 시 Distalker를 자동으로 실행하도록 설정합니다.</FlexAlign>

                        <div style={{ width: '100%' }}>
                            <FlexAlign options={{ align: 'center', justify: 'start' }} style={{ gap: 12 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={startupEnabled}
                                        onChange={toggleStartup}
                                        disabled={loading}
                                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: 16, fontWeight: 600, color: t.color }}>
                                        시스템 시작 시 자동실행
                                    </span>
                                </label>
                            </FlexAlign>
                        </div>

                        {startupEnabled && (
                            <div style={{ width: '100%' }}>
                                <FlexAlign options={{ align: 'center', justify: 'start' }} style={{ gap: 12 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={startupMinimized}
                                            onChange={toggleStartupMinimized}
                                            disabled={loading}
                                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: 16, fontWeight: 600, color: t.color }}>
                                            트레이에 최소화한 상태로 시작
                                        </span>
                                    </label>
                                </FlexAlign>
                            </div>
                        )}
                    </FlexAlign>
                </Card>

                <Card theme={theme} style={{ width: '100%', height: null }}>
                    <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ width: '100%', height: null, boxSizing: 'border-box', padding: 22, gap: 12}}>
                        <FlexAlign options={{ align: 'start', justify: 'start' }} style={{ fontSize: 22, fontWeight: 'bold' }}>
                            Discord 설정
                        </FlexAlign>

                        <FlexAlign options={{ justify: 'start' }}>Discord Rich Presence를 위한 기본 설정을 구성합니다.</FlexAlign>

                        <div style={{ width: '100%' }}>
                            <label style={{ fontSize: 14, fontWeight: 600, color: t.color }}>Discord 클라이언트 ID</label>
                            <input
                                type="text"
                                value={settings.clientId}
                                onChange={e => handleChange('clientId', e.target.value)}
                                placeholder="Discord 애플리케이션 클라이언트 ID"
                                style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${t.inputBorder}`, marginTop: 6, fontSize: 16, boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ width: '100%' }}>
                            <label style={{ fontSize: 14, fontWeight: 600, color: t.color }}>자리비움 타임아웃 (분)</label>
                            <input
                                type="number"
                                min={1}
                                max={60}
                                value={settings.idleTimeout}
                                onChange={e => handleChange('idleTimeout', parseInt(e.target.value) || 10)}
                                style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${t.inputBorder}`, marginTop: 6, fontSize: 16, boxSizing: 'border-box' }}
                            />
                        </div>
                    </FlexAlign>
                </Card>

                <Card theme={theme} style={{ width: '100%', height: null }}>
                    <FlexAlign options={{ direction: 'vertical', align: 'start', justify: 'center' }} style={{ width: '100%', height: null, boxSizing: 'border-box', padding: 22, gap: 12}}>
                        <FlexAlign options={{ align: 'start', justify: 'start' }} style={{ fontSize: 22, fontWeight: 'bold' }}>
                            Discord 이미지 키
                        </FlexAlign>

                        <FlexAlign options={{ justify: 'start' }}>Discord Rich Presence에서 사용할 이미지 키를 설정합니다.</FlexAlign>

                        <div style={{ width: '100%' }}>
                            <label style={{ fontSize: 14, fontWeight: 600, color: t.color }}>온라인 상태 이미지 키</label>
                            <input
                                type="text"
                                value={settings.onlineImageKey}
                                onChange={e => handleChange('onlineImageKey', e.target.value)}
                                placeholder="온라인 상태 이미지 키"
                                style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${t.inputBorder}`, marginTop: 6, fontSize: 16, boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ width: '100%' }}>
                            <label style={{ fontSize: 14, fontWeight: 600, color: t.color }}>자리비움 상태 이미지 키</label>
                            <input
                                type="text"
                                value={settings.idleImageKey}
                                onChange={e => handleChange('idleImageKey', e.target.value)}
                                placeholder="자리비움 상태 이미지 키"
                                style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${t.inputBorder}`, marginTop: 6, fontSize: 16, boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ width: '100%' }}>
                            <label style={{ fontSize: 14, fontWeight: 600, color: t.color }}>오류 상태 이미지 키</label>
                            <input
                                type="text"
                                value={settings.errorImageKey}
                                onChange={e => handleChange('errorImageKey', e.target.value)}
                                placeholder="오류 상태 이미지 키"
                                style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${t.inputBorder}`, marginTop: 6, fontSize: 16, boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ width: '100%' }}>
                            <label style={{ fontSize: 14, fontWeight: 600, color: t.color }}>경고 상태 이미지 키</label>
                            <input
                                type="text"
                                value={settings.warningImageKey}
                                onChange={e => handleChange('warningImageKey', e.target.value)}
                                placeholder="경고 상태 이미지 키"
                                style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${t.inputBorder}`, marginTop: 6, fontSize: 16, boxSizing: 'border-box' }}
                            />
                        </div>

                    </FlexAlign>
                </Card>
                </FlexAlign>
            </FlexAlign>
        </div>
    );
}
