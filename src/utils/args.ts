export interface ParsedArgs {
  command?: string;
  cacheBuild: boolean;
  cacheFile: string | null;
}

export function parseArgs(args: string[]): ParsedArgs {
  const cacheBuildIndex = args.indexOf('--cache-build');
  const cacheFileIndex = args.indexOf('--cache-file');

  const cacheFileArg = detectCacheFile(args);
  if (cacheBuildIndex === -1 && cacheFileArg) {
    return { cacheBuild: false, cacheFile: cacheFileArg };
  }

  if (cacheBuildIndex === -1 && args.length > 0 && !args[0].startsWith('-')) {
    const cacheFile = cacheFileIndex !== -1 ? args[cacheFileIndex + 1] : null;
    return { command: args[0], cacheBuild: false, cacheFile };
  }

  const command = cacheBuildIndex !== -1 ? args[cacheBuildIndex + 1] : undefined;
  const cacheFile = cacheFileIndex !== -1 ? args[cacheFileIndex + 1] : null;
  const cacheBuild = cacheBuildIndex !== -1;

  return {
    command,
    cacheBuild,
    cacheFile,
  };
}

function detectCacheFile(args: string[]): string | null {
  for (const arg of args) {
    if (arg.endsWith('_cache.json') && !arg.startsWith('-')) {
      return arg;
    }
  }
  return null;
}
