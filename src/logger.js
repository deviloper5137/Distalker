import fs from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'path';

// 레벨별 정보 딕셔너리
export const logLevels = {
    DEBUG:   { name: "DEBUG",   color: '\x1b[34m', icon: '🔧' },
    INFO:    { name: "INFO",    color: '\x1b[32m', icon: '🔔' },
    SUCCESS: { name: "SUCCESS", color: '\x1b[32m', icon: '✅' },
    WARN:    { name: "WARN",    color: '\x1b[33m', icon: '⚠️' },
    ERROR:   { name: "ERROR",   color: '\x1b[31m', icon: '❌' }
};

const resetColor = '\x1b[0m';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 전역 로거 설정 관리
class LoggerConfig {
    constructor(config = {}) {
        // Electron 환경 감지 및 로그 폴더 경로 결정
        let logFolder;
        try {
            // electron이 로드된 경우 app, process.resourcesPath 사용
            const electron = require('electron');
            const app = electron.app || (electron.remote && electron.remote.app);
            if (app && app.isPackaged) {
                logFolder = path.join(app.getPath('userData'), 'logs');
            } else {
                logFolder = path.join(__dirname, '..', 'logs');
            }
        } catch (e) {
            // electron이 없으면 개발 환경으로 처리
            logFolder = path.join(__dirname, '..', 'logs');
        }

        this.defaultLevel = 'INFO';
        this.logFolder = logFolder;
        this.enableFileLogging = true;
        this.enableConsoleLogging = true;
        this.maxLogFiles = 10;
        this.fileLogLevel = 'INFO';
        this.enableLogRotation = true;
        this.maxLogLines = 1000;
        // 객체 기반 초기화
        this.setConfig(config);
    }

    // 객체 기반 설정 변경 및 적용
    setConfig(config = {}) {
        Object.assign(this, config);
        if (config.logFolder) {
            this.logFolder = config.logFolder;
            this.ensureLogDirectory();
        }
    }
    
    // 로그 디렉토리 생성
    ensureLogDirectory() {
        if (!fs.existsSync(this.logFolder)) {
            fs.mkdirSync(this.logFolder, { recursive: true });
        }
    }
    
    // 로그 파일 로테이션 (오래된 파일 삭제)
    rotateLogFiles() {
        if (!this.enableLogRotation) return;
        
        try {
            const files = fs.readdirSync(this.logFolder)
                .filter(file => file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.logFolder, file),
                    stats: fs.statSync(path.join(this.logFolder, file))
                }))
                .sort((a, b) => b.stats.mtime - a.stats.mtime); // 최신 파일부터 정렬
            
            // 최대 파일 개수를 초과하는 오래된 파일들 삭제
            if (files.length > this.maxLogFiles) {
                const filesToDelete = files.slice(this.maxLogFiles);
                filesToDelete.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (e) {
                        console.warn(`로그 파일 삭제 실패: ${file.name}`);
                    }
                });
            }
        } catch (e) {
            console.warn(`로그 파일 로테이션 실패: ${e.message}`);
        }
    }
}

// 싱글턴 설정 인스턴스
export const loggerConfig = new LoggerConfig();

