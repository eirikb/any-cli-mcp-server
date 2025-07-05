import { z } from 'zod';
import { CliCommand, McpTool } from '../types/cli.js';
import { toCamelCase } from './parsingHelpers.js';

export function convertCommandToTools(
  command: CliCommand,
  baseCommand: string,
  parentPath: string[] = []
): McpTool[] {
  const tools: McpTool[] = [];
  const seenNames = new Set<string>();
  const currentPath = [...parentPath, command.name].filter(p => p !== baseCommand);

  if (parentPath.length === 0) {
    const tool: McpTool = {
      name: baseCommand,
      description: command.description || `Execute ${baseCommand} command`,
      inputSchema: createInputSchema(command),
    };
    tools.push(tool);
    seenNames.add(baseCommand);
  } else if (currentPath.length > 0) {
    const toolName = currentPath.join('-');
    if (!seenNames.has(toolName)) {
      const tool: McpTool = {
        name: toolName,
        description: command.description || `Execute ${toolName} command`,
        inputSchema: createInputSchema(command),
      };
      tools.push(tool);
      seenNames.add(toolName);
    }
  }

  if (command.subcommands.length > 0 && parentPath.length < 10) {
    for (const subcommand of command.subcommands) {
      const subTools = convertCommandToTools(subcommand, baseCommand, [
        ...parentPath,
        command.name,
      ]);
      for (const subTool of subTools) {
        if (!seenNames.has(subTool.name)) {
          tools.push(subTool);
          seenNames.add(subTool.name);
        }
      }
    }
  }

  return tools;
}

function createInputSchema(command: CliCommand): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const option of command.options) {
    addOptionToSchema(properties, option);
  }

  for (const arg of command.arguments) {
    const propName = toCamelCase(arg.name);
    properties[propName] = createPropertyDefinition('string', arg.description);

    if (arg.required) {
      required.push(propName);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function addOptionToSchema(
  properties: Record<string, unknown>,
  option: { name: string; shortName?: string; description: string; valueRequired: boolean }
): void {
  const propName = toCamelCase(option.name.replace(/^--/, ''));
  const type = option.valueRequired ? 'string' : 'boolean';

  properties[propName] = createPropertyDefinition(type, option.description);

  if (option.shortName) {
    const shortPropName = option.shortName.replace(/^-/, '');
    properties[shortPropName] = createPropertyDefinition(type, `Alias for ${propName}`);
  }
}

function createPropertyDefinition(type: string, description: string): Record<string, unknown> {
  return { type, description };
}

export function createZodSchema(
  inputSchema: Record<string, unknown>
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  if (inputSchema.properties) {
    for (const [key, propUnknown] of Object.entries(inputSchema.properties)) {
      const prop = propUnknown as { type?: string; description?: string };
      let schema = createZodType(prop.type, prop.description || '');

      if (!inputSchema.required?.includes(key)) {
        schema = schema.optional();
      }

      shape[key] = schema;
    }
  }

  return z.object(shape);
}

function createZodType(type: string | undefined, description: string): z.ZodTypeAny {
  const desc = (schema: z.ZodTypeAny) => schema.describe(description);

  switch (type) {
    case 'string':
      return desc(z.string());
    case 'boolean':
      return desc(z.boolean());
    case 'number':
      return desc(z.number());
    default:
      return desc(z.any());
  }
}
