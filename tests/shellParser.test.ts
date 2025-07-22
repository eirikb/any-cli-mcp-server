// Generated tests
import { describe, it, expect } from 'vitest';
import { parse } from 'shell-quote';

// Wrapper to match our previous interface
function parseShellCommand(command: string): string[] {
  const parsed = parse(command);
  // Filter out only string arguments, ignore shell operators/functions
  return parsed.filter((arg): arg is string => typeof arg === 'string');
}

describe('parseShellCommand', () => {
  describe('Basic parsing', () => {
    it('should parse simple commands', () => {
      expect(parseShellCommand('ls -la')).toEqual(['ls', '-la']);
      expect(parseShellCommand('git status')).toEqual(['git', 'status']);
    });

    it('should handle empty strings', () => {
      expect(parseShellCommand('')).toEqual([]);
      expect(parseShellCommand('   ')).toEqual([]);
    });

    it('should handle single arguments', () => {
      expect(parseShellCommand('help')).toEqual(['help']);
    });

    it('should handle multiple spaces between arguments', () => {
      expect(parseShellCommand('git   log    --oneline')).toEqual(['git', 'log', '--oneline']);
    });
  });

  describe('Quoted arguments', () => {
    it('should handle double quoted arguments', () => {
      expect(parseShellCommand('git commit -m "Initial commit"')).toEqual([
        'git',
        'commit',
        '-m',
        'Initial commit',
      ]);
    });

    it('should handle single quoted arguments', () => {
      expect(parseShellCommand("git commit -m 'Fix bug #123'")).toEqual([
        'git',
        'commit',
        '-m',
        'Fix bug #123',
      ]);
    });

    it('should handle arguments with spaces in quotes', () => {
      expect(parseShellCommand('cp "file with spaces.txt" dest/')).toEqual([
        'cp',
        'file with spaces.txt',
        'dest/',
      ]);
    });

    it('should handle empty quoted arguments', () => {
      expect(parseShellCommand('command ""')).toEqual(['command', '']);
      expect(parseShellCommand("command ''")).toEqual(['command', '']);
    });

    it('should handle mixed quote types', () => {
      expect(parseShellCommand('command "double quotes" \'single quotes\'')).toEqual([
        'command',
        'double quotes',
        'single quotes',
      ]);
    });
  });

  describe('Escaped characters', () => {
    it('should handle escaped quotes', () => {
      expect(parseShellCommand('echo "He said \\"Hello\\""')).toEqual(['echo', 'He said "Hello"']);
    });

    it('should handle escaped spaces', () => {
      expect(parseShellCommand('ls file\\ with\\ spaces')).toEqual(['ls', 'file with spaces']);
    });

    it('should handle escaped backslashes', () => {
      expect(parseShellCommand('echo "\\\\"')).toEqual(['echo', '\\']);
    });
  });

  describe('Complex CLI scenarios', () => {
    it('should handle Azure CLI commands with complex arguments', () => {
      expect(
        parseShellCommand(
          'az vm create --name "test vm" --resource-group rg1 --tags "Environment=test" "Project=demo"'
        )
      ).toEqual([
        'az',
        'vm',
        'create',
        '--name',
        'test vm',
        '--resource-group',
        'rg1',
        '--tags',
        'Environment=test',
        'Project=demo',
      ]);
    });

    it('should handle git commands with commit messages containing special characters', () => {
      expect(
        parseShellCommand('git commit -m "Fix: Handle edge cases in CLI parsing (#123)"')
      ).toEqual(['git', 'commit', '-m', 'Fix: Handle edge cases in CLI parsing (#123)']);
    });

    it('should handle kubectl commands with JSON values', () => {
      expect(
        parseShellCommand('kubectl patch deployment app --patch \'{"spec": {"replicas": 3}}\'')
      ).toEqual(['kubectl', 'patch', 'deployment', 'app', '--patch', '{"spec": {"replicas": 3}}']);
    });

    it('should handle Docker commands with environment variables', () => {
      expect(
        parseShellCommand('docker run -e "DB_HOST=localhost" -e "DB_PORT=5432" image')
      ).toEqual(['docker', 'run', '-e', 'DB_HOST=localhost', '-e', 'DB_PORT=5432', 'image']);
    });

    it('should handle curl commands with data payloads', () => {
      expect(
        parseShellCommand(
          'curl -X POST -H "Content-Type: application/json" -d \'{"name": "test"}\' http://api.example.com'
        )
      ).toEqual([
        'curl',
        '-X',
        'POST',
        '-H',
        'Content-Type: application/json',
        '-d',
        '{"name": "test"}',
        'http://api.example.com',
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should handle unclosed quotes gracefully', () => {
      // shell-quote treats unclosed quotes as if the quotes don't exist
      expect(parseShellCommand('echo "unclosed quote')).toEqual(['echo', 'unclosed', 'quote']);
      expect(parseShellCommand("echo 'unclosed quote")).toEqual(['echo', 'unclosed', 'quote']);
    });

    it('should handle nested quotes', () => {
      expect(parseShellCommand('echo "outer \'inner\' quotes"')).toEqual([
        'echo',
        "outer 'inner' quotes",
      ]);
      expect(parseShellCommand('echo \'outer "inner" quotes\'')).toEqual([
        'echo',
        'outer "inner" quotes',
      ]);
    });

    it('should handle special characters', () => {
      expect(parseShellCommand('find . -name "*.txt" -exec grep "pattern" {} \\;')).toEqual([
        'find',
        '.',
        '-name',
        '*.txt',
        '-exec',
        'grep',
        'pattern',
        '{}',
        ';',
      ]);
    });

    it('should handle Unicode characters', () => {
      expect(parseShellCommand('echo "Hello 世界 🌍"')).toEqual(['echo', 'Hello 世界 🌍']);
    });

    it('should handle tabs and other whitespace', () => {
      expect(parseShellCommand('command\t\targ1\t\targ2')).toEqual(['command', 'arg1', 'arg2']);
      expect(parseShellCommand('command\narg1\narg2')).toEqual(['command', 'arg1', 'arg2']);
    });
  });
});
