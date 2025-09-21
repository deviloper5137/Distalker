import 'dotenv/config';
import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, Notification } from 'electron';
import pkg from 'electron-updater'; const { autoUpdater } = pkg;
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { createRpcClient } from './rpc.js';
import { startActiveWindowWatcher } from './watcher.js';
import { createLogger, loggerConfig } from './logger.js';
import { createStatusManager } from './statusManager.js';

// __dirname, __filename 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프로젝트 루트 폴더 설정 (빌드: resourcesPath, 개발: 프로젝트 루트)
const rootFolder = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
const logFolder = app.isPackaged ? path.join(app.getPath('userData'), 'logs') : path.resolve(__dirname, '..', 'logs');
console.log(logFolder);

// 빌드 환경에 따른 로그 설정 객체 생성 및 적용
if (app.isPackaged) {
    loggerConfig.setConfig({
        logFolder,
        maxLogFiles: 5,
        fileLogLevel: 'WARN',
        enableLogRotation: true,
        defaultLevel: 'INFO',
        enableConsoleLogging: true,
        enableFileLogging: true,
        maxLogLines: 500
    });
} else {
    loggerConfig.setConfig({
        logFolder,
        maxLogFiles: 10,
        fileLogLevel: 'DEBUG',
        enableLogRotation: true,
        defaultLevel: 'DEBUG',
        enableConsoleLogging: true,
        enableFileLogging: true,
        maxLogLines: 1000
    });
}

// 로거 초기화 및 설정
const logger = createLogger('MainProcess');
let mainWindow = null;
let rpcClient = null;
let tray = null;
let minimizeToTray = true;
let currentWindowInfo = null;
let startupMinimized = true; // 시작 시 트레이로 최소화 설정
let rpcEnabled = true; // RPC 활동 상태 공유 활성화 상태
let statusManager = null; // 사용자 상태 관리자
let currentActivityStartTime = null; // 현재 활동의 시작 시간 (앱 변경 시에만 업데이트)
let userSettings = {
    clientId: '',
    idleTimeout: 10, // 분 단위
    onlineImageKey: 'online',
    idleImageKey: 'idle',
    errorImageKey: 'error',
    warningImageKey: 'warning'
};

const defaultActivity = {
    largeImageKey: 'app',
    largeImageText: 'Distalker',
    instance: true
};

// getUserIdleStatus 함수는 이제 StatusManager에서 처리됨

/**
 * StatusManager 초기화 및 설정
 */
function initializeStatusManager() {
    if (statusManager) {
        logger.debug('StatusManager가 이미 초기화되었습니다.');
        return statusManager;
    }

    statusManager = createStatusManager({
        // 사용자 설정의 자리비움 타임아웃 사용 (분을 밀리초로 변환)
        idleThresholdMs: (userSettings.idleTimeout || 10) * 60 * 1000,
        checkIntervalMs: 1500,
        logger: logger,
        onStatusChange: async (statusData) => {
            // 상태 변경 시 RPC 업데이트 (startTimestamp는 유지)
            if (rpcClient && rpcEnabled && rpcClient.isConnected()) {
                try {
                    const imageKey = statusManager.getStatusImageKey(statusData.status);
                    const statusText = statusManager.getStatusText(statusData.status);
                    
                    if (currentWindowInfo) {
                        const details = currentWindowInfo.title || 'Untitled';
                        const state = currentWindowInfo.app ? `by ${currentWindowInfo.app}` : undefined;
                        
                        const activityData = {
                            details,
                            state,
                            smallImageKey: imageKey,
                            smallImageText: statusText,
                            ...defaultActivity
                        };
                        
                        // startTimestamp는 기존 값을 유지 (앱 변경 시에만 새로 설정)
                        if (currentActivityStartTime) {
                            activityData.startTimestamp = currentActivityStartTime;
                        }
                        
                        await rpcClient.setActivity(activityData);
                        
                        logger.info(`사용자 상태 변경으로 인한 RPC 업데이트: ${statusText} (${imageKey}) - 타임스탬프 유지`);
                    }
                } catch (error) {
                    logger.warn(`상태 변경 시 RPC 업데이트 실패: ${error.message}`);
                }
            }

            // 렌더러에 상태 변경 알림
            if (mainWindow) {
                mainWindow.webContents.send('user-status-changed', statusData);
            }
        }
    });

    logger.info('StatusManager 초기화 완료');
    return statusManager;
}

