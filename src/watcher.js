import activeWin from 'active-win';

export function startActiveWindowWatcher({ onWindowChange, intervalMs = 1500, logger }) {
    let lastTitle = null;
    let timer = null;

    async function poll() {
        try {
            const info = await activeWin();
            const title = info?.title || null;
            if (title && title !== lastTitle) {
                lastTitle = title;
                onWindowChange?.(info);
            }
        } catch (e) {
            logger?.warn?.(`활성 창 조회에 실패했습니다: ${e?.message || e}`);
        }
    }

    timer = setInterval(poll, intervalMs);
    poll();

    return () => clearInterval(timer);
}


