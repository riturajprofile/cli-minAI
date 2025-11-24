import { registry } from './registry.js';

export function registerContentCommands(fs, ui) {
    registry.register('cat', (args) => {
        return fs.cat(args[0]);
    }, 'Display file contents', 'cat <file>', 'Content');

    registry.register('echo', (args) => {
        return args.join(' ');
    }, 'Display text', 'echo <text>', 'Content');

    registry.register('head', (args) => {
        const content = fs.cat(args[0]);
        if (content.startsWith('Error')) return content;
        return content.split('\n').slice(0, 10).join('\n');
    }, 'Output first part of file', 'head <file>', 'Content');

    registry.register('tail', (args) => {
        const content = fs.cat(args[0]);
        if (content.startsWith('Error')) return content;
        const lines = content.split('\n');
        return lines.slice(Math.max(lines.length - 10, 0)).join('\n');
    }, 'Output last part of file', 'tail <file>', 'Content');

    registry.register('wc', (args, flags) => {
        const content = fs.cat(args[0]);
        if (content.startsWith('Error') || content.startsWith('Is a')) return content;
        const lines = content.split('\n').length;
        const words = content.split(/\s+/).length;
        const chars = content.length;
        if (flags.l) return `${lines} ${args[0]}`;
        if (flags.w) return `${words} ${args[0]}`;
        if (flags.c) return `${chars} ${args[0]}`;
        return `${lines} ${words} ${chars} ${args[0]}`;
    }, 'Word, line, character count', 'wc [options] <file>', 'Content');

    registry.register('grep', (args, flags) => {
        const pattern = args[0];
        const path = args[1];
        const content = fs.cat(path);
        if (content.startsWith('Error')) return content;
        const lines = content.split('\n');
        const regex = new RegExp(pattern, flags.i ? 'i' : '');
        return lines.filter(l => regex.test(l)).join('\n');
    }, 'Search for pattern in file', 'grep [options] <pattern> <file>', 'Content');

    registry.register('edit', (args) => {
        const fileContent = fs.cat(args[0]);
        ui.openEditor(args[0], fileContent.startsWith('Error') ? '' : fileContent);
    }, 'Open text editor', 'edit <file>', 'Content');

    // Aliases for edit
    registry.setAlias('vim', 'edit');
    registry.setAlias('nano', 'edit');
}
