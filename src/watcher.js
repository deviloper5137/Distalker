import activeWin from 'active-win';
import { createLogger } from './logger.js';

const logger = createLogger('activeWindowWatcher');

export function startActiveWindowWatcher({ onWindowChange, intervalMs = 1500 }) {
    let lastTitle = null;
    let lastOwnerPath = null;
    let cantLoad = false;
    let timer = null;
    let info;

    async function poll() {
        try {
            info = await activeWin();
            const title = info?.title || null;
            const ownerPath = info?.owner?.path || null;

            if (title !== lastTitle || ownerPath !== lastOwnerPath) {
                lastTitle = title;
                lastOwnerPath = ownerPath;
                onWindowChange?.(info);
            }
            if (cantLoad) cantLoad = false, logger.info?.(`이제부터 활동 상태를 확인할 수 있습니다.`);
        } catch (e) {
            if (!cantLoad) {
                info = { error: true, message: '활동을 불러오는 중 문제가 발생함.', timestamp: new Date().toISOString() };
                cantLoad = true;
                logger.warn?.(`활동 상태를 확인할 수 없습니다: ${e?.message || e}`);
                onWindowChange?.(info);
            }
        }
    }

    timer = setInterval(poll, intervalMs);
    poll();

    return () => clearInterval(timer);
}


