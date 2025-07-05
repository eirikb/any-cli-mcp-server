export function validateCommandName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 2 || name.length > 50) return false;
  if (name.includes(' ') || name.includes('\t')) return false;
  if (!name.match(/^[a-z][a-zA-Z0-9_-]*$/)) return false;

  const invalidWords = [
    'of',
    'the',
    'and',
    'or',
    'to',
    'from',
    'for',
    'with',
    'by',
    'in',
    'on',
    'at',
    'use',
    'see',
    'all',
    'more',
    'information',
    'using',
    'values',
    'server',
    'service',
    'machine',
    'deprecated',
    'caches',
    'catalog',
    'format',
    'cp',
    'co',
    'was',
    'the',
    'contents',
    'certificate',
    'mislav',
    'command',
    'subcommand',
    'option',
    'flag',
    'argument',
    'description',
    'example',
    'examples',
    'usage',
    'help',
    'version',
  ];

  return !invalidWords.includes(name.toLowerCase());
}

export function validateNonEmpty(value: string, fieldName: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${fieldName} is required and cannot be empty`);
  }
}

export function validateArray<T>(value: T[], fieldName: string): void {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
}

export function validateObject(value: unknown, fieldName: string): void {
  if (!value || typeof value !== 'object') {
    throw new Error(`${fieldName} must be an object`);
  }
}
