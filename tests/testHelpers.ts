/**
 * Common test helpers to reduce duplication in test files
 */

import { expect } from 'vitest';
import { parseHelpText } from '../src/utils/helpParser.js';
import { convertCommandToTools } from '../src/utils/toolConverter.js';

/**
 * Test expectations for parsed command properties
 */
export interface CommandExpectations {
  name: string;
  description?: string;
  subcommandCount?: number;
  optionCount?: number;
  argumentCount?: number;
  subcommands?: Array<{
    name: string;
    description?: string;
  }>;
  options?: Array<{
    name: string;
    shortName?: string;
    description?: string;
  }>;
}

/**
 * Helper to test basic command parsing expectations
 */
export function expectCommandMatches(
  helpText: string,
  commandName: string,
  expectations: CommandExpectations
): ReturnType<typeof parseHelpText> {
  const result = parseHelpText(helpText, commandName);

  expect(result.name).toBe(expectations.name);

  if (expectations.description) {
    expect(result.description).toBe(expectations.description);
  }

  if (expectations.subcommandCount !== undefined) {
    expect(result.subcommands).toHaveLength(expectations.subcommandCount);
  }

  if (expectations.optionCount !== undefined) {
    expect(result.options).toHaveLength(expectations.optionCount);
  }

  if (expectations.argumentCount !== undefined) {
    expect(result.arguments).toHaveLength(expectations.argumentCount);
  }

  if (expectations.subcommands) {
    for (const expectedSub of expectations.subcommands) {
      const actualSub = result.subcommands.find(s => s.name === expectedSub.name);
      expect(actualSub).toBeDefined();
      if (expectedSub.description) {
        expect(actualSub?.description).toBe(expectedSub.description);
      }
    }
  }

  if (expectations.options) {
    for (const expectedOpt of expectations.options) {
      const actualOpt = result.options.find(o => o.name === expectedOpt.name);
      expect(actualOpt).toBeDefined();
      if (expectedOpt.shortName) {
        expect(actualOpt?.shortName).toBe(expectedOpt.shortName);
      }
      if (expectedOpt.description) {
        expect(actualOpt?.description).toContain(expectedOpt.description);
      }
    }
  }

  return result;
}

/**
 * Helper to test Azure CLI parsing patterns
 */
export function expectAzureCommandMatches(
  helpText: string,
  commandName: string,
  expectedSubgroups: string[],
  expectedCommands: string[]
): ReturnType<typeof parseHelpText> {
  const result = parseHelpText(helpText, commandName);

  expect(result.name).toBe(commandName);

  const actualSubgroups = result.subcommands.filter(cmd => expectedSubgroups.includes(cmd.name));
  expect(actualSubgroups.length).toBe(expectedSubgroups.length);

  const actualCommands = result.subcommands.filter(cmd => expectedCommands.includes(cmd.name));
  expect(actualCommands.length).toBe(expectedCommands.length);

  return result;
}

/**
 * Helper to test end-to-end tool conversion
 */
export function expectToolConversion(
  helpText: string,
  commandName: string,
  expectedProperties: string[]
): void {
  const parsedCommand = parseHelpText(helpText, commandName);
  const tools = convertCommandToTools(parsedCommand, commandName);

  expect(tools.length).toBeGreaterThan(0);

  const tool = tools.find(t => t.name === commandName) || tools[0];
  expect(tool.name).toBe(commandName);
  expect(tool.inputSchema).toBeDefined();
  expect(tool.inputSchema.type).toBe('object');
  expect(tool.inputSchema.properties).toBeDefined();

  const properties = tool.inputSchema.properties;

  for (const propName of expectedProperties) {
    expect(properties[propName]).toBeDefined();
    expect(properties[propName].type).toBeDefined();
    expect(properties[propName].description).toBeDefined();
  }
}

/**
 * Common Azure CLI help text patterns for reuse in tests
 */
export const AZURE_HELP_PATTERNS = {
  GLOBAL_ARGS_SECTION: `Global Arguments
    --debug              : Increase logging verbosity to show all debug logs.
    --help -h            : Show this help message and exit.
    --only-show-errors   : Only show errors, suppressing warnings.
    --output -o          : Output format.  Allowed values: json, jsonc, none, table, tsv, yaml,
                           yamlc.  Default: json.
    --query              : JMESPath query string. See http://jmespath.org/ for more information and
                           examples.
    --verbose            : Increase logging verbosity. Use --debug for full debug logs.`,

  SEARCH_FOOTER: 'To search AI knowledge base for examples, use: az find "az',

  createCommandHelp: (command: string, description: string) => `Command
    az ${command} : ${description}`,

  createGroupHelp: (group: string, description: string) => `Group
    az ${group} : ${description}`,
} as const;
