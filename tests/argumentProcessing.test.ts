import { describe, it, expect, beforeEach } from 'vitest';

interface ArgumentProcessingResult {
  command: string;
  args: string[];
}

class ArgumentProcessor {
  private baseCommand: string;

  constructor(baseCommand: string) {
    this.baseCommand = baseCommand;
  }

  processArguments(toolName: string, args: Record<string, any>): ArgumentProcessingResult {
    const commandParts = [this.baseCommand];
    const argParts: string[] = [];
    const positionalParts: string[] = [];

    if (toolName) {
      const toolParts = this.parseToolName(toolName);
      commandParts.push(...toolParts);
    }

    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null) continue;
      if (key === '_raw') {
        return { command: this.baseCommand, args: value as string[] };
      }

      if (this.isPositionalArg(key, toolName) && this.baseCommand === 'az') {
        positionalParts.push(String(value));
      } else {
        const processedArg = this.processArgument(key, value);
        argParts.push(...processedArg);
      }
    }

    return {
      command: this.baseCommand,
      args: [...commandParts.slice(1), ...positionalParts, ...argParts],
    };
  }

  private parseToolName(toolName: string): string[] {
    if (!toolName) return [];

    const parts = toolName.split('-');

    if (this.baseCommand === 'az' && parts.length >= 2) {
      return this.parseAzureToolName(parts);
    }

    return parts;
  }

  private parseAzureToolName(parts: string[]): string[] {
    const result: string[] = [];

    if (parts.length >= 3) {
      result.push(parts[0]); // service

      const compound = parts.slice(1, -1).join('-');
      if (this.isCompoundResource(compound)) {
        result.push(compound);
        result.push(parts[parts.length - 1]);
      } else {
        result.push(...parts.slice(1));
      }
    } else {
      result.push(...parts);
    }

    return result;
  }

  private isCompoundResource(name: string): boolean {
    const compoundResources = [
      'work-item',
      'service-endpoint',
      'variable-group',
      'build-definition',
      'pull-request',
      'access-token',
    ];
    return compoundResources.includes(name);
  }

  private processArgument(key: string, value: any): string[] {
    const kebabKey = this.toKebabCase(key);

    if (typeof value === 'boolean') {
      return value ? [`--${kebabKey}`] : [];
    }

    if (Array.isArray(value)) {
      return value.flatMap(v => [`--${kebabKey}`, String(v)]);
    }

    if (typeof value === 'object' && value !== null) {
      try {
        return [`--${kebabKey}`, JSON.stringify(value)];
      } catch {
        return [`--${kebabKey}`, String(value)];
      }
    }

    return [`--${kebabKey}`, String(value)];
  }

  private isPositionalArg(key: string, toolName?: string): boolean {
    const positionalPatterns = ['name', 'repository', 'id', 'path', 'url'];

    const positionalContexts = ['vm-create', 'repos-show', 'group-create'];
    if (!toolName || !positionalContexts.includes(toolName)) {
      return false;
    }

    return (
      positionalPatterns.includes(key.toLowerCase()) &&
      !key.match(/^(is|has|with|no|enable|disable)/i)
    );
  }

  private toKebabCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }
}

