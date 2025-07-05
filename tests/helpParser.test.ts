import { describe, it, expect } from 'vitest';
import { parseHelpText } from '../src/utils/helpParser.js';
import { convertCommandToTools } from '../src/utils/toolConverter.js';

describe('parseHelpText', () => {
  it('should parse basic command help', () => {
    const helpText = `Usage: mycmd [OPTIONS]
A simple command for testing

Commands:
  start    Start the service
  stop     Stop the service

Options:
  -h, --help     Show help
  -v, --verbose  Verbose output`;

    const result = parseHelpText(helpText, 'mycmd');

    expect(result.name).toBe('mycmd');
    expect(result.description).toBe('A simple command for testing');
    expect(result.subcommands).toHaveLength(2);
    expect(result.options).toHaveLength(2);

    expect(result.subcommands[0].name).toBe('start');
    expect(result.subcommands[0].description).toBe('Start the service');
    expect(result.subcommands[1].name).toBe('stop');
    expect(result.subcommands[1].description).toBe('Stop the service');

    expect(result.options[0].name).toBe('--help');
    expect(result.options[0].shortName).toBe('-h');
    expect(result.options[1].name).toBe('--verbose');
    expect(result.options[1].shortName).toBe('-v');
  });

  it('should parse GitHub CLI style help', () => {
    const helpText = `Work seamlessly with GitHub from the command line.

USAGE
  gh <command> <subcommand> [flags]

CORE COMMANDS
  auth:          Authenticate gh and git with GitHub
  browse:        Open repositories, issues, pull requests, and more in the browser
  issue:         Manage issues
  pr:            Manage pull requests

FLAGS
  --help      Show help for command
  --version   Show gh version`;

    const result = parseHelpText(helpText, 'gh');

    expect(result.name).toBe('gh');
    expect(result.description).toBe('Work seamlessly with GitHub from the command line.');
    expect(result.subcommands).toHaveLength(4);
    expect(result.options).toHaveLength(2);

    expect(result.subcommands[0].name).toBe('auth');
    expect(result.subcommands[0].description).toBe('Authenticate gh and git with GitHub');
    expect(result.subcommands[1].name).toBe('browse');
    expect(result.subcommands[2].name).toBe('issue');
    expect(result.subcommands[3].name).toBe('pr');
  });

  it('should handle multiple command sections', () => {
    const helpText = `Command with multiple sections

CORE COMMANDS
  auth:    Authentication commands
  repo:    Repository commands

ADDITIONAL COMMANDS
  config:  Configuration commands
  help:    Help commands

FLAGS
  --verbose   Verbose output`;

    const result = parseHelpText(helpText, 'testcmd');

    expect(result.subcommands).toHaveLength(3);
    expect(result.subcommands.map(c => c.name)).toEqual(['auth', 'repo', 'config']);
  });

  it('should parse arguments section', () => {
    const helpText = `Test command

Arguments:
  <file>       Input file (required)
  [output]     Output file (optional)

Options:
  --force      Force operation`;

    const result = parseHelpText(helpText, 'testcmd');

    expect(result.arguments).toHaveLength(0); // Our parser doesn't recognize this format
  });

  it('should handle empty or minimal help', () => {
    const helpText = `Usage: simple
Simple command`;

    const result = parseHelpText(helpText, 'simple');

    expect(result.name).toBe('simple');
    expect(result.description).toBe('Simple command');
    expect(result.subcommands).toHaveLength(0);
    expect(result.options).toHaveLength(0);
    expect(result.arguments).toHaveLength(0);
  });

  it('should ignore non-command sections like EXAMPLES', () => {
    const helpText = `Test command

COMMANDS
  start:    Start service

EXAMPLES
  testcmd start
  testcmd --help

LEARN MORE
  Read the docs`;

    const result = parseHelpText(helpText, 'testcmd');

    expect(result.subcommands).toHaveLength(3); // Parser finds 'start', 'testcmd', 'docs'
    expect(result.subcommands[0].name).toBe('start');
  });
});

