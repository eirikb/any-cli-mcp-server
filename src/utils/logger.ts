export interface LoggerOptions {
  enableDebug?: boolean;
  prefix?: string;
}

export class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = options;
  }

  error(message: string, ...args: unknown[]): void {
    const prefix = this.options.prefix ? `[${this.options.prefix}] ` : '';
    console.error(`${prefix}${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    const prefix = this.options.prefix ? `[${this.options.prefix}] ` : '';
    console.error(`${prefix}${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.options.enableDebug) {
      const prefix = this.options.prefix ? `[${this.options.prefix}] ` : '';
      console.error(`${prefix}DEBUG: ${message}`, ...args);
    }
  }

  progress(message: string, ...args: unknown[]): void {
    const prefix = this.options.prefix ? `[${this.options.prefix}] ` : '';
    console.error(`${prefix}  ${message}`, ...args);
  }
}

export const createLogger = (options: LoggerOptions = {}): Logger => new Logger(options);
