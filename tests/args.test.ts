import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/utils/args.js';

describe('parseArgs', () => {
  describe('cache-build argument parsing', () => {
    it('should pass all arguments after --cache-build as command', () => {
      const result = parseArgs(['--cache-build', 'mycli', 'somesubcommand', '--eh']);

      expect(result.cacheBuild).toBe(true);
      expect(result.command).toBe('mycli somesubcommand --eh');
      expect(result.cacheFile).toBe(null);
    });

    it('should handle --cache-file with --cache-build', () => {
      const result = parseArgs([
        '--cache-build',
        'mycli',
        'somesubcommand',
        '--eh',
        '--cache-file',
        'custom.json',
      ]);

      expect(result.cacheBuild).toBe(true);
      expect(result.command).toBe('mycli somesubcommand --eh');
      expect(result.cacheFile).toBe('custom.json');
    });

    it('should handle --cache-file before other arguments', () => {
      const result = parseArgs([
        '--cache-build',
        '--cache-file',
        'custom.json',
        'mycli',
        'somesubcommand',
        '--eh',
      ]);

      expect(result.cacheBuild).toBe(true);
      expect(result.command).toBe('mycli somesubcommand --eh');
      expect(result.cacheFile).toBe('custom.json');
    });

    it('should handle complex commands with multiple flags', () => {
      const result = parseArgs([
        '--cache-build',
        'docker',
        'run',
        '-it',
        '--rm',
        '-p',
        '8080:80',
        'nginx',
      ]);

      expect(result.cacheBuild).toBe(true);
      expect(result.command).toBe('docker run -it --rm -p 8080:80 nginx');
      expect(result.cacheFile).toBe(null);
    });

    it('should handle empty command after --cache-build', () => {
      const result = parseArgs(['--cache-build']);

      expect(result.cacheBuild).toBe(true);
      expect(result.command).toBe(undefined);
      expect(result.cacheFile).toBe(null);
    });

    it('should handle single word command', () => {
      const result = parseArgs(['--cache-build', 'ls']);

      expect(result.cacheBuild).toBe(true);
      expect(result.command).toBe('ls');
      expect(result.cacheFile).toBe(null);
    });
  });

  describe('regular argument parsing', () => {
    it('should handle command without cache-build', () => {
      const result = parseArgs(['git']);

      expect(result.cacheBuild).toBe(false);
      expect(result.command).toBe('git');
      expect(result.cacheFile).toBe(null);
    });

    it('should handle command with cache-file', () => {
      const result = parseArgs(['git', '--cache-file', 'custom.json']);

      expect(result.cacheBuild).toBe(false);
      expect(result.command).toBe('git');
      expect(result.cacheFile).toBe('custom.json');
    });

    it('should detect cache file from filename pattern', () => {
      const result = parseArgs(['git_cache.json']);

      expect(result.cacheBuild).toBe(false);
      expect(result.command).toBe(undefined);
      expect(result.cacheFile).toBe('git_cache.json');
    });
  });
});
