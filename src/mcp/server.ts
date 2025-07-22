import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { discoverAllCommands } from '../utils/helpParser.js';
import { convertCommandToTools, createZodSchema } from '../utils/toolConverter.js';
import { executeCommand } from '../utils/commandExecutor.js';
import { formatCommandResponse, formatErrorResponse } from '../utils/responseFormatter.js';
import { loadCommandCache } from '../utils/cache.js';
import { createLogger } from '../utils/logger.js';
import { parse as parseShellCommand } from 'shell-quote';

export async function startMcpServer(baseCommand: string, cacheFile?: string | null) {
  const logger = createLogger({ prefix: 'mcp-server' });
  let rootCommand;

  if (cacheFile) {
    logger.info(`Loading cached commands from ${cacheFile}...`);
    const cache = loadCommandCache(cacheFile);

    if (cache && cache.command === baseCommand) {
      rootCommand = cache.data;
      logger.info(`Using cached commands for ${baseCommand}`);
    } else {
      logger.info(`Cache mismatch or invalid, falling back to discovery...`);
      rootCommand = await discoverAllCommands(baseCommand, 1);
    }
  } else {
    logger.info(`Discovering commands for ${baseCommand}...`);
    rootCommand = await discoverAllCommands(baseCommand, 1);
  }

  const tools = convertCommandToTools(rootCommand, baseCommand);

  logger.info(`Found ${tools.length} tools for ${baseCommand}`);

  const server = new McpServer({
    name: `${baseCommand}-cli-wrapper`,
    version: '1.0.0',
  });

  const registeredTools = new Set<string>();
  for (const tool of tools) {
    if (registeredTools.has(tool.name)) {
      logger.debug(`Skipping duplicate tool: ${tool.name}`);
      continue;
    }

    registeredTools.add(tool.name);
    const zodSchema = createZodSchema(tool.inputSchema);

    server.registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: zodSchema.shape,
      },
      async (params: Record<string, unknown>) => {
        logger.debug(`Executing tool: ${tool.name} with params:`, params);

        try {
          const result = await executeCommand(baseCommand, tool.name, params);
          return formatCommandResponse(result);
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );
  }

  server.registerTool(
    'execute',
    {
      title: 'Execute Command',
      description: `Execute arbitrary ${baseCommand} commands`,
      inputSchema: {
        command: z.string().describe('The full command to execute (without the base command)'),
      },
    },
    async ({ command }: { command: string }) => {
      try {
        const parsed = parseShellCommand(command);
        const cmdArgs = parsed.filter((arg): arg is string => typeof arg === 'string');
        const result = await executeCommand(baseCommand, '', { _raw: cmdArgs });
        return formatCommandResponse(result);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info(`MCP server for ${baseCommand} is running`);
}
