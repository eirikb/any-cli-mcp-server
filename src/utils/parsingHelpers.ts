/**
 * Common patterns and utilities for parsing CLI help text
 */

export interface ParsedSection {
  name: string;
  content: string[];
}

export const PATTERNS = {
  COMMAND_SECTION:
    /^\s*(Commands?|Subcommands?|Subgroups|Available commands?|CORE COMMANDS|ACTIONS COMMANDS|ALIAS COMMANDS|ADDITIONAL COMMANDS|GENERAL COMMANDS|TARGETED COMMANDS):?/i,

  COMMAND_ENTRY: /^\s+([a-z][a-zA-Z0-9_-]*)\s*:?\s+(.+)/,

  ARGUMENT_ENTRY: /^\s*[<[](.+?)[>\]]\s+(.+)/,
} as const;

/**
 * Split help text into logical sections
 */
export function parseHelpSections(helpText: string): ParsedSection[] {
  if (!helpText) return [];
  const lines = helpText.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    const headerMatch = line.match(PATTERNS.COMMAND_SECTION);
    if (headerMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        name: headerMatch[1].toLowerCase(),
        content: [],
      };
      continue;
    }

    if (currentSection && trimmed) {
      currentSection.content.push(line);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Check if a line should be skipped during description extraction
 */
export function shouldSkipLine(line: string, commandName?: string): boolean {
  if (!line) return true;
  const trimmed = line.trim();

  if (!trimmed) return true;

  if (commandName && trimmed.startsWith(commandName)) return true;

  return false;
}

/**
 * Extract multi-line descriptions starting from a given line index
 */
export function extractMultiLineDescription(
  lines: string[],
  startIndex: number,
  initialDescription: string
): { description: string; endIndex: number } {
  let description = initialDescription;
  let i = startIndex + 1;

  while (i < lines.length) {
    const nextLine = lines[i];
    const nextTrimmed = nextLine.trim();

    if (
      !nextTrimmed ||
      nextLine.match(PATTERNS.COMMAND_ENTRY) ||
      nextLine.match(PATTERNS.COMMAND_SECTION)
    ) {
      break;
    }

    if (nextLine.match(/^\s+/) && nextTrimmed) {
      description += ' ' + nextTrimmed;
      i++;
    } else {
      break;
    }
  }

  return { description, endIndex: i - 1 };
}

export function cleanDescription(description: string): string {
  if (!description) return '';
  if (description.startsWith(':')) {
    description = description.substring(1).trim();
  }
  return description;
}

/**
 * Convert kebab-case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase back to kebab-case
 */
export function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}
