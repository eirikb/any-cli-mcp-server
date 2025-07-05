import { existsSync, readFileSync, writeFileSync } from 'fs';
import { CliCommand } from '../types/cli.js';
import { createLogger } from './logger.js';

export interface CommandCache {
  command: string;
  timestamp: number;
  data: CliCommand;
}

export function saveCommandCache(command: string, data: CliCommand, cacheFile: string): void {
  const logger = createLogger({ prefix: 'cache' });
  const cache: CommandCache = {
    command,
    timestamp: Date.now(),
    data,
  };

  try {
    writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

    const totalCommands = countCommands(data);
    const fileSizeKB = (Buffer.byteLength(JSON.stringify(cache)) / 1024).toFixed(1);

    logger.info(`Cache saved to ${cacheFile}`);
    logger.info(`  File size: ${fileSizeKB} KB`);
    logger.info(`  Total commands cached: ${totalCommands}`);
  } catch (error) {
    logger.error(`Failed to save cache: ${error}`);
    throw error;
  }
}

function countCommands(command: CliCommand): number {
  let count = 1;
  for (const subcommand of command.subcommands) {
    count += countCommands(subcommand);
  }
  return count;
}

export function loadCommandCache(cacheFile: string): CommandCache | null {
  const logger = createLogger({ prefix: 'cache' });

  if (!existsSync(cacheFile)) {
    return null;
  }

  try {
    const content = readFileSync(cacheFile, 'utf-8');
    const cache = JSON.parse(content) as CommandCache;

    if (!cache.command || !cache.data || typeof cache.timestamp !== 'number') {
      logger.error('Invalid cache file format');
      return null;
    }

    logger.info(
      `Loaded cache for ${cache.command} (created ${new Date(cache.timestamp).toISOString()})`
    );
    return cache;
  } catch (error) {
    logger.error(`Failed to load cache: ${error}`);
    return null;
  }
}

export function getCacheFileName(command: string): string {
  const sanitized = command.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${sanitized}_cache.json`;
}
