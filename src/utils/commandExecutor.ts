import { toKebabCase } from './parsingHelpers.js';
import { CommandResult } from '../types/cli.js';
import { runProcess } from './processUtils.js';

export async function executeCommand(
  baseCommand: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<CommandResult> {
  if (!baseCommand || baseCommand.trim() === '') {
    return {
      stdout: '',
      stderr: 'Error: Empty base command provided',
      exitCode: 1,
    };
  }

  if (args._raw && Array.isArray(args._raw)) {
    return runProcess(baseCommand, args._raw);
  }

  const commandParts = toolName.split('-');
  const cmdArgs: string[] = [];

  if (commandParts.length > 0 && commandParts[0] !== baseCommand) {
    cmdArgs.push(...commandParts);
  }

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;

    const flagName = toKebabCase(key);

    if (typeof value === 'boolean') {
      addBooleanFlag(cmdArgs, key, flagName, value);
    } else {
      addValuedOption(cmdArgs, key, flagName, String(value));
    }
  }

  return runProcess(baseCommand, cmdArgs);
}

function addBooleanFlag(cmdArgs: string[], key: string, flagName: string, value: boolean): void {
  if (value) {
    if (key.length === 1) {
      cmdArgs.push(`-${key}`);
    } else {
      cmdArgs.push(`--${flagName}`);
    }
  }
}

function addValuedOption(cmdArgs: string[], key: string, flagName: string, value: string): void {
  if (key.length === 1) {
    cmdArgs.push(`-${key}`, value);
  } else if (isPositionalArg(key)) {
    cmdArgs.push(value);
  } else {
    cmdArgs.push(`--${flagName}`, value);
  }
}

function isPositionalArg(key: string): boolean {
  return (
    !key.match(/^(is|has|with|no|enable|disable)/i) &&
    !key.includes('_') &&
    key.length > 1 &&
    key !== key.toUpperCase()
  );
}
