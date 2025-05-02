import fs from 'node:fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Config } from '../../src/types/config';
import { watchFile } from '../../src/utils/watch';

// Mock the fs module
vi.mock('node:fs', () => ({
  accessSync: vi.fn(),
  default: {
    accessSync: vi.fn(),
    existsSync: vi.fn(),
    statSync: vi.fn(() => ({ mtimeMs: 1000 })),
  },
  existsSync: vi.fn(),
  statSync: vi.fn(() => ({ mtimeMs: 1000 })),
}));

// Mock fetch for remote URL tests
global.fetch = vi.fn();

describe('Watch Mode', () => {
  const mockCallback = vi.fn().mockResolvedValue(undefined);
  const mockOnTimeout = vi.fn();

  // Create a minimal config
  const createConfig = (overrides = {}): Config => ({
    base: '',
    client: { bundle: false, name: 'legacy/fetch' },
    configFile: '',
    debug: false,
    dryRun: false,
    experimentalParser: false,
    exportCore: false,
    input: { path: 'test-spec.json' },
    name: undefined,
    output: { clean: true, format: false, lint: false, path: 'output' },
    pluginOrder: [],
    plugins: {},
    request: undefined,
    useOptions: true,
    watch: { enabled: true, interval: 100, timeout: 1000 },
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Default mock implementations
    (fs.accessSync as any).mockImplementation(() => true);
    (fs.statSync as any).mockImplementation(() => ({ mtimeMs: 1000 }));
    (global.fetch as any).mockResolvedValue({
      headers: {
        get: (header: string) => {
          if (header === 'etag') return '"123"';
          if (header === 'last-modified')
            return 'Wed, 21 Oct 2023 07:28:00 GMT';
          return null;
        },
      },
      text: () => Promise.resolve('{"openapi":"3.0.0"}'),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Local File Watching', () => {
    it('returns a no-op function when watch mode is disabled', () => {
      const config = createConfig({
        watch: { enabled: false, interval: 100, timeout: 1000 },
      });
      const cleanup = watchFile({ callback: mockCallback, config });

      expect(cleanup).toBeInstanceOf(Function);
      expect(fs.accessSync).not.toHaveBeenCalled();
    });

    it('verifies file access before watching', () => {
      const config = createConfig();
      watchFile({ callback: mockCallback, config });

      expect(fs.accessSync).toHaveBeenCalled();
    });

    it('handles file access errors gracefully', () => {
      const accessError = new Error('Access denied');
      (fs.accessSync as any).mockImplementation(() => {
        throw accessError;
      });

      const config = createConfig();
      const cleanup = watchFile({ callback: mockCallback, config });

      expect(cleanup).toBeInstanceOf(Function);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot access file'),
      );
    });

    it('detects local file changes and triggers callback', () => {
      const config = createConfig();
      watchFile({ callback: mockCallback, config });

      // Set up the next statSync call to return a newer timestamp
      (fs.statSync as any)
        .mockReturnValueOnce({ mtimeMs: 1000 })
        .mockReturnValueOnce({ mtimeMs: 2000 });

      // Advance the timer to trigger the interval check
      vi.advanceTimersByTime(config.watch.interval);

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('ignores if file mtime has not changed', () => {
      const config = createConfig();
      watchFile({ callback: mockCallback, config });

      // Set up the statSync call to return the same timestamp
      (fs.statSync as any).mockReturnValue({ mtimeMs: 1000 });

      // Advance the timer to trigger the interval check
      vi.advanceTimersByTime(config.watch.interval);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('stops watching after timeout period', () => {
      const config = createConfig();
      watchFile({ callback: mockCallback, config, onTimeout: mockOnTimeout });

      // Advance the timer beyond the timeout period
      vi.advanceTimersByTime(config.watch.timeout + 1);

      expect(mockOnTimeout).toHaveBeenCalledTimes(1);
    });

    it('cleanup function stops interval and clears timeout', () => {
      const config = createConfig();
      const cleanup = watchFile({
        callback: mockCallback,
        config,
        onTimeout: mockOnTimeout,
      });

      // Execute the cleanup function
      cleanup();

      // Advance the timer to see if any callbacks are still triggered
      vi.advanceTimersByTime(config.watch.interval * 10);
      vi.advanceTimersByTime(config.watch.timeout + 1);

      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockOnTimeout).not.toHaveBeenCalled();
    });
  });

  describe('Remote URL Watching', () => {
    it('detects changes via ETag header', async () => {
      const config = createConfig({
        input: { path: 'https://example.com/api.json' },
      });

      watchFile({ callback: mockCallback, config });

      // First call with initial ETag
      (global.fetch as any).mockResolvedValueOnce({
        headers: {
          get: (header: string) => (header === 'etag' ? '"123"' : null),
        },
      });

      // Second call with different ETag
      (global.fetch as any).mockResolvedValueOnce({
        headers: {
          get: (header: string) => (header === 'etag' ? '"456"' : null),
        },
      });

      // Advance the timer to trigger the interval check
      vi.advanceTimersByTime(config.watch.interval);

      // Allow promises to resolve
      await vi.runAllTimersAsync();

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('detects changes via Last-Modified header', async () => {
      const config = createConfig({
        input: { path: 'https://example.com/api.json' },
      });

      watchFile({ callback: mockCallback, config });

      // First call with initial Last-Modified
      (global.fetch as any).mockResolvedValueOnce({
        headers: {
          get: (header: string) =>
            header === 'last-modified' ? 'Wed, 21 Oct 2023 07:28:00 GMT' : null,
        },
      });

      // Second call with newer Last-Modified
      (global.fetch as any).mockResolvedValueOnce({
        headers: {
          get: (header: string) =>
            header === 'last-modified' ? 'Wed, 21 Oct 2023 08:30:00 GMT' : null,
        },
      });

      // Advance the timer to trigger the interval check
      vi.advanceTimersByTime(config.watch.interval);

      // Allow promises to resolve
      await vi.runAllTimersAsync();

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('detects changes by comparing content when headers are not available', async () => {
      const config = createConfig({
        input: { path: 'https://example.com/api.json' },
      });

      watchFile({ callback: mockCallback, config });

      // First call with initial content
      (global.fetch as any).mockResolvedValueOnce({
        headers: { get: () => null },
        text: () => Promise.resolve('{"openapi":"3.0.0"}'),
      });

      // Second call with different content
      (global.fetch as any).mockResolvedValueOnce({
        headers: { get: () => null },
        text: () => Promise.resolve('{"openapi":"3.0.1"}'),
      });

      // Advance the timer to trigger the interval check
      vi.advanceTimersByTime(config.watch.interval);

      // Allow promises to resolve
      await vi.runAllTimersAsync();

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('handles network errors gracefully', async () => {
      const config = createConfig({
        input: { path: 'https://example.com/api.json' },
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      watchFile({ callback: mockCallback, config });

      // Simulate a network error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Advance the timer to trigger the interval check
      vi.advanceTimersByTime(config.watch.interval);

      // Allow promises to resolve
      await vi.runAllTimersAsync();

      expect(mockCallback).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error checking remote file'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('skips watching if input.path is not a string', () => {
      const config = createConfig({
        input: { path: { foo: 'bar' } },
      });

      const cleanup = watchFile({ callback: mockCallback, config });
      cleanup(); // Should not throw

      expect(fs.accessSync).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('prevents multiple callbacks from running concurrently', async () => {
      const config = createConfig();

      // Create a callback that takes some time to complete
      const slowCallback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      watchFile({ callback: slowCallback, config });

      // Set up the statSync call to always return a newer timestamp
      (fs.statSync as any).mockReturnValue({ mtimeMs: Date.now() });

      // Trigger multiple interval checks in quick succession
      vi.advanceTimersByTime(config.watch.interval);
      vi.advanceTimersByTime(config.watch.interval);
      vi.advanceTimersByTime(config.watch.interval);

      // Fast-forward time to let the first callback complete
      await vi.runAllTimersAsync();

      // The callback should only be invoked once because subsequent
      // checks should detect that it's still running
      expect(slowCallback).toHaveBeenCalledTimes(1);
    });

    it('does not start watching if the timeout is 0', () => {
      const config = createConfig({
        watch: { enabled: true, interval: 100, timeout: 0 },
      });

      watchFile({ callback: mockCallback, config, onTimeout: mockOnTimeout });

      expect(mockOnTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setInterval).not.toHaveBeenCalled();
    });
  });
});
