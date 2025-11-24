import { registry } from './registry.js';

export function registerHelpCommands(fs, ui) {
    registry.register('help', () => {
        const commands = registry.getAll();
        const categories = {};
        commands.forEach(cmd => {
            if (!categories[cmd.category]) categories[cmd.category] = [];
            categories[cmd.category].push(cmd.name);
        });

        let output = '<div class="help-container">';
        output += '<div class="help-header">MinAI Terminal v3.0 Help</div>';

        for (const [cat, cmds] of Object.entries(categories)) {
            output += `<div class="help-category">${cat}</div>`;
            output += `<div class="help-grid">`;
            cmds.forEach(name => {
                output += `<span class="help-item">${name}</span>`;
            });
            output += `</div>`;
        }
        output += '</div>';
        return output;
    }, 'Display help', 'help', 'Info & Config');

    registry.register('man', (args) => {
        const cmdName = args[0];
        if (!cmdName) return 'Usage: man <command>';
        const cmd = registry.get(cmdName);
        if (!cmd) return `No manual entry for ${cmdName}`;

        // Simple formatting for now, can be enhanced
        return `NAME
    ${cmdName} - ${cmd.description}

SYNOPSIS
    ${cmd.usage}

DESCRIPTION
    ${cmd.description}

CATEGORY
    ${cmd.category}`;
    }, 'Display manual', 'man <command>', 'Info & Config');

    registry.register('which', (args) => {
        const cmdName = args[0];
        if (!cmdName) return 'Usage: which <command>';
        if (registry.has(cmdName)) return `/command/${cmdName}`;
        if (registry.getAlias(cmdName)) return `alias: ${registry.getAlias(cmdName)}`;
        return `Command not found: ${cmdName}`;
    }, 'Locate a command', 'which <command>', 'Info & Config');

    registry.register('whatis', (args) => {
        const cmdName = args[0];
        if (!cmdName) return 'Usage: whatis <command>';
        const cmd = registry.get(cmdName);
        if (cmd) return `${cmdName} - ${cmd.description}`;
        return `${cmdName}: nothing appropriate`;
    }, 'Display one-line manual', 'whatis <command>', 'Info & Config');
}
