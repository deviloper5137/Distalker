import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
    const [startupEnabled, setStartupEnabled] = useState(false);
    const [startupMinimized, setStartupMinimized] = useState(true);
    const prevMinimizedRef = React.useRef(true);
    const [loading, setLoading] = useState(true);
    const [currentWindow, setCurrentWindow] = useState(null);
    const [rpcStatus, setRpcStatus] = useState(null);
    const [rpcSharing, setRpcSharing] = useState(false);
    const [platform, setPlatform] = useState(window.distalker?.platform || 'unknown');

    useEffect(() => {
        (async () => {
            try {
                const enabled = await window.distalker.getStartupEnabled();
                const minimized = await window.distalker.getStartupMinimized();
                const windowInfo = await window.distalker.getCurrentWindow();
                const rpcInfo = await window.distalker.getRpcStatus();
                
                setStartupEnabled(!!enabled);
                setStartupMinimized(!!minimized);
                setCurrentWindow(windowInfo);
                setRpcStatus(rpcInfo);
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

    function ToggleSwitch({ checked, onChange, disabled }) {
        return (
            <div 
                style={{
                    position: 'relative',
                    width: 44,
                    height: 24,
                    backgroundColor: checked ? 'oklch(78.5% 0.19 255)' : 'oklch(36.5% 0.04 264)',
                    borderRadius: 12,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginRight: 8,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    transform: 'scale(1)',
                    boxShadow: checked 
                        ? '0 0 0 4px oklch(78.5% 0.19 255 / 0.1)' 
                        : '0 0 0 0px oklch(36.5% 0.04 264 / 0.1)',
                    border: '1px solid transparent'
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
                    backgroundColor: 'oklch(100% 0 0)',
                    borderRadius: '50%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: checked 
                        ? '0 2px 8px oklch(78.5% 0.19 255 / 0.3), 0 1px 3px oklch(0% 0 0 / 0.2)' 
                        : '0 2px 4px oklch(0% 0 0 / 0.2)',
                    transform: checked ? 'translateX(20px) scale(1.05)' : 'translateX(0px) scale(1)',
                    border: '1px solid oklch(100% 0 0 / 0.2)'
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

    return (
        <div style={{
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            background: rpcSharing ? 'oklch(0% 0 0)' : 'oklch(0% 0 0)', 
            color: 'oklch(93.5% 0.03 240)',
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
            transition: 'background-color 0.3s ease'
        }}>
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(60% 40% at 50% 110%,oklch(92% 0.05 250 / 0.47) 0%, oklch(92% 0.05 250 / 0.5), oklch(70% 0.05 250 / 0.1) 55%, oklch(0% 0 0 / 0.0) 75%)',
                filter: rpcSharing ? 'blur(26px)' : 'blur(18px)',
                opacity: rpcSharing ? 1.2 : 1,
                transition: 'opacity 0.3s ease, filter 0.3s ease'
            }}></div>
            <div style={{ 
                width: 560, padding: 24, borderRadius: 16, 
                background: rpcSharing ? 'oklch(16.5% 0.04 264)' : 'oklch(14.5% 0.04 264)', 
                boxShadow: rpcSharing 
                    ? '0 10px 30px oklch(0% 0 0 / 0.5)' 
                    : '0 10px 30px oklch(0% 0 0 / 0.4)',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h1 style={{ margin: 0, fontSize: 28 }}>Distalker</h1>
                    {rpcStatus && (
                        <div 
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                borderRadius: '20px',
                                background: rpcSharing 
                                    ? 'oklch(77.5% 0.19 145 / 0.15)' 
                                    : rpcStatus.connected 
                                        ? 'oklch(62.5% 0.19 29 / 0.15)' 
                                        : 'oklch(56.5% 0.04 264 / 0.15)',
                                border: `1px solid ${rpcSharing 
                                    ? 'oklch(77.5% 0.19 145 / 0.3)' 
                                    : rpcStatus.connected 
                                        ? 'oklch(62.5% 0.19 29 / 0.3)' 
                                        : 'oklch(56.5% 0.04 264 / 0.3)'}`,
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
                                    ? 'oklch(77.5% 0.19 145)' 
                                    : rpcStatus.connected 
                                        ? 'oklch(62.5% 0.19 29)' 
                                        : 'oklch(56.5% 0.04 264)'
                            }} />
                            <span style={{ color: rpcSharing ? 'oklch(77.5% 0.19 145)' : rpcStatus.connected ? 'oklch(62.5% 0.19 29)' : 'oklch(80% 0.04 264)' }}>
                                {rpcSharing ? '활동 상태 공유 중' : rpcStatus.connected ? '활동 상태 공유 안 함' : 'Discord와 연결되지 않음'}
                            </span>
                        </div>
                    )}
                </div>
                <p style={{ opacity: 0.8 }}>
                    시스템 트레이에서 Distalker를 우클릭하거나 오른쪽 버튼을 눌러 활동 공유를 켜고 끌 수 있습니다.
                    Distalker의 중복 실행을 방지하기 위해 시스템 트레이에 Distalker가 존재하는 경우 좌클릭하여 실행하세요.
                </p>

                {/* 현재 감지된 창 정보 */}
                {currentWindow && (
                    <div style={{
                        marginTop: 20,
                        padding: 16,
                        background: 'oklch(25.5% 0.04 264)',
                        borderRadius: 12,
                        border: '1px solid oklch(36.5% 0.04 264)'
                    }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: 'oklch(78.5% 0.19 255)' }}>
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
                            e.currentTarget.style.backgroundColor = 'oklch(100% 0 0 / 0.05)';
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
                        background: rpcStatus.connected ? 'oklch(24% 0.13 145)' : 'oklch(24% 0.13 29)',
                        borderRadius: 8,
                        border: `1px solid ${rpcStatus.connected ? 'oklch(77.5% 0.19 145)' : 'oklch(62.5% 0.19 29)'}`
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
                                backgroundColor: rpcStatus.connected ? 'oklch(77.5% 0.19 145)' : 'oklch(62.5% 0.19 29)'
                            }} />
                            <span>
                                {rpcStatus.connected ? 'Discord와 연결되었습니다.' : 'Discord와 연결되지 않았습니다. Discord가 켜져 있고, 활동 설정이 올바른지 확인하세요.'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);