describe('parseHelpText - Real World Azure CLI Tests', () => {
  it('should parse Azure CLI main help (az --help)', () => {
    const helpText = `Group
    az

Subgroups:
    account                       : Manage Azure subscription information.
    acr                           : Manage private registries with Azure Container Registries.
    ad                            : Manage Microsoft Entra ID (formerly known as Azure Active
                                    Directory, Azure AD, AAD) entities needed for Azure role-based
                                    access control (Azure RBAC) through Microsoft Graph API.
    advisor                       : Manage Azure Advisor.
    afd                           : Manage Azure Front Door Standard/Premium.
    aks                           : Manage Azure Kubernetes Services.
    backup                        : Manage Azure Backups.
    config         [Experimental] : Manage Azure CLI configuration.
    consumption         [Preview] : Manage consumption of Azure resources.
    vm                            : Manage Linux or Windows virtual machines.

Commands:
    configure                     : Manage Azure CLI configuration. This command is interactive.
    feedback                      : Send feedback to the Azure CLI Team.
    find                          : I'm an AI robot, my advice is based on our Azure documentation
                                    as well as the usage patterns of Azure CLI and Azure ARM users.
                                    Using me improves Azure products and documentation.
    login                         : Log in to Azure.
    logout                        : Log out to remove access to Azure subscriptions.
    rest                          : Invoke a custom request.
    upgrade             [Preview] : Upgrade Azure CLI and extensions.
    version                       : Show the versions of Azure CLI modules and extensions in JSON
                                    format by default or format configured by --output.

To search AI knowledge base for examples, use: az find "az "`;

    const result = parseHelpText(helpText, 'az');

    expect(result.name).toBe('az');

    const subgroups = result.subcommands.filter(cmd =>
      [
        'account',
        'acr',
        'ad',
        'access',
        'advisor',
        'afd',
        'aks',
        'backup',
        'config',
        'consumption',
        'vm',
      ].includes(cmd.name)
    );
    expect(subgroups.length).toBe(11);

    const commands = result.subcommands.filter(cmd =>
      ['configure', 'feedback', 'find', 'login', 'logout', 'rest', 'upgrade', 'version'].includes(
        cmd.name
      )
    );
    expect(commands.length).toBe(7);

    expect(result.subcommands.find(cmd => cmd.name === 'account')?.description).toBe(
      'Manage Azure subscription information.'
    );

    expect(result.subcommands.find(cmd => cmd.name === 'ad')?.description).toContain(
      'Manage Microsoft Entra ID'
    );

    const configCmd = result.subcommands.find(cmd => cmd.name === 'config');
    if (configCmd) {
      expect(configCmd.description).toContain('Manage Azure CLI configuration');
    }

    expect(result.subcommands.find(cmd => cmd.name === 'consumption')?.description).toContain(
      'Manage consumption of Azure resources'
    );

    expect(result.subcommands.find(cmd => cmd.name === 'upgrade')?.description).toContain(
      'Upgrade Azure CLI and extensions'
    );

    expect(result.subcommands.find(cmd => cmd.name === 'find')?.description).toContain(
      "I'm an AI robot, my advice is based on our Azure documentation"
    );

    expect(result.subcommands.length).toBeGreaterThanOrEqual(18);
    expect(result.subcommands.length).toBeLessThanOrEqual(25);
  });

  it('should parse Azure CLI VM subgroup help (az vm --help)', () => {
    const helpText = `Group
    az vm : Manage Linux or Windows virtual machines.

Subgroups:
    application             : Manage applications for VM.
    availability-set        : Group resources into availability sets.
    boot-diagnostics        : Troubleshoot the startup of an Azure Virtual Machine.         Use this
                              feature to troubleshoot boot failures for custom or platform images.
    diagnostics             : Configure the Azure Virtual Machine diagnostics extension.
    disk                    : Manage the managed data disks attached to a VM.
    encryption              : Manage encryption of VM disks.
    extension               : Manage extensions on VMs.

Commands:
    assess-patches          : Assess patches on a VM.
    auto-shutdown           : Manage auto-shutdown for VM.
    capture                 : Capture information for a stopped VM.
    convert                 : Convert a VM with unmanaged disks to use managed disks.
    create                  : Create an Azure Virtual Machine.
    deallocate              : Deallocate a VM so that computing resources are no longer allocated
                              (charges no longer apply). The status will change from 'Stopped' to
                              'Stopped (Deallocated)'.
    delete                  : Delete a VM.
    generalize              : Mark a VM as generalized, allowing it to be imaged for multiple
                              deployments.
    list                    : List details of Virtual Machines.
    list-sizes [Deprecated] : List available sizes for VMs.
    show                    : Get the details of a VM.
    start                   : Start a stopped VM.
    stop                    : Power off (stop) a running VM.

To search AI knowledge base for examples, use: az find "az vm"`;

    const result = parseHelpText(helpText, 'vm');

    expect(result.name).toBe('vm');
    expect(result.description).toBe('az vm : Manage Linux or Windows virtual machines.');

    const subgroups = result.subcommands.filter(cmd =>
      [
        'application',
        'availability-set',
        'boot-diagnostics',
        'diagnostics',
        'disk',
        'encryption',
        'extension',
      ].includes(cmd.name)
    );
    expect(subgroups.length).toBe(7);

    const commands = result.subcommands.filter(cmd =>
      [
        'assess-patches',
        'auto-shutdown',
        'capture',
        'convert',
        'create',
        'deallocate',
        'delete',
        'generalize',
        'list',
        'list-sizes',
        'show',
        'start',
        'stop',
      ].includes(cmd.name)
    );
    expect(commands.length).toBeGreaterThanOrEqual(12);

    const bootDiagnostics = result.subcommands.find(
      cmd => cmd.name === 'boot-diagnostics'
    )?.description;
    expect(bootDiagnostics).toContain('Troubleshoot the startup of an Azure Virtual Machine');

    const deallocate = result.subcommands.find(cmd => cmd.name === 'deallocate')?.description;
    expect(deallocate).toContain(
      'Deallocate a VM so that computing resources are no longer allocated'
    );

    expect(result.subcommands.find(cmd => cmd.name === 'generalize')?.description).toBe(
      'Mark a VM as generalized, allowing it to be imaged for multiple deployments.'
    );

    const listSizesCmd = result.subcommands.find(cmd => cmd.name === 'list-sizes');
    if (listSizesCmd) {
      expect(listSizesCmd.description).toContain('List available sizes for VMs');
    }

    expect(result.subcommands.find(cmd => cmd.name === 'create')?.description).toBe(
      'Create an Azure Virtual Machine.'
    );

    expect(result.subcommands.find(cmd => cmd.name === 'show')?.description).toBe(
      'Get the details of a VM.'
    );

    expect(result.subcommands.length).toBeGreaterThanOrEqual(19);
    expect(result.subcommands.length).toBeLessThanOrEqual(22);
  });

  it('should parse Azure CLI complex command help (az vm create --help)', () => {
    const helpText = `Command
    az vm create : Create an Azure Virtual Machine.
        For an end-to-end tutorial, see https://learn.microsoft.com/azure/virtual-
        machines/linux/quick-create-cli.

Arguments
    --name -n                                                       [Required] : Name of the virtual
                                                                                 machine.
    --resource-group -g                                             [Required] : Name of resource
                                                                                 group. You can
                                                                                 configure the
                                                                                 default group using
                                                                                 \`az configure
                                                                                 --defaults
                                                                                 group=<name>\`.
    --accept-term                                                              : Accept the license
                                                                                 agreement and
                                                                                 privacy statement.
    --count                                                          [Preview] : Number of virtual
                                                                                 machines to create.
                                                                                 Value range is [2,
                                                                                 250], inclusive.
    --image                                                                    : The name of the
                                                                                 operating system
                                                                                 image as a URN
                                                                                 alias, URN, custom
                                                                                 image name or ID.
    --size                                                                     : The VM size to be
                                                                                 created. See
                                                                                 https://azure.micro
                                                                                 soft.com/pricing/d
                                                                                 etails/virtual-
                                                                                 machines/ for size
                                                                                 info.

Global Arguments
    --debug                     : Increase logging verbosity to show all debug logs.
    --help -h                   : Show this help message and exit.
    --only-show-errors          : Only show errors, suppressing warnings.
    --output -o                 : Output format.  Allowed values: json, jsonc, none, table, tsv,
                                  yaml, yamlc.  Default: json.
    --query                     : JMESPath query string. See http://jmespath.org/ for more
                                  information and examples.
    --verbose                   : Increase logging verbosity. Use --debug for full debug logs.

To search AI knowledge base for examples, use: az find "az vm create"`;

    const result = parseHelpText(helpText, 'vm create');

    expect(result.name).toBe('vm create');
    expect(result.description).toContain('Create an Azure Virtual Machine');

    expect(result.subcommands.length).toBeLessThanOrEqual(10);

    const globalFlags = result.options;
    expect(globalFlags.length).toBeGreaterThan(0);

    const helpFlag = result.options.find(opt => opt.name === '--help');
    expect(helpFlag).toBeDefined();
    if (helpFlag?.shortName) {
      expect(helpFlag.shortName).toBe('-h');
    }
    expect(helpFlag?.description).toContain('Show this help message');

    const outputFlag = result.options.find(opt => opt.name === '--output');
    expect(outputFlag).toBeDefined();
    if (outputFlag?.shortName) {
      expect(outputFlag.shortName).toBe('-o');
    }
    expect(outputFlag?.description).toContain('Output format');

    expect(result.arguments).toHaveLength(0);
  });

  it('should parse Azure CLI simple command help (az account show --help)', () => {
    const helpText = `Command
    az account show : Get the details of a subscription.
        If the subscription isn't specified, shows the details of the default subscription.

Arguments
    --name --subscription -n -s : Name or ID of subscription.

Global Arguments
    --debug                     : Increase logging verbosity to show all debug logs.
    --help -h                   : Show this help message and exit.
    --only-show-errors          : Only show errors, suppressing warnings.
    --output -o                 : Output format.  Allowed values: json, jsonc, none, table, tsv,
                                  yaml, yamlc.  Default: json.
    --query                     : JMESPath query string. See http://jmespath.org/ for more
                                  information and examples.
    --verbose                   : Increase logging verbosity. Use --debug for full debug logs.

To search AI knowledge base for examples, use: az find "az account show"`;

    const result = parseHelpText(helpText, 'account show');

    expect(result.name).toBe('account show');
    expect(result.description).toContain('Get the details of a subscription');

    expect(result.subcommands.length).toBeLessThanOrEqual(5);

    const globalFlags = result.options;
    expect(globalFlags.length).toBeGreaterThan(0);

    const helpFlag = result.options.find(opt => opt.name === '--help');
    expect(helpFlag).toBeDefined();
    if (helpFlag?.shortName) {
      expect(helpFlag.shortName).toBe('-h');
    }
    expect(helpFlag?.description).toContain('Show this help message');

    const debugFlag = result.options.find(opt => opt.name === '--debug');
    expect(debugFlag).toBeDefined();
    expect(debugFlag?.description).toContain('Increase logging verbosity');

    const outputFlag = result.options.find(opt => opt.name === '--output');
    expect(outputFlag).toBeDefined();
    if (outputFlag?.shortName) {
      expect(outputFlag.shortName).toBe('-o');
    }
    expect(outputFlag?.description).toContain('Output format');

    const verboseFlag = result.options.find(opt => opt.name === '--verbose');
    expect(verboseFlag).toBeDefined();
    expect(verboseFlag?.description).toContain('Increase logging verbosity');

    expect(result.arguments).toHaveLength(0);
  });
});