/**
 * RPC 활동 상태를 사용자 상태와 함께 업데이트
 * @param {Object} activityData - RPC 활동 데이터
 * @param {boolean} useUserStatus - 사용자 상태를 포함할지 여부
 * @param {boolean} updateTimestamp - startTimestamp를 새로 설정할지 여부 (앱 변경 시에만 true)
 */
async function updateRpcActivityWithUserStatus(activityData, useUserStatus = true, updateTimestamp = false) {
    if (!rpcClient || !rpcEnabled || !rpcClient.isConnected()) {
        return;
    }

    try {
        const finalActivity = { ...activityData };
        
        if (useUserStatus && statusManager) {
            const userStatus = statusManager.getCurrentStatus();
            const imageKey = statusManager.getStatusImageKey(userStatus);
            const statusText = statusManager.getStatusText(userStatus);
            
            finalActivity.smallImageKey = imageKey;
            finalActivity.smallImageText = statusText;
        }
        
        // startTimestamp 처리
        if (updateTimestamp) {
            // 앱 변경 시: 새로운 타임스탬프 설정
            currentActivityStartTime = Date.now();
            finalActivity.startTimestamp = currentActivityStartTime;
            logger.debug('새로운 활동 시작 시간 설정');
        } else if (currentActivityStartTime) {
            // 사용자 상태 변경 시: 기존 타임스탬프 유지
            finalActivity.startTimestamp = currentActivityStartTime;
        }
        
        await rpcClient.setActivity(finalActivity);
        
        if (useUserStatus && statusManager) {
            const userStatus = statusManager.getCurrentStatus();
            const timestampAction = updateTimestamp ? '새로 설정' : '유지';
            logger.info(`RPC 활동 업데이트 (사용자 상태: ${userStatus}, 타임스탬프: ${timestampAction}): ${finalActivity.details || '알 수 없음'}`);
        } else {
            const timestampAction = updateTimestamp ? '새로 설정' : '유지';
            logger.info(`RPC 활동 업데이트 (타임스탬프: ${timestampAction}): ${finalActivity.details || '알 수 없음'}`);
        }
    } catch (error) {
        logger.warn(`RPC 활동 업데이트 실패: ${error.message}`);
    }
}

async function notify(title, body) {
    try {
        const iconPath = path.join(rootFolder, 'assets', 'icons', 'png', '256.png');
        new Notification({ 
            icon: iconPath,
            title, 
            body, 
            silent: false
        }).show();
    } catch (error) {
        logger.warn(`알림 전송에 실패했습니다: ${error?.message || error}`);
    }
}

function resolveRendererUrl() {
    const port = process.env.VITE_DEV_SERVER_PORT || 5173;
    return `http://localhost:${port}`;
}

async function waitForUrl(url, { timeoutMs = 15000, intervalMs = 300 } = {}) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
        try {
            const res = await fetch(url, { method: 'GET' });
            if (res.ok) return true;
        } catch (error) {
            // 무시하고 재시도
        }
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
}

function getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
}

function getUserSettingsPath() {
    return path.join(app.getPath('userData'), 'user-settings.json');
}

autoUpdater.on('checking-for-update', () => {
    logger.info('업데이트를 확인하는 중...');
});

autoUpdater.on('update-available', (info) => {
    logger.info('다운로드 가능한 업데이트가 있습니다.');
});

autoUpdater.on('update-not-available', (info) => {
    logger.info('현재 최신 버전을 사용 중입니다.');
});

