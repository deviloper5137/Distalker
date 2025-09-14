import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// 색상 상수 선언 (OKLCH)
const COLOR_PRIMARY = 'oklch(78.5% 0.19 255)';
const COLOR_BG = 'oklch(0% 0 0)';
const COLOR_BG_CARD = 'oklch(14.5% 0.04 264)';
const COLOR_BG_CARD_ACTIVE = 'oklch(16.5% 0.04 264)';
const COLOR_BG_WINDOW = 'oklch(25.5% 0.04 264)';
const COLOR_BORDER = 'oklch(36.5% 0.04 264)';
const COLOR_TEXT = 'oklch(93.5% 0.03 240)';
const COLOR_TEXT_SUB = 'oklch(80% 0.04 264)';
const COLOR_WHITE = 'oklch(100% 0 0)';
const COLOR_GREEN = 'oklch(77.5% 0.19 145)';
const COLOR_RED = 'oklch(62.5% 0.19 29)';
const COLOR_GREEN_BG = 'oklch(24% 0.13 145)';
const COLOR_RED_BG = 'oklch(24% 0.13 29)';

function App() {
    const [startupEnabled, setStartupEnabled] = useState(false);
    const [startupMinimized, setStartupMinimized] = useState(true);
    const prevMinimizedRef = React.useRef(true);
    const [loading, setLoading] = useState(true);
    const [currentWindow, setCurrentWindow] = useState(null);
    const [rpcStatus, setRpcStatus] = useState(null);
    const [rpcSharing, setRpcSharing] = useState(false);
    const [platform, setPlatform] = useState(window.distalker?.platform || 'unknown');
    
    // 설정 관련 상태
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        clientId: '',
        idleTimeout: 10, // 분 단위
        onlineImageKey: 'online',
        idleImageKey: 'idle',
        errorImageKey: 'error',
        warningImageKey: 'warning'
    });
    const [settingsLoading, setSettingsLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const enabled = await window.distalker.getStartupEnabled();
                const minimized = await window.distalker.getStartupMinimized();
                const windowInfo = await window.distalker.getCurrentWindow();
                const rpcInfo = await window.distalker.getRpcStatus();
                const userSettings = await window.distalker.getUserSettings();
                
                setStartupEnabled(!!enabled);
                setStartupMinimized(!!minimized);
                setCurrentWindow(windowInfo);
                setRpcStatus(rpcInfo);
                
                // 사용자 설정 로드
                if (userSettings) {
                    setSettings(prev => ({
                        ...prev,
                        ...userSettings
                    }));
                }
                
                setLoading(false);
            } catch (error) {
                console.error('초기화 오류:', error);
                setLoading(false);
            }
        })();

        // 창 정보 변경 리스너
        const handleWindowChange = (event, windowInfo) => {
            setCurrentWindow(windowInfo);
        };

        // RPC 상태 변경 리스너
        const handleRpcStatus = (event, status) => {
            setRpcStatus(status);
            setRpcSharing(status.connected && status.enabled);
        };

        // 설정 변경 리스너
        const handleSettingsChanged = (event, settings) => {
            (async () => {
                const enabled = await window.distalker.getStartupEnabled();
                const minimized = await window.distalker.getStartupMinimized();
                setStartupEnabled(!!enabled);
                setStartupMinimized(!!minimized);
                // rpcSharing은 오직 rpcStatus 이벤트에서만 갱신
            })();
        };

        window.distalker.onWindowChanged(handleWindowChange);
        window.distalker.onRpcStatus(handleRpcStatus);
        window.distalker.onSettingsChanged(handleSettingsChanged);

        return () => {
            // 클린업
        };
    }, []);

    async function toggleStartup() {
        if (loading) return;
        try {
            const next = !startupEnabled;
            const applied = await window.distalker.setStartupEnabled(next);
            setStartupEnabled(!!applied);
            if (!next) {
                // 상위 끌 때 하위도 끔, 이전 값 저장
                prevMinimizedRef.current = startupMinimized;
                const appliedMin = await window.distalker.setStartupMinimized(false);
                setStartupMinimized(!!appliedMin);
            } else {
                // 상위 켤 때 이전 하위 값 복원
                const appliedMin = await window.distalker.setStartupMinimized(prevMinimizedRef.current);
                setStartupMinimized(!!appliedMin);
            }
        } catch (error) {
            console.error('시작 프로그램 설정 오류:', error);
        }
    }

    async function toggleStartupMinimized() {
        if (loading) return;
        try {
            const next = !startupMinimized;
            const applied = await window.distalker.setStartupMinimized(next);
            setStartupMinimized(!!applied);
            // 하위 스위치 토글 시 이전 값도 갱신
            prevMinimizedRef.current = next;
        } catch (error) {
            console.error('최소화 설정 오류:', error);
        }
    }

    async function toggleRpcActivity() {
        if (loading) return;
        try {
            const result = await window.distalker.toggleRpcActivity();
            // RPC 상태를 다시 가져와서 UI 업데이트
            const rpcInfo = await window.distalker.getRpcStatus();
            setRpcStatus(rpcInfo);
            setRpcSharing(rpcInfo.connected && rpcInfo.enabled);
        } catch (error) {
            console.error('RPC 토글 오류:', error);
        }
    }

    async function saveSettings() {
        if (settingsLoading) return;
        setSettingsLoading(true);
        try {
            await window.distalker.saveUserSettings(settings);
            // 설정 저장 후 자리비움 타임아웃이 변경된 경우 StatusManager 설정도 업데이트
            if (settings.idleTimeout) {
                await window.distalker.updateStatusManagerSettings({
                    idleThresholdMs: settings.idleTimeout * 60 * 1000 // 분을 밀리초로 변환
                });
            }
            setShowSettings(false);
        } catch (error) {
            console.error('설정 저장 오류:', error);
        } finally {
            setSettingsLoading(false);
        }
    }

    function handleSettingChange(key, value) {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    }

    function ToggleSwitch({ checked, onChange, disabled }) {
        return (
            <div 
                style={{
                    position: 'relative',
                    width: 44,
                    height: 24,
                    backgroundColor: checked ? COLOR_PRIMARY : COLOR_BORDER,
                    borderRadius: 12,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginRight: 8,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    transform: 'scale(1)',
                    boxShadow: checked 
                        ? `0 0 0 4px ${COLOR_PRIMARY.replace(')', ' / 0.1)')}` 
                        : `0 0 0 0px ${COLOR_BORDER.replace(')', ' / 0.1)')}`,
                    border: `1px solid transparent`
                }}
                onClick={disabled ? undefined : onChange}
                onMouseDown={(e) => {
                    if (!disabled) {
                        e.currentTarget.style.transform = 'scale(0.95)';
                    }
                }}
                onMouseUp={(e) => {
                    if (!disabled) {
                        e.currentTarget.style.transform = 'scale(1)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!disabled) {
                        e.currentTarget.style.transform = 'scale(1)';
                    }
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    width: 18,
                    height: 18,
                    backgroundColor: COLOR_WHITE,
                    borderRadius: '50%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: checked 
                        ? `0 2px 8px ${COLOR_PRIMARY.replace(')', ' / 0.3)')}, 0 1px 3px ${COLOR_BG.replace(')', ' / 0.2)')}` 
                        : `0 2px 4px ${COLOR_BG.replace(')', ' / 0.2)')}`,
                    transform: checked ? 'translateX(20px) scale(1.05)' : 'translateX(0px) scale(1)',
                    border: `1px solid ${COLOR_WHITE.replace(')', ' / 0.2)')}`
                }} />
            </div>
        );
    }

    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function SettingsModal() {
        if (!showSettings) return null;

        // ESC 키로 모달 닫기, Enter 키로 저장
        React.useEffect(() => {
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    setShowSettings(false);
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    saveSettings();
                }
            };

            if (showSettings) {
                document.addEventListener('keydown', handleKeyDown);
                return () => document.removeEventListener('keydown', handleKeyDown);
            }
        }, [showSettings]);

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}>
                <div style={{
                    backgroundColor: COLOR_BG_CARD,
                    borderRadius: 16,
                    padding: 24,
                    width: 500,
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    border: `1px solid ${COLOR_BORDER}`
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 20,
                        boxSizing: 'border-box'
                    }}>
                        <h2 style={{ margin: 0, color: COLOR_PRIMARY }}>설정</h2>
                        <button
                            onClick={() => setShowSettings(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: COLOR_TEXT_SUB,
                                fontSize: 24,
                                cursor: 'pointer',
                                padding: 4,
                                borderRadius: 4
                            }}
                        >
                            ×
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Discord 클라이언트 ID */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: 8,
                                fontSize: 14,
                                fontWeight: 500,
                                color: COLOR_TEXT
                            }}>
                                Discord 클라이언트 ID
                            </label>
                            <input
                                type="text"
                                value={settings.clientId}
                                onChange={(e) => handleSettingChange('clientId', e.target.value)}
                                placeholder="Discord 애플리케이션 클라이언트 ID를 입력하세요"
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    backgroundColor: COLOR_BG_WINDOW,
                                    border: `1px solid ${COLOR_BORDER}`,
                                    borderRadius: 8,
                                    color: COLOR_TEXT,
                                    fontSize: 14
                                }}
                            />
                            <div style={{
                                fontSize: 12,
                                color: COLOR_TEXT_SUB,
                                marginTop: 4,
                                lineHeight: 1.4
                            }}>
                                Discord Developer Portal에서 생성한 애플리케이션의 클라이언트 ID입니다.
                                <br />
                                <a 
                                    href="https://discord.com/developers/applications" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ color: COLOR_PRIMARY, textDecoration: 'none' }}
                                >
                                    Discord Developer Portal 열기
                                </a>
                            </div>
                        </div>

                        {/* 자리비움 타임아웃 */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: 8,
                                fontSize: 14,
                                fontWeight: 500,
                                color: COLOR_TEXT
                            }}>
                                자리비움 타임아웃 (분)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="60"
                                value={settings.idleTimeout}
                                onChange={(e) => handleSettingChange('idleTimeout', parseInt(e.target.value) || 10)}
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    backgroundColor: COLOR_BG_WINDOW,
                                    border: `1px solid ${COLOR_BORDER}`,
                                    borderRadius: 8,
                                    color: COLOR_TEXT,
                                    fontSize: 14
                                }}
                            />
                            <div style={{
                                fontSize: 12,
                                color: COLOR_TEXT_SUB,
                                marginTop: 4
                            }}>
                                사용자가 비활성 상태로 간주되는 시간입니다. (1-60분)
                            </div>
                        </div>

                        {/* 이미지 키 설정 */}
                        <div>
                            <h3 style={{
                                margin: '0 0 12px 0',
                                fontSize: 16,
                                color: COLOR_PRIMARY
                            }}>
                                Discord 이미지 키 설정
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { key: 'onlineImageKey', label: '온라인 상태', placeholder: 'online' },
                                    { key: 'idleImageKey', label: '자리비움 상태', placeholder: 'idle' },
                                    { key: 'errorImageKey', label: '오류 상태', placeholder: 'error' },
                                    { key: 'warningImageKey', label: '경고 상태', placeholder: 'warning' }
                                ].map(({ key, label, placeholder }) => (
                                    <div key={key}>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: 4,
                                            fontSize: 13,
                                            color: COLOR_TEXT
                                        }}>
                                            {label}
                                        </label>
                                        <input
                                            type="text"
                                            value={settings[key]}
                                            onChange={(e) => handleSettingChange(key, e.target.value)}
                                            placeholder={placeholder}
                                            style={{
                                                width: '100%',
                                                padding: 8,
                                                backgroundColor: COLOR_BG_WINDOW,
                                                border: `1px solid ${COLOR_BORDER}`,
                                                borderRadius: 6,
                                                color: COLOR_TEXT,
                                                fontSize: 13
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div style={{
                                fontSize: 12,
                                color: COLOR_TEXT_SUB,
                                marginTop: 8,
                                lineHeight: 1.4
                            }}>
                                Discord 애플리케이션의 Rich Presence Assets에 등록된 이미지 키를 입력하세요.
                                <br />
                                <strong>팁:</strong> 이미지 키는 대소문자를 구분하며, Discord Developer Portal의 Rich Presence Assets 섹션에서 확인할 수 있습니다.
                            </div>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: 12,
                        marginTop: 24,
                        justifyContent: 'flex-end'
                    }}>
                        <button
                            onClick={() => setShowSettings(false)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'transparent',
                                border: `1px solid ${COLOR_BORDER}`,
                                borderRadius: 8,
                                color: COLOR_TEXT,
                                cursor: 'pointer',
                                fontSize: 14
                            }}
                        >
                            취소
                        </button>
                        <button
                            onClick={saveSettings}
                            disabled={settingsLoading}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: settingsLoading ? COLOR_BORDER : COLOR_PRIMARY,
                                border: 'none',
                                borderRadius: 8,
                                color: COLOR_WHITE,
                                cursor: settingsLoading ? 'not-allowed' : 'pointer',
                                fontSize: 14,
                                opacity: settingsLoading ? 0.6 : 1,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (!settingsLoading) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${COLOR_PRIMARY.replace(')', ' / 0.3)')}`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!settingsLoading) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }
                            }}
                        >
                            {settingsLoading ? '저장 중...' : '저장 (Ctrl+Enter)'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            background: COLOR_BG, 
            color: COLOR_TEXT,
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
            transition: 'background-color 0.3s ease'
        }}>
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `radial-gradient(60% 40% at 50% 110%,oklch(92% 0.05 250 / 0.47) 0%, oklch(92% 0.05 250 / 0.5), oklch(70% 0.05 250 / 0.1) 55%, ${COLOR_BG.replace(')', ' / 0.0)')} 75%)`,
                filter: rpcSharing ? 'blur(26px)' : 'blur(18px)',
                opacity: rpcSharing ? 1.2 : 1,
                transition: 'opacity 0.3s ease, filter 0.3s ease'
            }}></div>
            <div style={{ 
                width: 560, padding: 24, borderRadius: 16, 
                background: rpcSharing ? COLOR_BG_CARD_ACTIVE : COLOR_BG_CARD, 
                boxShadow: rpcSharing 
                    ? `0 10px 30px ${COLOR_BG.replace(')', ' / 0.5)')}` 
                    : `0 10px 30px ${COLOR_BG.replace(')', ' / 0.4)')}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h1 style={{ margin: 0, fontSize: 28 }}>Distalker</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={() => setShowSettings(true)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'transparent',
                                border: `1px solid ${COLOR_BORDER}`,
                                borderRadius: 8,
                                color: COLOR_TEXT,
                                cursor: 'pointer',
                                fontSize: 14,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = COLOR_WHITE.replace(')', ' / 0.05)');
                                e.currentTarget.style.borderColor = COLOR_PRIMARY;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = COLOR_BORDER;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <span>설정</span>
                        </button>
                        {rpcStatus && (
                        <div 
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                borderRadius: '20px',
                                background: rpcSharing 
                                    ? COLOR_GREEN.replace(')', ' / 0.15)') 
                                    : rpcStatus.connected 
                                        ? COLOR_RED.replace(')', ' / 0.15)') 
                                        : COLOR_BORDER.replace(')', ' / 0.15)'),
                                border: `1px solid ${rpcSharing 
                                    ? COLOR_GREEN.replace(')', ' / 0.3)') 
                                    : rpcStatus.connected 
                                        ? COLOR_RED.replace(')', ' / 0.3)') 
                                        : COLOR_BORDER.replace(')', ' / 0.3)')}`,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: rpcStatus.connected ? 'pointer' : 'default',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={rpcStatus.connected ? toggleRpcActivity : undefined}
                            onMouseEnter={(e) => {
                                if (rpcStatus.connected) {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.opacity = '0.9';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (rpcStatus.connected) {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.opacity = '1';
                                }
                            }}
                        >
                            <div style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: rpcSharing 
                                    ? COLOR_GREEN 
                                    : rpcStatus.connected 
                                        ? COLOR_RED 
                                        : COLOR_BORDER
                            }} />
                            <span style={{ color: rpcSharing ? COLOR_GREEN : rpcStatus.connected ? COLOR_RED : COLOR_TEXT_SUB }}>
                                {rpcSharing ? '활동 상태 공유 중' : rpcStatus.connected ? '활동 상태 공유 안 함' : 'Discord와 연결되지 않음'}
                            </span>
                        </div>
                        )}
                    </div>
                </div>
                <p style={{ opacity: 0.8 }}>
                    시스템 트레이에서 Distalker를 우클릭하거나 오른쪽 버튼을 눌러 활동 공유를 켜고 끌 수 있습니다.
                    Distalker의 중복 실행을 방지하기 위해 시스템 트레이에 Distalker가 존재하는 경우 좌클릭하여 실행하세요.
                </p>

                {/* 설정 상태 표시 */}
                {settings.clientId && (
                    <div style={{
                        marginTop: 16,
                        padding: 12,
                        background: COLOR_GREEN_BG,
                        borderRadius: 8,
                        border: `1px solid ${COLOR_GREEN}`,
                        fontSize: 12
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 4
                        }}>
                            <div style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: COLOR_GREEN
                            }} />
                            <span style={{ color: COLOR_GREEN, fontWeight: 500 }}>
                                설정 완료
                            </span>
                        </div>
                        <div style={{ color: COLOR_TEXT_SUB, lineHeight: 1.4 }}>
                            Discord 클라이언트 ID가 설정되었습니다. 자리비움 타임아웃: {settings.idleTimeout}분
                        </div>
                    </div>
                )}

                {/* 현재 감지된 창 정보 */}
                {currentWindow && (
                    <div style={{
                        marginTop: 20,
                        padding: 16,
                        background: COLOR_BG_WINDOW,
                        borderRadius: 12,
                        border: `1px solid ${COLOR_BORDER}`
                    }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: COLOR_PRIMARY }}>
                            현재 감지된 창
                        </h3>
                        <div style={{ fontSize: 14 }}>
                            <div style={{ marginBottom: 8 }}>
                                <strong>제목:</strong> {currentWindow.title}
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <strong>앱:</strong> {currentWindow.app}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>
                                <strong>감지 시간:</strong> {formatTime(currentWindow.timestamp)}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        padding: '8px 0',
                        borderRadius: '8px',
                        transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        if (!loading) {
                            e.currentTarget.style.backgroundColor = COLOR_WHITE.replace(')', ' / 0.05)');
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!loading) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }
                    }}>
                        <ToggleSwitch checked={startupEnabled} onChange={toggleStartup} disabled={loading} />
                        <span style={{ opacity: 0.8, userSelect: 'none' }}>
                            {platform === 'win32' ? 'Windows와 함께 Distalker 시작' : platform === 'linux' ? 'Linux와 함께 Distalker 시작' : 'Distalker 자동 시작'}
                        </span>
                    </div>

                    {startupEnabled && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            marginLeft: 20,
                            padding: '8px 0',
                            borderRadius: '8px',
                            transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.backgroundColor = 'oklch(100% 0 0 / 0.05)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}>
                            <ToggleSwitch checked={startupMinimized} onChange={toggleStartupMinimized} disabled={loading} />
                            <span style={{ opacity: 0.8, userSelect: 'none' }}>
                                {platform === 'win32' ? '트레이에 최소화한 상태로 시작' : platform === 'linux' ? '백그라운드로 최소화하여 시작' : '최소화하여 시작'}
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 24, fontSize: 12, opacity: 0.7 }}>
                    ❓ 활동이 제대로 표시되지 않는다면 Discord 클라이언트가 켜져 있고, 활동 설정이 올바른지 확인하세요.
                </div>

                {/* RPC 상태 표시 */}
                {rpcStatus && (
                    <div style={{
                        marginTop: 16,
                        padding: 12,
                        background: rpcStatus.connected ? COLOR_GREEN_BG : COLOR_RED_BG,
                        borderRadius: 8,
                        border: `1px solid ${rpcStatus.connected ? COLOR_GREEN : COLOR_RED}`
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12
                        }}>
                            <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: rpcStatus.connected ? COLOR_GREEN : COLOR_RED
                            }} />
                            <span>
                                {rpcStatus.connected ? 'Discord와 연결되었습니다.' : 'Discord와 연결되지 않았습니다. Discord가 켜져 있고, 활동 설정이 올바른지 확인하세요.'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
            <SettingsModal />
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);


