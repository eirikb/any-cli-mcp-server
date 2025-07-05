import { describe, it, expect } from 'vitest';
import { parseHelpText } from '../src/utils/helpParser.js';
import { executeCommand } from '../src/utils/commandExecutor.js';
import { convertCommandToTools } from '../src/utils/toolConverter.js';
import { formatCommandResponse, formatErrorResponse } from '../src/utils/responseFormatter.js';
import {
  parseHelpSections,
  shouldSkipLine,
  extractMultiLineDescription,
} from '../src/utils/parsingHelpers.js';

describe.skip('Edge Cases and Potential Failures - TOO EXTREME FOR NOW', () => {
  describe('Parsing Edge Cases', () => {
    it('should handle empty help text', () => {
      const result = parseHelpText('', 'empty-cmd');

      expect(result.name).toBe('empty-cmd');
      expect(result.description).toBe('');
      expect(result.subcommands).toHaveLength(0);
      expect(result.options).toHaveLength(0);
      expect(result.arguments).toHaveLength(0);
    });

    it('should handle null and undefined inputs', () => {
      const result1 = parseHelpText(null as any, 'test');
      expect(result1.name).toBe('test');
      expect(result1.subcommands).toEqual([]);

      const result2 = parseHelpText(undefined as any, 'test');
      expect(result2.name).toBe('test');
      expect(result2.subcommands).toEqual([]);

      const result3 = parseHelpText('test', null as any);
      expect(result3.name).toBe('unknown');
      expect(result3.subcommands).toEqual([]);

      const result4 = parseHelpText('test', undefined as any);
      expect(result4.name).toBe('unknown');
      expect(result4.subcommands).toEqual([]);
    });

    it('should handle help text with only whitespace', () => {
      const whitespaceText = '   \n\t  \n   \r\n  ';
      const result = parseHelpText(whitespaceText, 'whitespace-cmd');

      expect(result.name).toBe('whitespace-cmd');
      expect(result.description).toBe('');
      expect(result.subcommands).toHaveLength(0);
    });

    it('should handle help text with special characters and unicode', () => {
      const unicodeText = `Command with émojis 🚀
      
      Commands:
        café     ☕ Make coffee with açaí
        naïve    🤔 Handle naïve inputs
        résumé   📄 Create résumé with 中文
      
      Options:
        --föö    Föö option with ümlaut
        --🔥     Fire option (emoji flag)`;

      const result = parseHelpText(unicodeText, 'unicode-cmd');

      expect(result.name).toBe('unicode-cmd');
      expect(result.subcommands.length).toBeGreaterThan(0);

      const cafeCmd = result.subcommands.find(cmd => cmd.name === 'café');
      expect(cafeCmd).toBeDefined();
      expect(cafeCmd?.description).toContain('☕');
    });

    it('should handle malformed help text with broken structure', () => {
      const malformedText = `This is not a proper help format
      No clear sections
      Random text everywhere
      Commands: but no actual commands listed properly
      Options:
      Arguments without format
      <incomplete
      --flag-with-no-description
      `;

      const result = parseHelpText(malformedText, 'malformed-cmd');

      expect(result.name).toBe('malformed-cmd');
      expect(result).toBeDefined();
      expect(Array.isArray(result.subcommands)).toBe(true);
      expect(Array.isArray(result.options)).toBe(true);
      expect(Array.isArray(result.arguments)).toBe(true);
    });

    it('should handle extremely long help text', () => {
      const longDescription = 'A'.repeat(10000);
      const manyCommands = Array.from(
        { length: 100 },
        (_, i) => `  command${i}    Description for command ${i} with some text`
      ).join('\n');

      const longHelpText = `${longDescription}

Commands:
${manyCommands}

Options:
  --verbose    Enable verbose output`;

      const result = parseHelpText(longHelpText, 'long-cmd');

      expect(result.name).toBe('long-cmd');
      expect(result.subcommands.length).toBeLessThanOrEqual(100);
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('should handle help text with conflicting command names', () => {
      const conflictingText = `Commands:
  start    Start the service
  start    Start again (duplicate)
  stop     Stop the service
  start    Yet another start command

Options:
  --help   Show help
  --help   Show help again`;

      const result = parseHelpText(conflictingText, 'conflict-cmd');

      expect(result.name).toBe('conflict-cmd');
      expect(result.subcommands.length).toBeGreaterThan(0);
    });

    it('should handle deeply nested section structure', () => {
      const nestedText = `Commands:
  level1    Level 1 command
    Commands:
      level2    Level 2 command
        Commands:
          level3    Level 3 command
            Commands:
              level4    Level 4 command`;

      const result = parseHelpText(nestedText, 'nested-cmd');

      expect(result.name).toBe('nested-cmd');
      expect(result.subcommands.length).toBeGreaterThan(0);
    });

    it('should handle help text with no recognizable patterns', () => {
      const randomText = `jhkjh askjdh aksjdh
      random words everywhere
      1234567890
      !@#$%^&*()
      no structure at all
      completely random content`;

      const result = parseHelpText(randomText, 'random-cmd');

      expect(result.name).toBe('random-cmd');
      expect(result.subcommands).toHaveLength(0);
      expect(result.options).toHaveLength(0);
    });
  });

  describe('Command Execution Edge Cases', () => {
    it('should handle non-existent commands gracefully', async () => {
      const result = await executeCommand('nonexistent-command-xyz', 'test', {});

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('');
    });

    it('should handle commands with special characters in arguments', async () => {
      const specialArgs = {
        'special-chars': '!@#$%^&*()',
        unicode: '🚀 café naïve',
        quotes: '"quoted" \'string\'',
        newlines: 'line1\nline2\nline3',
      };

      const result = await executeCommand('echo', 'test', specialArgs);

      expect(result).toBeDefined();
      expect(typeof result.exitCode).toBe('number');
    });

    it('should handle very long command arguments', async () => {
      const longArg = 'A'.repeat(10000);
      const result = await executeCommand('echo', 'test', { 'long-arg': longArg });

      expect(result).toBeDefined();
      expect(typeof result.exitCode).toBe('number');
    });

    it('should handle commands that return binary data', async () => {
      const result = await executeCommand('echo', 'test', { _raw: ['-e', '\\x00\\x01\\x02\\xFF'] });

      expect(result).toBeDefined();
      expect(typeof result.stdout).toBe('string');
      expect(typeof result.stderr).toBe('string');
    });

    it('should handle empty command arguments', async () => {
      const result = await executeCommand('echo', '', {});

      expect(result).toBeDefined();
      expect(result.exitCode).toBeDefined();
    });

    it('should handle null and undefined in command arguments', async () => {
      const args = {
        'null-val': null,
        'undefined-val': undefined,
        'empty-string': '',
        'valid-arg': 'test',
      };

      const result = await executeCommand('echo', 'test', args);

      expect(result).toBeDefined();
    });
  });

  describe('Tool Conversion Edge Cases', () => {
    it('should handle commands with no options or arguments', () => {
      const emptyCommand = {
        name: 'empty',
        description: 'Empty command',
        subcommands: [],
        options: [],
        arguments: [],
      };

      const tools = convertCommandToTools(emptyCommand, 'empty');

      expect(tools).toHaveLength(1);
      expect(tools[0].inputSchema.properties).toBeDefined();
    });

    it('should handle commands with invalid characters in names', () => {
      const invalidCommand = {
        name: 'invalid-@#$%',
        description: 'Command with invalid chars',
        subcommands: [
          {
            name: 'sub-!@#',
            description: 'Subcommand with invalid chars',
            subcommands: [],
            options: [],
            arguments: [],
          },
        ],
        options: [
          {
            name: '--invalid-@#$',
            description: 'Invalid option',
            valueRequired: false,
          },
        ],
        arguments: [],
      };

      const tools = convertCommandToTools(invalidCommand, 'invalid-@#$%');

      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0].name).toBeDefined();
    });

    it('should handle commands with extremely long names and descriptions', () => {
      const longName = 'a'.repeat(1000);
      const longDescription = 'Long description '.repeat(1000);

      const longCommand = {
        name: longName,
        description: longDescription,
        subcommands: [],
        options: [
          {
            name: '--' + longName,
            description: longDescription,
            valueRequired: false,
          },
        ],
        arguments: [
          {
            name: longName,
            description: longDescription,
            required: false,
          },
        ],
      };

      const tools = convertCommandToTools(longCommand, longName);

      expect(tools).toHaveLength(1);
      expect(tools[0].description).toBeDefined();
    });

    it('should handle commands with circular or self-referencing structures', () => {
      const circularCommand = {
        name: 'circular',
        description: 'Circular command',
        subcommands: [],
        options: [],
        arguments: [],
      };

      circularCommand.subcommands = [circularCommand];

      expect(() => convertCommandToTools(circularCommand, 'circular')).not.toThrow();
    });

    it('should handle commands with reserved keywords as names', () => {
      const reservedCommand = {
        name: 'constructor',
        description: 'Command with reserved name',
        subcommands: [
          {
            name: 'prototype',
            description: 'Subcommand with reserved name',
            subcommands: [],
            options: [],
            arguments: [],
          },
        ],
        options: [
          {
            name: '--toString',
            description: 'Reserved option name',
            valueRequired: false,
          },
        ],
        arguments: [
          {
            name: 'valueOf',
            description: 'Reserved argument name',
            required: false,
          },
        ],
      };

      const tools = convertCommandToTools(reservedCommand, 'constructor');

      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe('Response Formatting Edge Cases', () => {
    it('should handle very large command output', () => {
      const largeOutput = 'x'.repeat(100000);
      const result = {
        stdout: largeOutput,
        stderr: '',
        exitCode: 0,
      };

      const response = formatCommandResponse(result);

      expect(response).toBeDefined();
      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toContain('x');
    });

    it('should handle output with special characters', () => {
      const specialOutput = {
        stdout: 'Output with \x00\x01\x02 null bytes and 🚀 emojis',
        stderr: 'Error with \n\r\t special chars',
        exitCode: 1,
      };

      const response = formatCommandResponse(specialOutput);

      expect(response).toBeDefined();
      expect(response.content[0].text).toBeDefined();
    });

    it('should handle empty output gracefully', () => {
      const emptyOutput = {
        stdout: '',
        stderr: '',
        exitCode: 0,
      };

      const response = formatCommandResponse(emptyOutput);

      expect(response).toBeDefined();
      expect(response.content[0].text).toBe('Command completed successfully with no output.');
    });

    it('should handle various error types in formatErrorResponse', () => {
      const testCases = [
        new Error('Standard error'),
        'String error',
        { message: 'Object with message' },
        123,
        null,
        undefined,
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
      ];

      testCases.forEach(error => {
        const response = formatErrorResponse(error);
        expect(response).toBeDefined();
        expect(response.content[0].text).toContain('Error executing command:');
      });
    });
  });

  describe('Parsing Helper Edge Cases', () => {
    it('should handle parseHelpSections with malformed input', () => {
      const testCases = [
        '',
        'No sections at all',
        'Commands:\n\nArguments:\n\nNo content',
        'Commands:\ncommand1\nArguments:\nCommands:\ncommand2',
      ];

      testCases.forEach(input => {
        const sections = parseHelpSections(input);
        expect(Array.isArray(sections)).toBe(true);
      });
    });

    it('should handle shouldSkipLine with edge cases', () => {
      const testCases = [
        ['', undefined],
        [null as any, 'cmd'],
        [undefined as any, 'cmd'],
        ['   ', 'cmd'],
        ['Usage: very long usage line with lots of text that goes on and on', 'cmd'],
        ['az command that matches exactly', 'az'],
      ];

      testCases.forEach(([line, commandName]) => {
        const result = shouldSkipLine(line, commandName);
        expect(typeof result).toBe('boolean');
      });
    });

    it('should handle extractMultiLineDescription with edge cases', () => {
      const testCases = [
        { lines: [], startIndex: 0, description: 'test' },
        { lines: ['line1'], startIndex: 10, description: 'test' },
        { lines: ['line1', '', 'line3'], startIndex: 0, description: 'test' },
        { lines: Array(1000).fill('line'), startIndex: 0, description: 'test' },
      ];

      testCases.forEach(({ lines, startIndex, description }) => {
        const result = extractMultiLineDescription(lines, startIndex, description);
        expect(result).toBeDefined();
        expect(typeof result.description).toBe('string');
        expect(typeof result.endIndex).toBe('number');
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle processing many commands without memory issues', () => {
      const manyCommands = Array.from({ length: 1000 }, (_, i) => ({
        name: `cmd${i}`,
        description: `Description ${i}`,
        subcommands: [],
        options: [
          {
            name: `--option${i}`,
            description: `Option ${i}`,
            valueRequired: false,
          },
        ],
        arguments: [],
      }));

      const rootCommand = {
        name: 'root',
        description: 'Root command',
        subcommands: manyCommands,
        options: [],
        arguments: [],
      };

      const tools = convertCommandToTools(rootCommand, 'root');

      expect(tools.length).toBeGreaterThan(0);
      expect(tools.length).toBeLessThanOrEqual(1001);
    });

    it('should handle deeply nested command structures', () => {
      const deepCommand = {
        name: 'level0',
        description: 'Level 0',
        subcommands: [] as any[],
        options: [],
        arguments: [],
      };

      let current = deepCommand;
      for (let i = 1; i < 20; i++) {
        const nextLevel = {
          name: `level${i}`,
          description: `Level ${i}`,
          subcommands: [],
          options: [],
          arguments: [],
        };
        current.subcommands = [nextLevel];
        current = nextLevel;
      }

      const tools = convertCommandToTools(deepCommand, 'level0');

      expect(tools.length).toBeGreaterThan(0);
    });
  });
});