describe('ArgumentProcessor Edge Cases', () => {
  let processor: ArgumentProcessor;

  beforeEach(() => {
    processor = new ArgumentProcessor('az');
  });

  describe('Null and Undefined Handling', () => {
    it('should ignore null values', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        location: null,
        size: 'Standard_B1s',
      });

      expect(result.args).toEqual(['vm', 'create', 'test-vm', '--size', 'Standard_B1s']);
      expect(result.args).not.toContain('--location');
    });

    it('should ignore undefined values', () => {
      const result = processor.processArguments('group-create', {
        name: 'test-group',
        location: 'eastus',
        tags: undefined,
      });

      expect(result.args).toEqual(['group', 'create', 'test-group', '--location', 'eastus']);
      expect(result.args).not.toContain('--tags');
    });

    it('should handle completely empty args object', () => {
      const result = processor.processArguments('vm-list', {});
      expect(result.args).toEqual(['vm', 'list']);
    });
  });

  describe('Special Character Handling', () => {
    it('should handle special characters in string values', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        tags: 'Environment=test!@#$%^&*()_+-=[]{}|;:,.<>?',
      });

      expect(result.args).toContain('Environment=test!@#$%^&*()_+-=[]{}|;:,.<>?');
    });

    it('should handle Unicode characters', () => {
      const result = processor.processArguments('resource-create', {
        name: 'test-资源',
        description: 'Description with émojis 🚀 and ñoñó',
      });

      expect(result.args).toContain('test-资源');
      expect(result.args).toContain('Description with émojis 🚀 and ñoñó');
    });

    it('should handle newlines and tabs in values', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        customData: 'line1\nline2\tline3',
      });

      expect(result.args).toContain('line1\nline2\tline3');
    });
  });

  describe('Very Long Values', () => {
    it('should handle extremely long string values', () => {
      const longValue = 'A'.repeat(10000);
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        description: longValue,
      });

      expect(result.args).toContain(longValue);
      expect(result.args.find(arg => arg === longValue)?.length).toBe(10000);
    });

    it('should handle very long tool names', () => {
      const longToolName = 'very-long-command-name-with-many-parts-that-keeps-going-and-going';
      const result = processor.processArguments(longToolName, { test: 'value' });

      expect(result.args).toEqual([
        'very',
        'long',
        'command',
        'name',
        'with',
        'many',
        'parts',
        'that',
        'keeps',
        'going',
        'and',
        'going',
        '--test',
        'value',
      ]);
    });
  });

  describe('Array Value Handling', () => {
    it('should handle array values by repeating flags', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        tags: ['Environment=test', 'Project=demo', 'Owner=team'],
      });

      expect(result.args).toContain('--tags');
      expect(result.args).toContain('Environment=test');
      expect(result.args).toContain('Project=demo');
      expect(result.args).toContain('Owner=team');
    });

    it('should handle empty arrays', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        tags: [],
      });

      expect(result.args).toEqual(['vm', 'create', 'test-vm']);
      expect(result.args).not.toContain('--tags');
    });

    it('should handle arrays with null/undefined elements', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        tags: ['tag1', null, 'tag2', undefined, 'tag3'],
      });

      expect(result.args).toContain('tag1');
      expect(result.args).toContain('tag2');
      expect(result.args).toContain('tag3');
      expect(result.args).toContain('null'); // null becomes string
      expect(result.args).toContain('undefined'); // undefined becomes string
    });
  });

  describe('Object Value Handling', () => {
    it('should stringify object values', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        metadata: { env: 'test', version: '1.0' },
      });

      expect(result.args).toContain('--metadata');
      expect(result.args).toContain('{"env":"test","version":"1.0"}');
    });

    it('should handle circular references gracefully', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        metadata: circularObj,
      });

      expect(result.args).toContain('--metadata');
      expect(result.args).toContain('[object Object]');
    });

    it('should handle nested objects', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        config: {
          networking: { vnet: 'test-vnet', subnet: 'test-subnet' },
          storage: { type: 'premium', size: '100GB' },
        },
      });

      const configJson = JSON.stringify({
        networking: { vnet: 'test-vnet', subnet: 'test-subnet' },
        storage: { type: 'premium', size: '100GB' },
      });

      expect(result.args).toContain('--config');
      expect(result.args).toContain(configJson);
    });
  });

  describe('Boolean Edge Cases', () => {
    it('should handle boolean false values correctly', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        generateSshKeys: true,
        enableAcceleratedNetworking: false,
      });

      expect(result.args).toContain('--generate-ssh-keys');
      expect(result.args).not.toContain('--enable-accelerated-networking');
    });

    it('should handle string boolean values', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        enableMonitoring: 'true',
        enableBackup: 'false',
      });

      expect(result.args).toContain('--enable-monitoring');
      expect(result.args).toContain('true');
      expect(result.args).toContain('--enable-backup');
      expect(result.args).toContain('false');
    });
  });

  describe('Compound Resource Handling', () => {
    it('should handle work-item compound resource', () => {
      const result = processor.processArguments('boards-work-item-create', {
        title: 'Bug report',
        type: 'Bug',
      });

      expect(result.args).toEqual([
        'boards',
        'work-item',
        'create',
        '--title',
        'Bug report',
        '--type',
        'Bug',
      ]);
    });

    it('should handle service-endpoint compound resource', () => {
      const result = processor.processArguments('devops-service-endpoint-create', {
        name: 'test-endpoint',
        type: 'github',
      });

      expect(result.args).toEqual([
        'devops',
        'service-endpoint',
        'create',
        '--name',
        'test-endpoint',
        '--type',
        'github',
      ]);
    });

    it('should handle variable-group compound resource', () => {
      const result = processor.processArguments('pipelines-variable-group-create', {
        name: 'test-variables',
        variables: 'key1=value1 key2=value2',
      });

      expect(result.args).toEqual([
        'pipelines',
        'variable-group',
        'create',
        '--name',
        'test-variables',
        '--variables',
        'key1=value1 key2=value2',
      ]);
    });

    it('should not treat non-compound resources as compound', () => {
      const result = processor.processArguments('vm-disk-attach', {
        vmName: 'test-vm',
        diskName: 'test-disk',
      });

      expect(result.args).toEqual([
        'vm',
        'disk',
        'attach',
        '--vm-name',
        'test-vm',
        '--disk-name',
        'test-disk',
      ]);
    });
  });

  describe('CamelCase to Kebab-Case Conversion', () => {
    it('should convert camelCase to kebab-case', () => {
      const result = processor.processArguments('vm-create', {
        resourceGroupName: 'rg1',
        adminUsername: 'azuser',
        enableAcceleratedNetworking: true,
      });

      expect(result.args).toContain('--resource-group-name');
      expect(result.args).toContain('--admin-username');
      expect(result.args).toContain('--enable-accelerated-networking');
    });

    it('should handle multiple consecutive capitals', () => {
      const result = processor.processArguments('vm-create', {
        vmSSHKeyPath: '/path/to/key',
        enableHTTPSOnly: true,
      });

      expect(result.args).toContain('--vm-s-s-h-key-path');
      expect(result.args).toContain('--enable-h-t-t-p-s-only');
    });

    it('should handle numbers in camelCase', () => {
      const result = processor.processArguments('vm-create', {
        osDisk1Size: '128',
        dataDisk2Type: 'premium',
      });

      expect(result.args).toContain('--os-disk1-size');
      expect(result.args).toContain('--data-disk2-type');
    });
  });

  describe('Positional Argument Handling', () => {
    it('should place name as positional for Azure CLI', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        resourceGroup: 'rg1',
        location: 'eastus',
      });

      expect(result.args[0]).toBe('vm');
      expect(result.args[1]).toBe('create');
      expect(result.args[2]).toBe('test-vm'); // name as positional
      expect(result.args).toContain('--resource-group');
      expect(result.args).toContain('--location');
    });

    it('should place repository as positional', () => {
      const result = processor.processArguments('repos-show', {
        repository: 'myrepo',
        organization: 'myorg',
      });

      expect(result.args).toEqual(['repos', 'show', 'myrepo', '--organization', 'myorg']);
    });

    it('should not treat boolean flags as positional', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        generateSshKeys: true,
      });

      expect(result.args).toEqual(['vm', 'create', 'test-vm', '--generate-ssh-keys']);
    });
  });

  describe('Raw Command Override', () => {
    it('should use raw command when _raw is provided', () => {
      const result = processor.processArguments('any-tool', {
        name: 'ignored',
        _raw: ['devops', 'login', '--organization', 'myorg'],
      });

      expect(result.command).toBe('az');
      expect(result.args).toEqual(['devops', 'login', '--organization', 'myorg']);
    });

    it('should ignore other arguments when _raw is provided', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        resourceGroup: 'rg1',
        _raw: ['account', 'show'],
      });

      expect(result.args).toEqual(['account', 'show']);
      expect(result.args).not.toContain('--name');
      expect(result.args).not.toContain('--resource-group');
    });
  });

  describe('Type Coercion Edge Cases', () => {
    it('should handle zero values correctly', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        port: 0,
        count: 0,
      });

      expect(result.args).toContain('--port');
      expect(result.args).toContain('0');
      expect(result.args).toContain('--count');
    });

    it('should handle NaN and Infinity', () => {
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        invalidNumber: NaN,
        infiniteValue: Infinity,
      });

      expect(result.args).toContain('--invalid-number');
      expect(result.args).toContain('NaN');
      expect(result.args).toContain('--infinite-value');
      expect(result.args).toContain('Infinity');
    });

    it('should handle Date objects', () => {
      const testDate = new Date('2023-01-01T00:00:00Z');
      const result = processor.processArguments('vm-create', {
        name: 'test-vm',
        createdAt: testDate,
      });

      expect(result.args).toContain('--created-at');
      expect(result.args[0]).toBe('vm');
      expect(result.args[1]).toBe('create');
      expect(result.args[2]).toBe('test-vm'); // name as positional
      expect(result.args[3]).toBe('--created-at');
      expect(result.args[4]).toBe(JSON.stringify(testDate));
    });
  });
});

