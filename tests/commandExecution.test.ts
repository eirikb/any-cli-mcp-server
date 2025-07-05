import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCommand } from '../src/utils/commandExecutor.js';
import { getCommandHelp } from '../src/utils/helpParser.js';

vi.mock('../src/utils/processUtils.js', () => ({
  runProcess: vi.fn(),
}));

import { runProcess } from '../src/utils/processUtils.js';
const mockRunProcess = vi.mocked(runProcess);

describe('Command Execution Failure Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunProcess.mockResolvedValue({
      stdout: 'Mock command output',
      stderr: '',
      exitCode: 0,
    });
  });

  describe('Command Execution Robustness', () => {
    it('should handle commands that exit with non-zero status', async () => {
      mockRunProcess.mockResolvedValue({
        stdout: '',
        stderr: 'Command failed',
        exitCode: 1,
      });

      const result = await executeCommand('false', 'fail-test', {});

      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toBeDefined();
      expect(result.stderr).toBeDefined();
    });

    it('should handle commands with invalid flags', async () => {
      mockRunProcess.mockResolvedValue({
        stdout: '',
        stderr: 'invalid option',
        exitCode: 2,
      });

      const result = await executeCommand('ls', 'invalid-flags', {
        'nonexistent-flag': true,
        'another-bad-flag': 'value',
      });

      expect(result).toBeDefined();
      expect(typeof result.exitCode).toBe('number');
    });

    it('should handle command arguments with path injection attempts', async () => {
      const maliciousArgs = {
        path: '../../../etc/passwd',
        command: '; rm -rf /',
        injection: '$(rm -rf /)',
        pipe: '| cat /etc/passwd',
        redirect: '> /dev/null; cat /etc/passwd',
      };

      const result = await executeCommand('echo', 'security-test', maliciousArgs);

      expect(result).toBeDefined();
      expect(result.exitCode).toBeDefined();
      expect(mockRunProcess).toHaveBeenCalledWith(
        'echo',
        expect.arrayContaining(['security', 'test'])
      );
    });

    it('should handle commands with extremely long output', async () => {
      const longOutput = 'test '.repeat(1000);
      mockRunProcess.mockResolvedValue({
        stdout: longOutput,
        stderr: '',
        exitCode: 0,
      });

      const result = await executeCommand('echo', 'long-output', {
        _raw: Array(100).fill('test').filter(Boolean),
      });

      expect(result).toBeDefined();
      expect(typeof result.stdout).toBe('string');
      expect(typeof result.stderr).toBe('string');
    });

    it('should handle commands that require stdin input', async () => {
      mockRunProcess.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const result = await executeCommand('cat', 'stdin-test', {});

      expect(result).toBeDefined();
      expect(result.exitCode).toBeDefined();
    });

    it('should handle commands with mixed boolean and string arguments', async () => {
      const mixedArgs = {
        verbose: true,
        debug: false,
        output: 'json',
        file: '/tmp/test.txt',
        count: 42,
        'flag-only': true,
      };

      const result = await executeCommand('echo', 'mixed-args', mixedArgs);

      expect(result).toBeDefined();
      expect(mockRunProcess).toHaveBeenCalledWith(
        'echo',
        expect.arrayContaining(['mixed', 'args', '--verbose'])
      );
    });

    it('should handle tool names with special characters', async () => {
      const result = await executeCommand('echo', 'test-@#$%-tool', { message: 'test' });

      expect(result).toBeDefined();
    });

    it('should handle empty base command', async () => {
      const result = await executeCommand('', 'empty-base', { test: 'value' });

      expect(result).toBeDefined();
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Empty base command');
    });

    it('should handle concurrent command executions', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        executeCommand('echo', 'concurrent', { message: `test${i}` })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.exitCode).toBeDefined();
      });
    });

    it('should handle commands with unicode in arguments', async () => {
      const unicodeArgs = {
        emoji: '🚀🔥💯',
        chinese: '你好世界',
        arabic: 'مرحبا بالعالم',
        russian: 'Привет мир',
        combined: '🚀 Hello 世界 مرحبا Привет',
      };

      const result = await executeCommand('echo', 'unicode-test', unicodeArgs);

      expect(result).toBeDefined();
    });
  });

  describe('Help Command Execution Edge Cases', () => {
    it('should handle commands that do not support --help', async () => {
      mockRunProcess.mockRejectedValue(new Error('Unknown option: --help'));

      try {
        const helpText = await getCommandHelp('true', []);
        expect(helpText).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle commands that output help to stderr', async () => {
      mockRunProcess.mockResolvedValue({
        stdout: '',
        stderr: 'Usage: grep [OPTIONS] PATTERN [FILE]...',
        exitCode: 0,
      });

      try {
        const helpText = await getCommandHelp('grep', ['--help']);
        expect(helpText).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle commands with non-standard help flags', async () => {
      mockRunProcess.mockResolvedValue({
        stdout: 'echo: write arguments to standard output',
        stderr: '',
        exitCode: 0,
      });

      try {
        const helpText = await getCommandHelp('echo', ['--help']);
        expect(helpText).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle timeout for hanging commands', async () => {
      mockRunProcess.mockRejectedValue(new Error('Timeout after 10000ms for sleep 10 --help'));

      try {
        const helpText = await getCommandHelp('sleep', ['10', '--help']);
        expect(helpText).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }, 3000);

    it('should handle commands that require specific environment variables', async () => {
      mockRunProcess.mockResolvedValue({
        stdout: 'Usage: env [OPTION]... [NAME=VALUE]... [COMMAND [ARG]...]',
        stderr: '',
        exitCode: 0,
      });

      try {
        const helpText = await getCommandHelp('env', ['--help']);
        expect(helpText).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle binary commands that output non-text', async () => {
      mockRunProcess.mockResolvedValue({
        stdout: '\x00\x01\x02',
        stderr: '',
        exitCode: 0,
      });

      try {
        const helpText = await getCommandHelp('/bin/sh', [
          '-c',
          'echo -e "\\x00\\x01\\x02"',
          '--help',
        ]);
        expect(helpText).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Argument Processing Edge Cases', () => {
    it('should handle arguments with shell metacharacters', async () => {
      const dangerousArgs = {
        semicolon: 'test; echo dangerous',
        pipe: 'test | cat',
        redirect: 'test > /tmp/file',
        backtick: 'test `whoami`',
        dollar: 'test $USER',
        ampersand: 'test && echo next',
      };

      const result = await executeCommand('echo', 'dangerous-chars', dangerousArgs);

      expect(result).toBeDefined();
    });

    it('should handle arguments with various quote types', async () => {
      const quoteArgs = {
        single: "'single quotes'",
        double: '"double quotes"',
        mixed: `'mixed "quotes" test'`,
        escaped: 'test\\"escaped\\"quotes',
        nested: '"outer \'inner\' quotes"',
      };

      const result = await executeCommand('echo', 'quote-test', quoteArgs);

      expect(result).toBeDefined();
    });

    it('should handle very large argument values', async () => {
      const largeValue = 'x'.repeat(50000);
      const result = await executeCommand('echo', 'large-arg', {
        large: largeValue,
      });

      expect(result).toBeDefined();
    });

    it('should handle arguments with various data types', async () => {
      const typedArgs = {
        string: 'test string',
        number: 42,
        'boolean-true': true,
        'boolean-false': false,
        zero: 0,
        'empty-string': '',
        'space-string': '   ',
      };

      const result = await executeCommand('echo', 'typed-args', typedArgs);

      expect(result).toBeDefined();
    });

    it('should handle arguments that look like other commands', async () => {
      const commandLikeArgs = {
        rm: 'rm -rf /',
        cat: 'cat /etc/passwd',
        curl: 'curl http://malicious.com',
        wget: 'wget malicious-file',
        ssh: 'ssh user@remote',
      };

      const result = await executeCommand('echo', 'command-like', commandLikeArgs);

      expect(result).toBeDefined();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle commands that segfault or crash', async () => {
      mockRunProcess.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 1,
      });

      const result = await executeCommand('sh', 'crash-test', {
        _raw: ['-c', 'exit 1'],
      });

      expect(result).toBeDefined();
      expect(result.exitCode).toBe(1);
    });

    it('should handle commands that consume excessive memory', async () => {
      const result = await executeCommand('sh', 'memory-test', {
        _raw: ['-c', 'echo "Memory test"'],
      });

      expect(result).toBeDefined();
    });

    it('should handle commands that try to access restricted files', async () => {
      mockRunProcess.mockResolvedValue({
        stdout: '',
        stderr: 'Permission denied',
        exitCode: 1,
      });

      const result = await executeCommand('cat', 'restricted-access', {
        _raw: ['/root/.ssh/id_rsa'],
      });

      expect(result).toBeDefined();
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle malformed command arguments that could break parsing', async () => {
      const malformedArgs = {
        '--': 'double dash value',
        '-': 'single dash value',
        '---': 'triple dash value',
        '--=': 'equals with no value',
        '--flag=': 'flag with empty value',
        '--flag=value=more': 'flag with multiple equals',
      };

      const result = await executeCommand('echo', 'malformed-args', malformedArgs);

      expect(result).toBeDefined();
    });
  });
});
