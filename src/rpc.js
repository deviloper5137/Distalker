import RPC from 'discord-rpc';
import { createLogger } from './logger.js';

const logger = createLogger('rpcManager');

export async function createRpcClient(clientId, notifyCallback = null) {
    let rpc = new RPC.Client({ transport: 'ipc' });
    let isConnected = false;
    let reconnectAttempts = 0;
    let isReconnecting = false;

    let reconnectInterval = 10000; // 10초부터 시작
    const maxInterval = 30000; // 최대 30초

    function connect() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Discord RPC 연결 타임아웃에 도달했습니다.'));
            }, 10000);

            rpc.once('ready', () => {
                clearTimeout(timeout);
                isConnected = true;
                reconnectAttempts = 0;

                logger.info('Discord RPC에 연결되었습니다.');
                resolve(rpc);
            });

            rpc.login({ clientId }).catch((err) => {
                clearTimeout(timeout);
                isConnected = false;
                logger.warn(`Discord RPC에 연결할 수 없습니다: ${err?.message || err}`);
                reject(err);
            });
        });
    }

    function reconnect() {
        if (isReconnecting) {
            return; // 이미 재연결 중이면 중복 실행 방지
        }
        
        isReconnecting = true;
        reconnectAttempts++;
        logger.warn(`Discord RPC에 ${reconnectInterval/1000}초 후 재연결을 시도합니다... (시도 횟수: ${reconnectAttempts})`);
        
        // 기존 RPC 인스턴스 정리
        try {
            if (rpc && typeof rpc?.destroy === 'function') {
                rpc.destroy();
            }
        } catch (e) {
            logger.warn(`기존 RPC 인스턴스를 정리할 수 없습니다: ${e?.message || e}`);
        }

        // 새로운 RPC 인스턴스 생성
        rpc = new RPC.Client({ transport: 'ipc' });

        // 새로운 인스턴스에 이벤트 리스너 재등록
        rpc.on('disconnected', () => {
            isConnected = false;
            logger.warn('Discord RPC와 연결이 끊어졌습니다. 재연결을 시도합니다...');
            if (notifyCallback) {
                notifyCallback('❗ Discord와 연결 끊김', 'Discord와 연결이 끊어졌습니다. 재연결을 시도합니다...');
            }
            reconnect();
        });

        setTimeout(() => {
            connect().then(() => {
                // 연결 성공 시 재연결 간격 초기화
                reconnectInterval = 10000;
                reconnectAttempts = 0;
                isReconnecting = false;
                if (notifyCallback) {
                    notifyCallback('✅ Discord와 연결됨', 'Discord와 다시 연결되었습니다.');
                }
            }).catch((e) => {
                logger.warn(`Discord RPC 재연결에 실패했습니다: ${e?.message || e}`);
                // 재연결 간격을 점진적으로 증가 (최대 30초)
                reconnectInterval = Math.min(reconnectInterval + 10000, maxInterval);
                isReconnecting = false;
                // 재귀 호출 대신 다시 setTimeout으로 재연결 시도
                reconnect();
            });
        }, reconnectInterval);
    }

    rpc.on('disconnected', () => {
        isConnected = false;
        logger.warn('Discord RPC와 연결이 끊어졌습니다. 재연결을 시도합니다...');
        if (notifyCallback) {
            notifyCallback('❗ Discord와 연결 끊김', 'Discord와 연결이 끊어졌습니다. 재연결을 시도합니다...');
        }
        // 연결 끊김 즉시 메인 프로세스에 상태 브로드캐스트
        if (global.mainWindow) {
            try {
                global.mainWindow.webContents.send('rpc-status', {
                    connected: false,
                    enabled: global.rpcEnabled ?? false,
                    timestamp: new Date().toISOString()
                });
            } catch (e) {
                // 무시
            }
        }
        reconnect();
    });

    try {
        await connect();
    } catch (e) {
        logger.error(`첫 Discord RPC 연결에 실패했습니다: ${e?.message || e}`);
        // 첫 연결 실패 시에도 재시도 로직 적용
        reconnect();
    }

    return {
        setActivity: async (activity) => {
            if (!isConnected || !rpc) {
                logger.warn('Discord RPC가 연결되지 않았습니다. Activity 설정을 건너뜁니다...');
                return;
            }
            try {
                if (activity === null) {
                    await rpc.setActivity({});
                } else {
                    await rpc.setActivity(activity);
                }
            } catch (e) {
                logger.warn(`활동 상태 설정에 실패했습니다: ${e?.message || e}`);
                // 연결이 끊어진 경우 재연결 시도 (비동기로 처리하여 블로킹 방지)
                if (!isConnected) {
                    reconnect();
                }
            }
        },
        destroy: () => {
            isConnected = false;
            rpc.destroy();
        },
        isConnected: () => isConnected
    };
}

