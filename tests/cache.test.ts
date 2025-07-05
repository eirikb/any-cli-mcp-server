import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { saveCommandCache, loadCommandCache, getCacheFileName } from '../src/utils/cache.js';
import { CliCommand } from '../src/types/cli.js';

describe('Cache System', () => {
  const testCacheFile = 'test_cache.json';
  const testCommand = 'test-cmd';
  const testData: CliCommand = {
    name: 'test-cmd',
    description: 'Test command',
    subcommands: [
      {
        name: 'subcmd',
        description: 'Test subcommand',
        subcommands: [],
        options: [],
        arguments: [],
      },
    ],
    options: [
      {
        name: '--help',
        shortName: '-h',
        description: 'Show help',
        valueRequired: false,
      },
    ],
    arguments: [],
  };

  afterEach(() => {
    if (existsSync(testCacheFile)) {
      unlinkSync(testCacheFile);
    }
  });

  it('should save and load cache correctly', () => {
    saveCommandCache(testCommand, testData, testCacheFile);
    expect(existsSync(testCacheFile)).toBe(true);

    const loaded = loadCommandCache(testCacheFile);
    expect(loaded).not.toBeNull();
    expect(loaded?.command).toBe(testCommand);
    expect(loaded?.data.name).toBe(testData.name);
    expect(loaded?.data.description).toBe(testData.description);
    expect(loaded?.data.subcommands).toHaveLength(1);
    expect(loaded?.data.options).toHaveLength(1);
    expect(loaded?.timestamp).toBeTypeOf('number');
  });

  it('should return null for non-existent cache file', () => {
    const result = loadCommandCache('non-existent-file.json');
    expect(result).toBeNull();
  });

  it('should return null for invalid cache file', () => {
    writeFileSync(testCacheFile, 'invalid json');

    const result = loadCommandCache(testCacheFile);
    expect(result).toBeNull();
  });

  it('should generate valid cache file names', () => {
    expect(getCacheFileName('gh')).toBe('gh_cache.json');
    expect(getCacheFileName('az')).toBe('az_cache.json');
    expect(getCacheFileName('some-cmd')).toBe('some-cmd_cache.json');
    expect(getCacheFileName('cmd with spaces')).toBe('cmd_with_spaces_cache.json');
    expect(getCacheFileName('cmd/with/slashes')).toBe('cmd_with_slashes_cache.json');
  });

  it('should handle cache with missing required fields', () => {
    const invalidCache = { command: 'test', data: null };
    writeFileSync(testCacheFile, JSON.stringify(invalidCache));

    const result = loadCommandCache(testCacheFile);
    expect(result).toBeNull();
  });
});
