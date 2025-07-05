/**
 * Common utilities for formatting command execution responses
 */

import { CommandResult } from '../types/cli.js';

export interface McpResponse {
  [x: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Format a command execution result into an MCP response
 */
export function formatCommandResponse(result: CommandResult): McpResponse {
  let content = '';

  if (result.stdout) {
    content += result.stdout;
  }

  if (result.stderr) {
    content += (content ? '\n\nErrors:\n' : '') + result.stderr;
  }

  if (result.exitCode !== 0) {
    content += `\n\nExit code: ${result.exitCode}`;
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: content || 'Command completed successfully with no output.',
      },
    ],
  };
}

/**
 * Format an error into an MCP response
 */
export function formatErrorResponse(error: unknown): McpResponse {
  const message = error instanceof Error ? error.message : String(error);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Error executing command: ${message}`,
      },
    ],
  };
}