autoUpdater.on('error', (err) => {
    logger.warn(`업데이트 중 오류가 발생했습니다: ${err?.message || err}`);
});

autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = `다운로드 속도: ${Math.round(progressObj.bytesPerSecond / 1024)} KB/s - `;
    logMessage += `진행률: ${progressObj.percent.toFixed(2)}% `;
    logMessage += `(${progressObj.transferred}/${progressObj.total})`;
    logger.info(logMessage);
});

autoUpdater.on('update-downloaded', (info) => {
    logger.info('업데이트가 다운로드되었습니다. 앱을 재시작하여 설치할 수 있습니다.');
    notify('🔔 업데이트 다운로드 완료', '앱을 재시작하여 최신 버전을 설치할 수 있습니다.');
});

function loadSettings() {
    try {
        const settingsPath = getSettingsPath();
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            const settings = JSON.parse(data);
            startupMinimized = settings.startupMinimized ?? true;
            rpcEnabled = settings.rpcEnabled ?? true;
            logger.debug(`설정을 불러왔습니다: { startupMinimized=${startupMinimized}, rpcEnabled=${rpcEnabled} }`);
        }
    } catch (error) {
        logger.warn(`설정을 불러오는 중 오류가 발생했습니다: ${error.message}`);
        startupMinimized = false; // 기본값
        rpcEnabled = true; // 기본값
    }
}

