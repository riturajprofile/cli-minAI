import { registry } from './registry.js';

export function registerSystemCommands(fs, ui) {
    registry.register('date', () => {
        return new Date().toString();
    }, 'Display current date/time', 'date', 'System');

    registry.register('whoami', () => {
        return 'user';
    }, 'Print current user', 'whoami', 'System');

    registry.register('uname', (args, flags) => {
        return flags.a ? 'Linux minai 5.10.0 generic x86_64' : 'Linux';
    }, 'Print system information', 'uname [-a]', 'System');

    registry.register('df', () => {
        return 'Filesystem     1K-blocks      Used Available Use% Mounted on\n/dev/root       10000000   2000000   8000000  20% /';
    }, 'Report file system usage', 'df', 'System');

    registry.register('clear', () => {
        ui.clear();
    }, 'Clear terminal screen', 'clear', 'System');

    registry.register('history', () => {
        return ui.getHistory().map((cmd, i) => `${i + 1}  ${cmd}`).join('\n');
    }, 'Show command history', 'history', 'System');

    registry.register('reset', () => {
        return fs.reset();
    }, 'Reset file system to default', 'reset', 'System');

    registry.register('exit', () => {
        return 'Type "exit" is not needed. Just close the terminal.';
    }, 'Exit terminal', 'exit', 'System');

    registry.register('config', () => {
        ui.openSettings();
        return 'Opening configuration...';
    }, 'Open configuration settings', 'config', 'System');

    registry.register('alias', (args) => {
        if (args.length === 0) {
            // List all aliases
            const aliases = Object.entries(registry.aliases);
            if (aliases.length === 0) return 'No aliases defined';
            return aliases.map(([name, cmd]) => `${name}='${cmd}'`).join('\n');
        }

        // Parse alias definition: name=command
        const input = args.join(' ');
        const match = input.match(/^(\w+)=(.+)$/);
        if (!match) return 'Usage: alias [name=command]';

        const [, name, command] = match;
        const trimmedCommand = command.trim(); // Trim whitespace
        registry.setAlias(name, trimmedCommand);

        // Save to filesystem
        const current = fs.cat('/configuration/aliases.txt');
        const lines = current.split('\n').filter(l => !l.startsWith(name + '=') && l.trim() && !l.startsWith('#'));
        lines.push(`${name}=${trimmedCommand}`);
        fs.write('/configuration/aliases.txt', lines.join('\n'));

        return `Alias '${name}' set to '${trimmedCommand}'`;
    }, 'Create or list aliases', 'alias [name=command]', 'System');

    registry.register('set', (args) => {
        if (args.length === 0) {
            return 'Usage: set <variable> <value>';
        }
        return `Feature not implemented yet`;
    }, 'Set environment variable', 'set <var> <value>', 'System');
}
