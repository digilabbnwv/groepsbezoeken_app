/**
 * Unit tests for polling.js
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock PollingService for testing (since it auto-sets up event listeners)
describe('PollingService', () => {
    let PollingService;

    beforeEach(async () => {
        // Fresh import for each test
        vi.resetModules();
        const module = await import('../../js/polling.js');
        PollingService = module.PollingService;
    });

    afterEach(() => {
        if (PollingService) {
            PollingService.stopAll();
        }
    });

    describe('getController', () => {
        it('should return an AbortController', () => {
            const controller = PollingService.getController('test');
            expect(controller).toBeInstanceOf(AbortController);
            expect(controller.signal.aborted).toBe(false);
        });

        it('should abort previous controller when getting new one', () => {
            const controller1 = PollingService.getController('test');
            const controller2 = PollingService.getController('test');

            expect(controller1.signal.aborted).toBe(true);
            expect(controller2.signal.aborted).toBe(false);
        });

        it('should manage separate controllers per key', () => {
            const controllerA = PollingService.getController('keyA');
            const controllerB = PollingService.getController('keyB');

            // Getting new A should not affect B
            const newControllerA = PollingService.getController('keyA');

            expect(controllerA.signal.aborted).toBe(true);
            expect(controllerB.signal.aborted).toBe(false);
            expect(newControllerA.signal.aborted).toBe(false);
        });
    });

    describe('isInFlight / setInFlight', () => {
        it('should track in-flight status', () => {
            expect(PollingService.isInFlight('test')).toBe(false);

            PollingService.setInFlight('test', true);
            expect(PollingService.isInFlight('test')).toBe(true);

            PollingService.setInFlight('test', false);
            expect(PollingService.isInFlight('test')).toBe(false);
        });

        it('should track separate keys independently', () => {
            PollingService.setInFlight('keyA', true);
            PollingService.setInFlight('keyB', false);

            expect(PollingService.isInFlight('keyA')).toBe(true);
            expect(PollingService.isInFlight('keyB')).toBe(false);
        });
    });

    describe('startInterval / stopInterval', () => {
        it('should start an interval', () => {
            const callback = vi.fn();
            PollingService.startInterval('test', callback, 100);

            expect(PollingService.isRunning('test')).toBe(true);
        });

        it('should stop an interval', () => {
            const callback = vi.fn();
            PollingService.startInterval('test', callback, 100);
            PollingService.stopInterval('test');

            expect(PollingService.isRunning('test')).toBe(false);
        });

        it('should replace existing interval with same key', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            PollingService.startInterval('test', callback1, 100);
            PollingService.startInterval('test', callback2, 100);

            // Only one interval should be running
            expect(PollingService.isRunning('test')).toBe(true);
        });

        it('should call callback periodically', async () => {
            const callback = vi.fn().mockResolvedValue(undefined);
            PollingService.startInterval('test', callback, 50);

            // Wait for a few intervals
            await new Promise(resolve => setTimeout(resolve, 130));

            PollingService.stopInterval('test');

            // Should have been called at least twice
            expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
        });

        it('should not overlap calls when previous still running', async () => {
            let callCount = 0;
            let concurrentCalls = 0;
            let maxConcurrent = 0;

            const slowCallback = async () => {
                callCount++;
                concurrentCalls++;
                maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
                // Simulate slow operation
                await new Promise(resolve => setTimeout(resolve, 100));
                concurrentCalls--;
            };

            PollingService.startInterval('test', slowCallback, 30);

            // Wait for potential overlapping calls
            await new Promise(resolve => setTimeout(resolve, 200));

            PollingService.stopInterval('test');

            // Should never have concurrent calls due to guard
            expect(maxConcurrent).toBe(1);
        });
    });

    describe('stopAll', () => {
        it('should stop all intervals', () => {
            PollingService.startInterval('key1', vi.fn(), 100);
            PollingService.startInterval('key2', vi.fn(), 100);

            PollingService.stopAll();

            expect(PollingService.isRunning('key1')).toBe(false);
            expect(PollingService.isRunning('key2')).toBe(false);
        });

        it('should abort all controllers', () => {
            const controller1 = PollingService.getController('key1');
            const controller2 = PollingService.getController('key2');

            PollingService.stopAll();

            expect(controller1.signal.aborted).toBe(true);
            expect(controller2.signal.aborted).toBe(true);
        });

        it('should reset all in-flight flags', () => {
            PollingService.setInFlight('key1', true);
            PollingService.setInFlight('key2', true);

            PollingService.stopAll();

            expect(PollingService.isInFlight('key1')).toBe(false);
            expect(PollingService.isInFlight('key2')).toBe(false);
        });
    });

    describe('isRunning', () => {
        it('should return false for non-existent interval', () => {
            expect(PollingService.isRunning('nonexistent')).toBe(false);
        });

        it('should return true for running interval', () => {
            PollingService.startInterval('test', vi.fn(), 100);
            expect(PollingService.isRunning('test')).toBe(true);
        });
    });
});
