export interface CliCommand {
  name: string;
  description: string;
  subcommands: CliCommand[];
  options: CliOption[];
  arguments: CliArgument[];
}

export interface CliOption {
  name: string;
  shortName?: string;
  description: string;
  valueRequired: boolean;
  valueName?: string;
}

export interface CliArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
