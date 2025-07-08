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

  if (cacheBuildIndex === -1) {
    const cacheFile = cacheFileIndex !== -1 ? args[cacheFileIndex + 1] : null;
    return { cacheBuild: false, cacheFile };
  }

  let command: string | undefined;
  let cacheFile: string | null = null;

  if (cacheBuildIndex !== -1) {
    const remainingArgs = args.slice(cacheBuildIndex + 1);
    const filteredArgs: string[] = [];

    for (let i = 0; i < remainingArgs.length; i++) {
      if (remainingArgs[i] === '--cache-file') {
        cacheFile = remainingArgs[i + 1] || null;
        i++; 
      } else {
        filteredArgs.push(remainingArgs[i]);
      }
    }

    command = filteredArgs.join(' ') || undefined;
  } else {
    cacheFile = cacheFileIndex !== -1 ? args[cacheFileIndex + 1] : null;
  }
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