// 날짜 포맷 함수 (파일명용)
function getLogFileName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}-${hour}-${minute}.log`;
}

// 타임스탬프 포맷 함수 (로그 한 줄용)
function getTimestamp() {
    const now = new Date();
    const year   = now.getFullYear();
    const month  = String(now.getMonth() + 1).padStart(2, '0');
    const day    = String(now.getDate()).padStart(2, '0');
    const hour   = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

class LogManager {
    #logFilePath;
    #logs = [];
    #loggers = [];

    constructor() {
        const logFileName = getLogFileName();
        // loggerConfig.logFolder가 ASAR 외부 경로임을 보장
        this.#logFilePath = path.join(loggerConfig.logFolder, logFileName);

        // 로그 폴더가 없으면 생성
        loggerConfig.ensureLogDirectory();

        if (loggerConfig.enableFileLogging && !fs.existsSync(this.#logFilePath)) {
            fs.writeFileSync(this.#logFilePath, '', { flag: 'w' });
        }
        // 로그 파일 로테이션 수행
        loggerConfig.rotateLogFiles();
    }

    get logFilePath() {
        return this.#logFilePath;
    }

    get logs() {
        return [...this.#logs];
    }

    get loggers() {
        return [...this.#loggers];
    }

    _pushLog(log) {
        this.#logs.push(log);
    }

    _registerLogger(logger) {
        this.#loggers.push(logger);
    }

    async saveLogToFile(log) {
        if (loggerConfig.enableFileLogging) {
            fs.appendFile(this.#logFilePath, log + `\n`, (err) => {
                if (err) {
                    console.error('로그를 저장할 수 없습니다: ', err);
                } else {
                    this.rotateLogLines();
                }
            });
        }
    }
    
    // 로그 파일의 줄 수가 최대값을 초과하면 오래된 줄들 삭제
    rotateLogLines() {
        if (!loggerConfig.enableLogRotation || !fs.existsSync(this.#logFilePath)) {
            return;
        }

        try {
            const content = fs.readFileSync(this.#logFilePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim() !== '');
            
            if (lines.length > loggerConfig.maxLogLines) {
                const linesToKeep = lines.slice(-loggerConfig.maxLogLines);
                fs.writeFileSync(this.#logFilePath, linesToKeep.join('\n') + '\n');
            }
        } catch (e) {
            console.warn(`로그 파일 줄 로테이션 실패: ${e.message}`);
        }
    }
}

// 싱글턴 LogManager 인스턴스 생성 및 export
export const logManager = new LogManager();

export class Logger {
    #logs = [];
    #levelOrder = Object.values(logLevels).map(l => l.name);
    #manager;

    constructor(name, level = logLevels.INFO.name) {
        this.name = name;
        this.logLevel = level;
        this.#manager = logManager;

        // Logger가 생성될 때 LogManager에 자신을 등록
        if (this.#manager && typeof this.#manager._registerLogger === 'function') {
            this.#manager._registerLogger(this);
        }
    }

    get logs() {
        return [...this.#logs];
    }

    #shouldLog(level) {
        // 전역 설정의 기본 레벨을 우선 사용
        return this.#levelOrder.indexOf(level) >= this.#levelOrder.indexOf(loggerConfig.defaultLevel);
    }
    
    #shouldLogToFile(level) {
        return this.#levelOrder.indexOf(level) >= this.#levelOrder.indexOf(loggerConfig.fileLogLevel);
    }

    #log(level, message) {
        if (this.#shouldLog(level)) {
            const { icon, color, name } = Object.values(logLevels).find(l => l.name === level);
            const timestamp = getTimestamp();
            const levelStr = `${color}${name}${resetColor}`;
            const cLog = `${icon} [${timestamp}] ${this.name} - ${levelStr} | ${message}`;
            const log = `${icon} [${timestamp}] ${this.name} - ${name} | ${message}`;

            this.#logs.push(log);
            this.#manager._pushLog(log);
            
            if (loggerConfig.enableConsoleLogging) {
                console.log(cLog);
            }

            // 파일 로그 레벨 확인 후 저장
            if (this.#shouldLogToFile(level)) {
                this.#manager.saveLogToFile(log);
            }
        }
    }

    info(message) {
        this.#log(logLevels.INFO.name, message);
    }

    success(message) {
        this.#log(logLevels.SUCCESS.name, message);
    }

    warn(message) {
        this.#log(logLevels.WARN.name, message);
    }

    error(message) {
        this.#log(logLevels.ERROR.name, message);
    }

    debug(message) {
        this.#log(logLevels.DEBUG.name, message);
    }

    setLevel(level) {
        this.logLevel = level;
    }
}

// 전역 로거 팩토리 함수
export function createLogger(name, level = null) {
    return new Logger(name, level || loggerConfig.defaultLevel);
}

// 기본 로거 인스턴스 (편의용)
export const logger = createLogger('App');
