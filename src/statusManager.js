import { EventEmitter } from 'node:events';
import { powerMonitor } from 'electron';

/**
 * 사용자 상태 관리 클래스
 * 실시간으로 사용자의 idle/online 상태를 모니터링하고 상태 변경을 알림
 */
export class StatusManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // 설정 옵션
        this.idleThresholdMs = options.idleThresholdMs || 600000; // 기본 10분
        this.checkIntervalMs = options.checkIntervalMs || 5000; // 기본 5초마다 체크
        this.currentStatus = 'online';
        this.checkTimer = null;
        this.isRunning = false;
        
        // 상태 변경 콜백들
        this.onStatusChange = options.onStatusChange || null;
        
        // 로거 설정
        this.logger = options.logger || console;
        
        this.logger.debug(`StatusManager 초기화: idleThreshold=${this.idleThresholdMs}ms, checkInterval=${this.checkIntervalMs}ms`);
    }

    /**
     * 현재 사용자 상태를 확인
     * @returns {string} 'online' 또는 'idle'
     */
    getCurrentStatus() {
        const idleTimeMs = powerMonitor.getSystemIdleTime() * 1000;
        return idleTimeMs >= this.idleThresholdMs ? 'idle' : 'online';
    }

    /**
     * 상태 모니터링 시작
     */
    start() {
        if (this.isRunning) {
            this.logger.debug('StatusManager가 이미 실행 중입니다.');
            return;
        }

        this.isRunning = true;
        this.currentStatus = this.getCurrentStatus();
        
        this.logger.info(`StatusManager 시작: 초기 상태=${this.currentStatus}`);
        
        // 주기적으로 상태 체크
        this.checkTimer = setInterval(() => {
            this.checkStatus();
        }, this.checkIntervalMs);
        
        // 초기 상태 이벤트 발생
        this.emitStatusChange(this.currentStatus);
    }

    /**
     * 상태 모니터링 중지
     */
    stop() {
        if (!this.isRunning) {
            this.logger.debug('StatusManager가 실행되지 않고 있습니다.');
            return;
        }

        this.isRunning = false;
        
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        
        this.logger.info('StatusManager 중지됨');
    }

    /**
     * 상태 변경 체크
     * @private
     */
    checkStatus() {
        const newStatus = this.getCurrentStatus();
        
        if (newStatus !== this.currentStatus) {
            const previousStatus = this.currentStatus;
            this.currentStatus = newStatus;
            
            this.logger.info(`상태 변경: ${previousStatus} → ${newStatus}`);
            this.emitStatusChange(this.currentStatus, previousStatus);
        }
    }

    /**
     * 상태 변경 이벤트 발생
     * @param {string} newStatus - 새로운 상태
     * @param {string} previousStatus - 이전 상태
     * @private
     */
    emitStatusChange(newStatus, previousStatus = null) {
        const statusData = {
            status: newStatus,
            previousStatus,
            timestamp: new Date().toISOString(),
            idleTimeMs: powerMonitor.getSystemIdleTime() * 1000
        };

        // 이벤트 발생
        this.emit('statusChange', statusData);
        
        // 콜백 함수 호출
        if (this.onStatusChange) {
            try {
                this.onStatusChange(statusData);
            } catch (error) {
                this.logger.warn(`상태 변경 콜백 실행 중 오류: ${error.message}`);
            }
        }
    }

    /**
     * 상태별 이미지 키 반환
     * @param {string} status - 상태 ('online' 또는 'idle')
     * @returns {string} Discord RPC용 이미지 키
     */
    getStatusImageKey(status = null) {
        const currentStatus = status || this.currentStatus;
        
        switch (currentStatus) {
            case 'idle':
                return 'idle';
            case 'online':
            default:
                return 'online';
        }
    }

    /**
     * 상태별 상태 텍스트 반환
     * @param {string} status - 상태 ('online' 또는 'idle')
     * @returns {string} 사용자에게 표시할 상태 텍스트
     */
    getStatusText(status = null) {
        const currentStatus = status || this.currentStatus;
        
        switch (currentStatus) {
            case 'idle':
                return '자리 비움';
            case 'online':
            default:
                return '온라인';
        }
    }

    /**
     * 현재 설정 정보 반환
     * @returns {Object} 현재 설정
     */
    getSettings() {
        return {
            idleThresholdMs: this.idleThresholdMs,
            checkIntervalMs: this.checkIntervalMs,
            isRunning: this.isRunning,
            currentStatus: this.currentStatus
        };
    }

    /**
     * 설정 업데이트
     * @param {Object} settings - 새로운 설정
     */
    updateSettings(settings) {
        const oldSettings = this.getSettings();
        
        if (settings.idleThresholdMs !== undefined) {
            this.idleThresholdMs = Math.max(1000, settings.idleThresholdMs); // 최소 1초
        }
        
        if (settings.checkIntervalMs !== undefined) {
            this.checkIntervalMs = Math.max(1000, settings.checkIntervalMs); // 최소 1초
        }
        
        this.logger.info(`설정 업데이트: ${JSON.stringify(this.getSettings())}`);
        
        // 실행 중이고 체크 간격이 변경된 경우 재시작
        if (this.isRunning && settings.checkIntervalMs !== undefined && settings.checkIntervalMs !== oldSettings.checkIntervalMs) {
            this.stop();
            this.start();
        }
    }

    /**
     * 강제 상태 업데이트 (테스트용)
     * @param {string} status - 강제 설정할 상태
     */
    forceStatusUpdate(status) {
        if (status !== 'online' && status !== 'idle') {
            throw new Error('상태는 "online" 또는 "idle"이어야 합니다.');
        }
        
        const previousStatus = this.currentStatus;
        this.currentStatus = status;
        
        this.logger.info(`강제 상태 변경: ${previousStatus} → ${status}`);
        this.emitStatusChange(this.currentStatus, previousStatus);
    }
}

/**
 * StatusManager 인스턴스 생성 헬퍼 함수
 * @param {Object} options - 설정 옵션
 * @returns {StatusManager} StatusManager 인스턴스
 */
export function createStatusManager(options = {}) {
    return new StatusManager(options);
}

export default StatusManager;