function loadUserSettings() {
    try {
        const userSettingsPath = getUserSettingsPath();
        if (fs.existsSync(userSettingsPath)) {
            const data = fs.readFileSync(userSettingsPath, 'utf8');
            const settings = JSON.parse(data);
            userSettings = { ...userSettings, ...settings };
            // 전역에서 접근 가능하도록 설정
            global.userSettings = userSettings;
            logger.debug(`사용자 설정을 불러왔습니다: ${JSON.stringify(userSettings)}`);
        }
    } catch (error) {
        logger.warn(`사용자 설정을 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
}

function saveUserSettings() {
    try {
        const userSettingsPath = getUserSettingsPath();
        fs.writeFileSync(userSettingsPath, JSON.stringify(userSettings, null, 2));
        logger.debug(`사용자 설정을 저장했습니다: ${JSON.stringify(userSettings)}`);
    } catch (error) {
        logger.warn(`사용자 설정을 저장하는 중 오류가 발생했습니다: ${error.message}`);
    }
}

function saveSettings() {
    try {
        const settingsPath = getSettingsPath();
        const settings = { startupMinimized, rpcEnabled };
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        logger.debug(`설정을 저장했습니다: { startupMinimized=${startupMinimized}, rpcEnabled=${rpcEnabled} }`);
    } catch (error) {
        logger.warn(`설정을 저장하는 중 오류가 발생했습니다: ${error.message}`);
    }
}

async function toggleRpcActivity() {
    if (!rpcClient) return;

    try {
        if (rpcEnabled) {
            await updateRpcActivityWithUserStatus({
                details: "활동 상태 공유가 중단되었습니다.",
                state: "사용자가 자신의 활동을 공유하지 않도록 설정했습니다.",
                smallImageKey: userSettings.warningImageKey || 'warning',
                ...defaultActivity
            }, false, false); // 사용자 상태 사용하지 않음, 타임스탬프 유지

            rpcEnabled = false;

            logger.info('사용자가 활동 상태 공유를 중단했습니다.');
            notify('🔔 활동 상태 공유 중단', '활동 상태 공유를 비활성화했습니다.');
        } else {
            // RPC 활동 재개
            if (currentWindowInfo) {
                const details = currentWindowInfo.title || 'Untitled';
                const state = currentWindowInfo.app ? `by ${currentWindowInfo.app}` : undefined;
                
            await updateRpcActivityWithUserStatus({
                details,
                state,
                ...defaultActivity
            }, true, true); // 사용자 상태 사용, 타임스탬프 새로 설정

            logger.info(`사용자가 활동 상태 공유를 재개했습니다.`);
                notify('🔔 활동 상태 공유 재개', '활동 상태 공유를 활성화했습니다.');
            }

            rpcEnabled = true;
        }

        saveSettings();
        updateTrayMenu();
        
        // 렌더러에 설정 변경 알림
        if (mainWindow) {
            mainWindow.webContents.send('settings-changed', {
                startupEnabled: app.getLoginItemSettings().openAtLogin ?? false,
                startupMinimized: startupMinimized,
                rpcEnabled: rpcEnabled
            });

            // RPC 상태 동기화
            mainWindow.webContents.send('rpc-status', {
                connected: rpcClient ? rpcClient.isConnected() : false,
                enabled: rpcEnabled,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.warn(`활동 상태 변경 실패: ${error.message}`);
        notify('❗ 활동 상태 변경 실패', '무언가 잘못되었습니다.');
    }
}

function pickTrayIcon() {
    const candidate = path.join(rootFolder, 'assets', 'icons', 'png', '48.png');
    if (fs.existsSync(candidate)) {
        return nativeImage.createFromPath(candidate);
    }
    return nativeImage.createEmpty();
}

function updateTrayMenu() {
    if (!tray) return;
    
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Distalker', enabled: false },
        { type: 'separator' },
        { label: '열기', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
        { 
            label: rpcEnabled ? '활동 상태 공유 중단' : '활동 상태 공유 재개',
            click: toggleRpcActivity,
            enabled: !!rpcClient
        },
        { type: 'separator' },
        { label: '로그 폴더 열기', click: () => { 
            const logPath = app.isPackaged ? path.join(app.getPath('userData'), 'logs') : './logs'
            shell.openPath(logPath).catch(err => {
                logger.warn(`로그 폴더 열기 실패: ${err.message}`);
                // 폴더가 없으면 생성 후 다시 시도
                fs.mkdirSync(logPath, { recursive: true });
                shell.openPath(logPath).catch(err2 => {
                    logger.error(`로그 폴더 생성 후 열기 실패: ${err2.message}`);
                });
            });
        }},
        { type: 'separator' },
        { label: '종료', click: () => { minimizeToTray = false; app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);
}

function createTray() {
    if (tray) return tray;
    const icon = pickTrayIcon();
    const fallbackPath = path.join(process.resourcesPath, 'assets', 'icons', 'png', '48.png');
    // nativeImage has .isEmpty() method
    tray = new Tray(icon.isEmpty && icon.isEmpty() ? fallbackPath : icon);
    tray.setToolTip('Distalker');
    updateTrayMenu();
    tray.on('click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
    return tray;
}

async function createWindow() {
    const iconPath = path.join(rootFolder, 'assets', 'icons', 'win', 'app.ico');

    mainWindow = new BrowserWindow({
        width: 1600,
        height: 800,
        icon: iconPath,
        resizable: true,
        show: false,

        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: true,
        }
    });

    Menu.setApplicationMenu(null); // 메뉴 바 제거

    // Tray 준비
    createTray();

    const prodHtmlPath = path.join(__dirname, 'renderer', 'dist-renderer', 'index.html');
    const devUrl = resolveRendererUrl();
    const allowDev = process.env.ALLOW_DEV_SERVER === 'true';

    if (app.isPackaged) {
        await mainWindow.loadFile(prodHtmlPath);
    } else if (allowDev) {
        const ok = await waitForUrl(devUrl, { timeoutMs: 20000, intervalMs: 300 });
        if (ok) {
            await mainWindow.loadURL(devUrl);
        } else {
            await mainWindow.loadFile(prodHtmlPath);
        }
    } else {
        await mainWindow.loadFile(prodHtmlPath);
    }

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('close', (e) => {
        if (minimizeToTray) {
            e.preventDefault();
            mainWindow.hide();
        }
    });
}

function setupIpc() {
    ipcMain.handle('app:get-startup-enabled', () => {
        if (process.platform === 'win32' || process.platform === 'darwin') {
            const settings = app.getLoginItemSettings();
            return settings.openAtLogin ?? false;
        } else if (process.platform === 'linux') {
            // Linux: autostart .desktop 파일 존재 여부로 판단
            try {
                const autostartPath = path.join(os.homedir(), '.config', 'autostart', 'distalker.desktop');
                return fs.existsSync(autostartPath);
            } catch (_) {
                return false;
            }
        }
        return false;
    });

    ipcMain.handle('app:set-startup-enabled', (evt, enabled) => {
        if (process.platform === 'win32' || process.platform === 'darwin') {
            app.setLoginItemSettings({
                openAtLogin: !!enabled,
                path: process.execPath
            });
            const settings = app.getLoginItemSettings();
            const applied = settings.openAtLogin ?? false;
            if (mainWindow) {
                mainWindow.webContents.send('settings-changed', {
                    startupEnabled: applied,
                    startupMinimized: startupMinimized,
                    rpcEnabled: rpcEnabled
                });
            }
            return applied;
        } else if (process.platform === 'linux') {
            // Linux: autostart .desktop 파일 생성/삭제
            try {
                const autostartDir = path.join(os.homedir(), '.config', 'autostart');
                const desktopPath = path.join(autostartDir, 'distalker.desktop');
                if (!fs.existsSync(autostartDir)) {
                    fs.mkdirSync(autostartDir, { recursive: true });
                }
                if (enabled) {
                    // .desktop 파일 생성
                    const execPath = process.execPath;
                    const iconPath = path.join(rootFolder, 'main.png');
                    const desktopContent = `[Desktop Entry]\nType=Application\nName=Distalker\nExec=${execPath}\nIcon=${iconPath}\nX-GNOME-Autostart-enabled=true\nComment=Start Distalker at login\n`;
                    fs.writeFileSync(desktopPath, desktopContent);
                } else {
                    // .desktop 파일 삭제
                    if (fs.existsSync(desktopPath)) {
                        fs.unlinkSync(desktopPath);
                    }
                }
                if (mainWindow) {
                    mainWindow.webContents.send('settings-changed', {
                        startupEnabled: enabled,
                        startupMinimized: startupMinimized,
                        rpcEnabled: rpcEnabled
                    });
                }
                return enabled;
            } catch (e) {
                if (mainWindow) {
                    mainWindow.webContents.send('settings-changed', {
                        startupEnabled: false,
                        startupMinimized: startupMinimized,
                        rpcEnabled: rpcEnabled
                    });
                }
                return false;
            }
        }
        return false;
    });

    ipcMain.handle('app:get-startup-minimized', () => {
        return startupMinimized;
    });

    ipcMain.handle('app:set-startup-minimized', (evt, minimized) => {
        startupMinimized = !!minimized;
        saveSettings();
        
        // 렌더러에 설정 변경 알림
        if (mainWindow) {
            mainWindow.webContents.send('settings-changed', {
                startupEnabled: app.getLoginItemSettings().openAtLogin ?? false,
                startupMinimized: startupMinimized,
                rpcEnabled: rpcEnabled
            });
        }
        
        return startupMinimized;
    });

    ipcMain.handle('app:get-current-window', () => {
        return currentWindowInfo;
    });

    ipcMain.handle('app:get-rpc-status', () => {
        return rpcClient ? { connected: rpcClient.isConnected(), enabled: rpcEnabled } : { connected: false, enabled: false };
    });

    ipcMain.handle('app:toggle-rpc-activity', async () => {
        await toggleRpcActivity();
        return { enabled: rpcEnabled };
    });

    // 사용자 상태 관련 IPC 핸들러
    ipcMain.handle('app:get-user-status', () => {
        return statusManager ? statusManager.getCurrentStatus() : 'online';
    });

    ipcMain.handle('app:get-status-manager-settings', () => {
        return statusManager ? statusManager.getSettings() : null;
    });

    ipcMain.handle('app:update-status-manager-settings', (evt, settings) => {
        if (statusManager) {
            statusManager.updateSettings(settings);
            return statusManager.getSettings();
        }
        return null;
    });

    ipcMain.handle('app:force-status-update', (evt, status) => {
        if (statusManager) {
            try {
                statusManager.forceStatusUpdate(status);
                return { success: true, currentStatus: statusManager.getCurrentStatus() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: 'StatusManager가 초기화되지 않았습니다.' };
    });

    // 사용자 설정 관련 IPC 핸들러
    ipcMain.handle('app:get-user-settings', () => {
        return userSettings;
    });

    ipcMain.handle('app:save-user-settings', (evt, settings) => {
        userSettings = { ...userSettings, ...settings };
        global.userSettings = userSettings;
        saveUserSettings();
        // 안내 메시지, RPC 재초기화 안내 등 부가 로직 제거
        return userSettings;
    });
}

// formatWithVars 함수 추가
function formatWithVars(format, app, title) {
    return format.replace(/\{app\}/g, app).replace(/\{title\}/g, title);
}

async function startUp() {
    await app.whenReady();

    autoUpdater.checkForUpdatesAndNotify();

    app.setAppUserModelId("Distalker");
    
    // 설정 로드
    loadSettings();
    loadUserSettings();
    
    // resourcesPath 내 .env 우선 로드
    try {
        if (app.isPackaged) {
            const base = process.resourcesPath || __dirname;
            const envPath = path.join(base, '.env');
            const envProd = path.join(base, '.env.production');

            if (fs.existsSync(envPath)) {
                dotenv.config({ path: envPath });
                logger.debug('개발 환경 설정 파일을 불러왔습니다.');
            } else if (fs.existsSync(envProd)) {
                dotenv.config({ path: envProd });
                logger.debug('빌드 환경 설정 파일을 불러왔습니다.');
            }
        } else {
            const devEnv = path.join(process.cwd(), '.env.development');

            if (fs.existsSync(devEnv)) {
                dotenv.config({ path: devEnv });
                logger.debug('.env.development 파일을 불러왔습니다.');
            }
        }
    } catch (_) { /* 무시까버리기*/ }

    setupIpc();
    await createWindow();
    
    // StatusManager 초기화 및 시작
    initializeStatusManager();
    if (statusManager) {
        statusManager.start();
    }
    
    // 시작 시 트레이 최소화가 활성화된 경우 창을 렌더링하지 않음
    if (!startupMinimized) {
        mainWindow.show();
    } else {
        mainWindow.hide();
    }

    // 사용자 설정의 클라이언트 ID를 우선 사용, 없으면 환경변수 사용
    const clientId = userSettings.clientId || process.env.DISCORD_CLIENT_ID;

    if (!clientId) {
        logger.warn('Discord 클라이언트 ID가 설정되지 않았습니다. 설정에서 클라이언트 ID를 입력하세요.');
        notify('❗ Discord 클라이언트 ID 미설정', '설정에서 Discord 클라이언트 ID를 입력하세요.');
    } else {
        try {
            rpcClient = await createRpcClient(clientId, (title, body) => {
                notify(title, body);
                updateTrayMenu();

                if (mainWindow && rpcClient) {
                    mainWindow.webContents.send('rpc-status', {
                        connected: rpcClient.isConnected(),
                        enabled: rpcEnabled,
                        timestamp: new Date().toISOString()
                    });
                }
            });
            
            // RPC 클라이언트 초기화 후 트레이 메뉴 업데이트
            updateTrayMenu();
            
            // RPC 상태 모니터링
            const checkRpcStatus = () => {
                if (mainWindow && rpcClient) {
                    mainWindow.webContents.send('rpc-status', {
                        connected: rpcClient.isConnected(),
                        enabled: rpcEnabled,
                        timestamp: new Date().toISOString()
                    });
                }
            };
            
            // 30초마다 RPC 상태 체크
            setInterval(checkRpcStatus, 30000);
            checkRpcStatus(); // 초기 상태 체크
            
        } catch (e) {
            logger.warn(`Discord RPC 초기화 실패: ${e?.message || e}`);
            notify('❗ Discord RPC 초기화 실패', 'Discord 클라이언트가 실행 중인지 확인하세요.');
        }

        startActiveWindowWatcher({
            onWindowChange: async (info) => {
                const details = info?.title || '알 수 없는 윈도우';
                const state = info?.owner?.name ? `by ${info.owner.name}` : '알 수 없는 앱';

                currentWindowInfo = {
                    title: details,
                    app: info?.owner?.name || '알 수 없는 앱',
                    timestamp: new Date().toISOString(),
                    ...info
                };

                if (mainWindow) {
                    mainWindow.webContents.send('window-changed', currentWindowInfo);
                }

                if (info?.error) {
                    await updateRpcActivityWithUserStatus({
                        details: "활동 상태를 불러올 수 없습니다.",
                        state: info.message,
                        smallImageKey: userSettings.errorImageKey || 'error',
                        ...defaultActivity
                    }, false, true); // 사용자 상태 사용하지 않음

                    logger.info('활동 상태를 불러올 수 없어 Discord에 이를 표시했습니다.');

                    return;
                }

                try {
                    if (rpcClient?.setActivity && rpcEnabled && rpcClient.isConnected()) {
                        // 블랙리스트, 포맷 적용
                        const appBlacklist = userSettings.appBlacklist || [];
                        const detailsFormat = userSettings.detailsFormat || '{app} 하는 중';
                        const stateFormat = userSettings.stateFormat || '창: {title}';
                        if (appBlacklist.includes(currentWindowInfo.app)) {
                            logger.info(`블랙리스트 앱(${currentWindowInfo.app}) 실행 중, RPC 표시 생략`);
                            return;
                        }
                        const details = formatWithVars(detailsFormat, currentWindowInfo.app, currentWindowInfo.title);
                        const state = formatWithVars(stateFormat, currentWindowInfo.app, currentWindowInfo.title);
                        // 이후 details, state를 기존대로 RPC에 전달
                        await updateRpcActivityWithUserStatus({
                            details,
                            state,
                            ...defaultActivity
                        }, true, true); // 사용자 상태 사용, 타임스탬프 새로 설정 (앱 변경)

                        logger.info(`활동 상태 업데이트: ${details}`);
                    } else if (rpcClient?.setActivity && !rpcEnabled && rpcClient.isConnected()) {
                        await updateRpcActivityWithUserStatus({
                            details: "사용자가 활동 상태 공유를 중단했습니다.",
                            state: "사용자가 자신의 활동 상태를 공유하지 않도록 설정했습니다.",
                            smallImageKey: userSettings.warningImageKey || 'warning',
                            ...defaultActivity
                        }, false, false); // 사용자 상태 사용하지 않음, 타임스탬프 유지

                        logger.debug('활동 상태가 비활성화 상태로 클리어되었습니다.');
                    } else if (!rpcClient?.isConnected()) {
                        logger.debug('RPC가 연결되지 않아 활동 상태 업데이트를 건너뜁니다.');
                    }
                } catch (e) {
                    const retrySeconds = Math.round((intervalMs || 1500) / 1000);

                    logger.warn(`활동 상태 업데이트 실패: ${e?.message || e}, ${retrySeconds}초 후 재시도합니다...`);
                    notify('❗ 활동 상태 업데이트 실패', `${retrySeconds}초 후 다시 시도합니다...`);
                }
            },
            logger,
        });
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    // StatusManager 정리
    if (statusManager) {
        statusManager.stop();
        logger.info('StatusManager 정리 완료');
    }
});

startUp().catch((err) => {
    logger.error(`Distalker를 시작하는 도중에 문제가 발생했습니다: ${err?.stack || err}`);
    app.quit();
});

