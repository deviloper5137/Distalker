import 'dotenv/config';
import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, Notification } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { createRpcClient } from './rpc.js';
import { startActiveWindowWatcher } from './watcher.js';
import { createLogger, loggerConfig } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// rootFolder는 아래에서 최초 1회만 선언
let rootFolder = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');

// 빌드 환경에 따른 로그 설정 적용
if (app.isPackaged) {
    // 제품 빌드용 설정: 최대 5개 파일, WARN 이상만 파일에 저장, 콘솔은 INFO 이상
    loggerConfig.setMaxLogFiles(5);
    loggerConfig.setFileLogLevel('WARN');
    loggerConfig.setLogRotation(true);
    loggerConfig.setDefaultLevel('INFO');
    loggerConfig.setConsoleLogging(true);
    loggerConfig.setFileLogging(true);
    loggerConfig.setMaxLogLines(500); // 제품 빌드: 파일당 500줄
} else {
    // 개발 빌드용 설정: 최대 10개 파일, 모든 레벨 파일에 저장, 콘솔도 모든 레벨
    loggerConfig.setMaxLogFiles(10);
    loggerConfig.setFileLogLevel('DEBUG');
    loggerConfig.setLogRotation(true);
    loggerConfig.setDefaultLevel('DEBUG');
    loggerConfig.setConsoleLogging(true);
    loggerConfig.setFileLogging(true);
    loggerConfig.setMaxLogLines(1000); // 개발 빌드: 파일당 1000줄
}

// Electron 메인 프로세스 로거 - 앱 초기화, 창 관리, 트레이, RPC 연결 등 메인 프로세스 전반의 로깅 담당
const logger = createLogger('MainProcess');
let mainWindow = null;
let rpcClient = null;
let tray = null;
let minimizeToTray = true;
let currentWindowInfo = null;
let startupMinimized = true; // 시작 시 트레이로 최소화 설정
let rpcEnabled = true; // RPC 활동 상태 공유 활성화 상태

function notify(title, body) {
    try {
        const iconPath = path.join(rootFolder, 'assets', 'icons', 'png', '256.png');
        new Notification({ 
            icon: iconPath,
            title, 
            body, 
            silent: false
        }).show();
    } catch (_) {
        // ignore notification failures
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
        } catch (_) {
            // ignore and retry
        }
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
}

function getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
}

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
        startupMinimized = true; // 기본값
        rpcEnabled = true; // 기본값
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
            // RPC 활동 중단 - null로 설정하여 활동 제거
            await rpcClient.setActivity({
                details: "활동 상태 공유가 중단되었습니다.",
                state: "사용자가 자신의 활동을 공유하지 않도록 설정했습니다.",
                largeImageKey: 'app',
                largeImageText: 'Distalker',
                instance: true,
                startTimestamp: Date.now(),
            });
            rpcEnabled = false;
            logger.info('사용자가 활동 상태 공유를 중단했습니다.');
            notify('🔔 활동 상태 공유 중단', '활동 상태 공유를 비활성화했습니다.');
        } else {
            // RPC 활동 재개
            if (currentWindowInfo) {
                const details = currentWindowInfo.title || 'Untitled';
                const state = currentWindowInfo.app ? `by ${currentWindowInfo.app}` : undefined;
                
                await rpcClient.setActivity({
                    details,
                    state,
                    largeImageKey: 'app',
                    largeImageText: 'Distalker',
                    instance: true,
                    startTimestamp: Date.now(),
                });
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
                // 설정 변경 즉시 RPC 상태도 동기화
                mainWindow.webContents.send('rpc-status', {
                    connected: rpcClient ? rpcClient.isConnected() : false,
                    enabled: rpcEnabled,
                    timestamp: new Date().toISOString()
                });
        }
    } catch (error) {
        logger.warn(`활동 상태 변경 실패: ${error.message}`);
        notify('❗ 활동 상태 변경 실패', '잠시 후 다시 시도해주세요!');
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
        width: 940,
        height: 640,
        icon: iconPath,
        resizable: false,
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
}

async function boot() {
    await app.whenReady();
    app.setAppUserModelId("Distalker");
    
    // 설정 로드
    loadSettings();
    
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
    } catch (_) { /* ignore */ }
    setupIpc();
    await createWindow();
    
    // 시작 시 트레이 최소화가 활성화된 경우 창을 숨김
    if (!startupMinimized) {
        mainWindow.show();
    } else {
        mainWindow.hide();
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
        logger.warn('DISCORD_CLIENT_ID 가 정의되지 않았습니다. 활동 상태 공유가 비활성화됩니다.');
        notify('❗ DISCORD_CLIENT_ID 미설정', '활동 상태 공유가 비활성화됩니다.');
    } else {
        try {
            rpcClient = await createRpcClient(clientId, logger, (title, body) => {
                notify(title, body);
                // RPC 상태 변경 시 트레이 메뉴와 UI 업데이트
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
                const details = info?.title || 'Untitled';
                const state = info?.owner?.name ? `by ${info.owner.name}` : undefined;
                
                // 현재 창 정보 업데이트
                currentWindowInfo = {
                    title: details,
                    app: info?.owner?.name || 'Unknown',
                    timestamp: new Date().toISOString(),
                    ...info
                };
                
                // 렌더러에 창 정보 업데이트 알림
                if (mainWindow) {
                    mainWindow.webContents.send('window-changed', currentWindowInfo);
                }
                
                try {
                    if (rpcClient?.setActivity && rpcEnabled && rpcClient.isConnected()) {
                        await rpcClient.setActivity({
                            details,
                            state,
                            largeImageKey: 'app',
                            largeImageText: 'Distalker',
                            instance: false,
                            startTimestamp: Date.now(),
                        });
                        logger.info(`활동 상태 업데이트: ${details}`);
                    } else if (rpcClient?.setActivity && !rpcEnabled && rpcClient.isConnected()) {
                        // 활동 상태 공유가 비활성화된 경우 중단 메시지를 유지
                        await rpcClient.setActivity({
                            details: "사용자가 활동 상태 공유를 중단했습니다.",
                            state: "사용자가 자신의 활동을 공유하지 않도록 설정했습니다.",
                            largeImageKey: 'app',
                            largeImageText: 'Distalker',
                            instance: true,
                            startTimestamp: Date.now(),
                        });
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

boot().catch((err) => {
    logger.error(`시작 실패: ${err?.stack || err}`);
    app.quit();
});


