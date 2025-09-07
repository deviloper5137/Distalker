import 'dotenv/config';
import { createRpcClient } from './rpc.js';
import { createLogger, loggerConfig } from './logger.js';
import { startActiveWindowWatcher } from './watcher.js';

// CLI 모드에서는 개발 설정 적용 (패키징되지 않은 상태)
loggerConfig.setMaxLogFiles(10);
loggerConfig.setFileLogLevel('DEBUG');
loggerConfig.setLogRotation(true);
loggerConfig.setDefaultLevel('DEBUG');
loggerConfig.setConsoleLogging(true);
loggerConfig.setFileLogging(true);
loggerConfig.setMaxLogLines(1000); // CLI 모드: 파일당 1000줄

// CLI 모드 로거 - 명령줄에서 직접 실행될 때의 로깅 담당 (환경변수 검증, RPC 연결, 윈도우 감시 등)
const logger = createLogger('CLIMode');

async function main() {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
        logger.error('DISCORD_CLIENT_ID 환경 변수가 설정되어 있지 않습니다. 프로그램을 종료합니다...');
        process.exit(1); 
    }

    const rpc = await createRpcClient(clientId, logger, null);
    startActiveWindowWatcher({
        onWindowChange: async (info) => {
            const { title, owner } = info;
            const details = title || 'Untitled';
            const state = owner?.name ? `by ${owner.name}` : undefined;
            try {
                await rpc.setActivity({
                    details,
                    state,
                    largeImageKey: 'app',
                    largeImageText: 'Distalker',
                    instance: false,
                    startTimestamp: Date.now(),
                });
                logger.info(`활동 상태 업데이트: ${details}`);
            } catch (err) {
                logger.warn(`활동 상태 업데이트 실패: ${(err && err.message) || err}`);
            }
        },
        logger,
    });
}

main().catch((err) => {
    logger.error(`알 수 없는 오류가 발생했습니다: ${(err && err.stack) || err}`);
    process.exit(1);
});


