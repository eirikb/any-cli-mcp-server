import { spawn } from 'child_process';
import { setTimeout, clearTimeout } from 'timers';
import { CommandResult } from '../types/cli.js';

export interface ProcessOptions {
  timeout?: number;
  env?: Record<string, string>;
}

export function runProcess(
  command: string,
  args: string[],
  options: ProcessOptions = {}
): Promise<CommandResult> {
  return new Promise(resolve => {
    const { timeout = 10000, env = process.env } = options;

    const timeoutHandle = setTimeout(() => {
      resolve({
        stdout: '',
        stderr: `Timeout after ${timeout}ms for ${command} ${args.join(' ')}`,
        exitCode: -1,
      });
    }, timeout);

    let stdout = '';
    let stderr = '';

    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...env, LANG: 'C' },
    });

    proc.stdout.on('data', data => {
      stdout += data.toString();
    });

    proc.stderr.on('data', data => {
      stderr += data.toString();
    });

    proc.on('close', code => {
      clearTimeout(timeoutHandle);
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });

    proc.on('error', err => {
      clearTimeout(timeoutHandle);
      resolve({
        stdout,
        stderr: err.message,
        exitCode: -1,
      });
    });
  });
}
