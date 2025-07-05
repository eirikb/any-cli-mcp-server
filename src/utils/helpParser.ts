import parseHelp from 'parse-help';
import { CliCommand, CliOption, CliArgument } from '../types/cli.js';
import {
  PATTERNS,
  parseHelpSections,
  extractMultiLineDescription,
  cleanDescription,
} from './parsingHelpers.js';
import { runProcess } from './processUtils.js';
import { validateCommandName } from './validation.js';
import { createLogger } from './logger.js';

export async function getCommandHelp(command: string, args: string[] = []): Promise<string> {
  const helpArgs = [...args, '--help'];

  try {
    const result = await runProcess(command, helpArgs);
    if (result.stdout || result.stderr) {
      return result.stdout || result.stderr;
    }
    throw new Error(`Failed to get help for ${command} ${args.join(' ')}`);
  } catch (error) {
    throw new Error(`Error getting help for ${command} ${args.join(' ')}: ${error}`);
  }
}

export function parseHelpText(helpText: string, commandName: string): CliCommand {
  const logger = createLogger({ prefix: 'parser' });

  if (!helpText || !commandName) {
    return {
      name: commandName || 'unknown',
      description: '',
      subcommands: [],
      options: [],
      arguments: [],
    };
  }
  try {
    const parsed = parseHelp(helpText);

    const options: CliOption[] = [];
    if (parsed.flags) {
      for (const [flagName, flagData] of Object.entries(parsed.flags)) {
        options.push({
          name: `--${flagName}`,
          shortName: flagData.alias ? `-${flagData.alias}` : undefined,
          description: flagData.description || '',
          valueRequired: flagData.type !== 'boolean' && flagData.type !== undefined,
          valueName: flagData.type === 'string' ? 'value' : undefined,
        });
      }
    }

    return {
      name: commandName,
      description: parsed.description || extractDescription(helpText, commandName),
      subcommands: parseSubcommandsFromText(helpText),
      options,
      arguments: parseArgumentsFromText(helpText),
    };
  } catch (error) {
    logger.error(`Error parsing help for ${commandName}:`, error);
    return {
      name: commandName,
      description: extractDescription(helpText, commandName),
      subcommands: parseSubcommandsFromText(helpText),
      options: [],
      arguments: parseArgumentsFromText(helpText),
    };
  }
}

function extractDescription(helpText: string, commandName: string): string {
  if (!helpText) return '';
  const lines = helpText.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed === 'Group' || trimmed === 'Command') {
      continue;
    }

    if (commandName && trimmed.startsWith(commandName)) {
      continue;
    }

    if (
      trimmed.startsWith('Usage:') ||
      trimmed.startsWith('Options:') ||
      trimmed.startsWith('Commands:')
    ) {
      continue;
    }

    if (trimmed) {
      return trimmed;
    }
  }

  return '';
}

function parseSubcommandsFromText(helpText: string): CliCommand[] {
  if (!helpText) return [];

  if (isTerminalCommand(helpText)) {
    return [];
  }

  const sections = parseHelpSections(helpText);
  const subcommands: CliCommand[] = [];

  const commandSections = sections.filter(s => {
    const name = s.name.toLowerCase();
    return name.includes('command') || name.includes('subgroup') || name === 'subgroups';
  });

  for (const section of commandSections) {
    for (let i = 0; i < section.content.length; i++) {
      const line = section.content[i];
      const match = line.match(PATTERNS.COMMAND_ENTRY);

      if (match) {
        const commandName = match[1];
        if (!validateCommandName(commandName)) {
          continue;
        }

        const description = cleanDescription(match[2].trim());
        const { description: fullDescription, endIndex } = extractMultiLineDescription(
          section.content,
          i,
          description
        );

        subcommands.push({
          name: commandName,
          description: fullDescription,
          subcommands: [],
          options: [],
          arguments: [],
        });

        i = endIndex;
      }
    }
  }

  return subcommands;
}

function parseArgumentsFromText(helpText: string): CliArgument[] {
  if (!helpText) return [];
  const sections = parseHelpSections(helpText);
  const args: CliArgument[] = [];

  const argSections = sections.filter(s => s.name.includes('argument') || s.name === 'args');

  for (const section of argSections) {
    for (const line of section.content) {
      const match = line.match(PATTERNS.ARGUMENT_ENTRY);
      if (match) {
        args.push({
          name: match[1],
          description: match[2].trim(),
          required: line.includes('<'),
        });
      }
    }
  }

  return args;
}

function isTerminalCommand(helpText: string): boolean {
  const hasCommandSections = PATTERNS.COMMAND_SECTION.test(helpText);

  if (hasCommandSections) {
    return false;
  }

  const terminalPatterns = [/Usage:.*\n.*Flags:/s, /^Command\s*\n\s+\w+(\s+\w+)+\s+/m];

  return terminalPatterns.some(pattern => pattern.test(helpText));
}

export async function discoverAllCommands(
  baseCommand: string,
  maxDepth: number = 2
): Promise<CliCommand> {
  const discovered = new Map<string, CliCommand>();
  let totalDiscovered = 0;
  const logger = createLogger({ prefix: 'discovery' });

  async function discover(command: string, args: string[], depth: number): Promise<CliCommand> {
    const key = `${command} ${args.join(' ')}`.trim();

    if (discovered.has(key) || depth > maxDepth) {
      return (
        discovered.get(key) || {
          name: args[args.length - 1] || command,
          description: '',
          subcommands: [],
          options: [],
          arguments: [],
        }
      );
    }

    try {
      const helpText = await getCommandHelp(command, args);
      const commandNameForParsing = depth === 0 ? command : args[args.length - 1] || command;
      const parsedCommand = parseHelpText(helpText, commandNameForParsing);
      discovered.set(key, parsedCommand);
      totalDiscovered++;

      if (totalDiscovered % 10 === 0) {
        logger.progress(`Progress: ${totalDiscovered} commands discovered...`);
      }

      if (depth < maxDepth) {
        const concurrencyLimit = 20;
        const batches = [];

        for (let i = 0; i < parsedCommand.subcommands.length; i += concurrencyLimit) {
          const batch = parsedCommand.subcommands.slice(i, i + concurrencyLimit);
          batches.push(batch);
        }

        for (const batch of batches) {
          const subcommandPromises = batch.map(async subcommand => {
            const subArgs = [...args, subcommand.name];
            const commandPath = [command, ...subArgs].join(' ');
            logger.progress(`Discovering: ${commandPath}`);
            const subParsed = await discover(command, subArgs, depth + 1);

            subcommand.subcommands = subParsed.subcommands;
            subcommand.options = subParsed.options;
            subcommand.arguments = subParsed.arguments;
            if (!subcommand.description && subParsed.description) {
              subcommand.description = subParsed.description;
            }
            return subcommand;
          });

          await Promise.all(subcommandPromises);
        }
      }

      return parsedCommand;
    } catch {
      return {
        name: args[args.length - 1] || command,
        description: '',
        subcommands: [],
        options: [],
        arguments: [],
      };
    }
  }

  const result = await discover(baseCommand, [], 0);
  logger.progress(`Total commands discovered: ${totalDiscovered}`);
  return result;
}