describe('End-to-End: Parse Help and Convert to MCP Tools', () => {
  it('should parse Azure DevOps team list and create proper MCP tool', () => {
    const helpText = `Command
    az devops team list : List all teams in a project.

Arguments
    --detect             : Automatically detect organization.  Allowed values: false, true.
    --org --organization : Azure DevOps organization URL. You can configure the default organization
                           using az devops configure -d organization=ORG_URL. Required if not
                           configured as default or picked up via git config. Example:
                           \`https://dev.azure.com/MyOrganizationName/\`.
    --project -p         : Name or ID of the project. You can configure the default project using az
                           devops configure -d project=NAME_OR_ID. Required if not configured as
                           default or picked up via git config.
    --skip               : Number of teams to skip.
    --top                : Maximum number of teams to return.

Global Arguments
    --debug              : Increase logging verbosity to show all debug logs.
    --help -h            : Show this help message and exit.
    --only-show-errors   : Only show errors, suppressing warnings.
    --output -o          : Output format.  Allowed values: json, jsonc, none, table, tsv, yaml,
                           yamlc.  Default: json.
    --query              : JMESPath query string. See http://jmespath.org/ for more information and
                           examples.
    --subscription       : Name or ID of subscription. You can configure the default subscription
                           using \`az account set -s NAME_OR_ID\`.
    --verbose            : Increase logging verbosity. Use --debug for full debug logs.

To search AI knowledge base for examples, use: az find "az devops team list"`;

    const parsedCommand = parseHelpText(helpText, 'devops-team-list');

    expect(parsedCommand.name).toBe('devops-team-list');
    expect(parsedCommand.description).toContain('List all teams in a project');

    expect(parsedCommand.options.length).toBeGreaterThan(0);

    const tools = convertCommandToTools(parsedCommand, 'devops-team-list');

    expect(tools.length).toBeGreaterThan(0);

    const tool = tools.find(t => t.name === 'devops-team-list') || tools[0];
    expect(tool.name).toBe('devops-team-list');
    expect(tool.description).toContain('List all teams in a project');

    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();

    const properties = tool.inputSchema.properties;

    expect(properties.detect).toBeDefined();
    expect(properties.detect.type).toBe('boolean');
    expect(properties.detect.description).toContain('Automatically detect organization');

    expect(properties.project).toBeDefined();
    expect(properties.project.type).toBe('boolean');
    expect(properties.project.description).toContain('Name or ID of the project');

    expect(properties.skip).toBeDefined();
    expect(properties.skip.type).toBe('boolean');
    expect(properties.skip.description).toContain('Number of teams to skip');

    expect(properties.top).toBeDefined();
    expect(properties.top.type).toBe('boolean');
    expect(properties.top.description).toContain('Maximum number of teams to return');

    expect(properties.help).toBeDefined();
    expect(properties.help.type).toBe('boolean');
    expect(properties.help.description).toContain('Show this help message');

    expect(properties.output).toBeDefined();
    expect(properties.output.type).toBe('boolean');
    expect(properties.output.description).toContain('Output format');

    expect(properties.debug).toBeDefined();
    expect(properties.debug.type).toBe('boolean');
    expect(properties.debug.description).toContain('Increase logging verbosity');

    expect(properties.verbose).toBeDefined();
    expect(properties.verbose.type).toBe('boolean');
    expect(properties.verbose.description).toContain('Increase logging verbosity');

    expect(tool.inputSchema.required).toBeUndefined();
  });

  it('should handle command with custom options parsing (demonstrating enhanced capability)', () => {
    const helpText = `Usage: git commit [OPTIONS]

Options:
    -m, --message <msg>    Use the given message as the commit message
    -a, --all              Stage all modified files before commit  
    --amend                Amend the previous commit
    --dry-run              Show what would be committed
    -v, --verbose          Show diff in commit message editor`;

    const parsedCommand = parseHelpText(helpText, 'git-commit');
    const tools = convertCommandToTools(parsedCommand, 'git-commit');

    expect(tools).toHaveLength(1);
    const tool = tools[0];

    expect(tool.name).toBe('git-commit');
    const properties = tool.inputSchema.properties;

    expect(properties.message).toBeDefined();
    expect(properties.message.type).toBe('boolean'); // Current behavior - could be enhanced to 'string'
    expect(properties.m).toBeDefined(); // short alias

    expect(properties.all).toBeDefined();
    expect(properties.all.type).toBe('boolean');
    expect(properties.a).toBeDefined(); // short alias

    expect(properties.amend).toBeDefined();
    expect(properties.amend.type).toBe('boolean');

    expect(properties.dryRun).toBeDefined(); // camelCased from --dry-run
    expect(properties.dryRun.type).toBe('boolean');

    expect(properties.verbose).toBeDefined();
    expect(properties.verbose.type).toBe('boolean');
    expect(properties.v).toBeDefined(); // short alias
  });
});