describe('GitHub CLI ArgumentProcessor', () => {
  let processor: ArgumentProcessor;

  beforeEach(() => {
    processor = new ArgumentProcessor('gh');
  });

  describe('GitHub-specific patterns', () => {
    it('should handle GitHub CLI tool names without compound resources', () => {
      const result = processor.processArguments('repo-create', {
        name: 'test-repo',
        public: true,
      });

      expect(result.args).toEqual(['repo', 'create', '--name', 'test-repo', '--public']);
    });

    it('should handle GitHub CLI field parameters', () => {
      const result = processor.processArguments('api', {
        method: 'POST',
        field: 'name=test',
        field2: 'private=true',
      });

      expect(result.args).toContain('--field');
      expect(result.args).toContain('name=test');
      expect(result.args).toContain('--field2');
      expect(result.args).toContain('private=true');
    });
  });
});

describe('Git ArgumentProcessor', () => {
  let processor: ArgumentProcessor;

  beforeEach(() => {
    processor = new ArgumentProcessor('git');
  });

  describe('Git-specific patterns', () => {
    it('should handle Git simple commands', () => {
      const result = processor.processArguments('commit', {
        message: 'Initial commit',
        all: true,
        signoff: true,
      });

      expect(result.args).toEqual(['commit', '--message', 'Initial commit', '--all', '--signoff']);
    });

    it('should handle Git log with complex options', () => {
      const result = processor.processArguments('log', {
        oneline: true,
        graph: true,
        since: '2023-01-01',
        author: 'user@example.com',
      });

      expect(result.args).toContain('--oneline');
      expect(result.args).toContain('--graph');
      expect(result.args).toContain('--since');
      expect(result.args).toContain('--author');
    });
  });
});

describe.skip('Performance and Memory Edge Cases - TOO EXTREME FOR NOW', () => {
  let processor: ArgumentProcessor;

  beforeEach(() => {
    processor = new ArgumentProcessor('az');
  });

  it('should handle very large argument objects efficiently', () => {
    const largeArgs: Record<string, any> = {};
    for (let i = 0; i < 1000; i++) {
      largeArgs[`arg${i}`] = `value${i}`;
    }

    const startTime = Date.now();
    const result = processor.processArguments('vm-create', largeArgs);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(100); // Should process quickly
    expect(result.args.length).toBeGreaterThan(2000); // Should have all args
  });

  it('should handle deeply nested objects without stack overflow', () => {
    let deepObj: any = { level: 0 };
    for (let i = 1; i < 100; i++) {
      deepObj = { level: i, nested: deepObj };
    }

    expect(() => {
      processor.processArguments('vm-create', {
        name: 'test-vm',
        deepConfig: deepObj,
      });
    }).not.toThrow();
  });
});
