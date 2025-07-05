declare module 'parse-help' {
  interface ParsedFlag {
    alias?: string;
    description?: string;
    type?: 'boolean' | 'string' | 'number';
  }

  interface ParsedHelp {
    description?: string;
    flags?: Record<string, ParsedFlag>;
    aliases?: Record<string, string>;
  }

  function parseHelp(helpText: string): ParsedHelp;

  export = parseHelp;
}
