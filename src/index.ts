#!/usr/bin/env node

import { parseArgs } from './utils/args.js';
import { startMcpServer } from './mcp/server.js';
import { discoverAllCommands } from './utils/helpParser.js';
import { saveCommandCache, getCacheFileName, loadCommandCache } from './utils/cache.js';
import { createLogger } from './utils/logger.js';

async function main() {
  const { command, cacheBuild, cacheFile } = parseArgs(process.argv.slice(2));
  const logger = createLogger({ prefix: 'any-cli-mcp' });

  if (cacheBuild) {
    if (!command) {
      logger.error('Error: Command is required with --cache-build');
      logger.error('Example: npx any-cli-mcp-server --cache-build <command>');
      process.exit(1);
    }

    logger.info(`Building cache for ${command}...`);
    logger.info(`This will discover commands at up to 3 levels deep`);

    const startTime = Date.now();
    const rootCommand = await discoverAllCommands(command, 3);
    const endTime = Date.now();

    const outputFile = cacheFile || getCacheFileName(command);
    saveCommandCache(command, rootCommand, outputFile);

    const duration = ((endTime - startTime) / 1000).toFixed(1);
    logger.info(`Cache built successfully in ${duration}s: ${outputFile}`);
    process.exit(0);
  }

  let commandToUse = command;
  if (cacheFile && !command) {
    const cache = loadCommandCache(cacheFile);
    if (!cache) {
      logger.error(`Error: Could not load cache file: ${cacheFile}`);
      process.exit(1);
    }
    commandToUse = cache.command;
    logger.info(`Using command '${commandToUse}' from cache file`);
  }

  if (!commandToUse) {
    logger.error('Usage: npx any-cli-mcp-server <command> [--cache-file <file>]');
    logger.error('       npx any-cli-mcp-server --cache-build <command> [--cache-file <file>]');
    logger.error('       npx any-cli-mcp-server <cache_file.json>');
    logger.error('');
    logger.error('Examples:');
    logger.error('  npx any-cli-mcp-server <command>');
    logger.error('  npx any-cli-mcp-server --cache-build <command>');
    logger.error('  npx any-cli-mcp-server <command> --cache-file <cache_file>');
    logger.error('  npx any-cli-mcp-server <cache_file>');
    process.exit(1);
  }

  await startMcpServer(commandToUse, cacheFile);
}

main().catch(console.error);
