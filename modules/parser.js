import { registry } from './commands/registry.js';
import { registerFileSystemCommands } from './commands/file-system.js';
import { registerContentCommands } from './commands/content.js';
import { registerSystemCommands } from './commands/system.js';
import { registerNetworkCommands } from './commands/network.js';
import { registerUtilsCommands } from './commands/utils.js';
import { registerHelpCommands } from './commands/help.js';

export class CommandParser {
    constructor(fs, ui, aiHandler) {
        this.fs = fs;
        this.ui = ui;
        this.aiHandler = aiHandler;
        this.config = { mode: 'strict' }; // strict, helpful, smart

        // Register all commands
        registerFileSystemCommands(fs, ui);
        registerContentCommands(fs, ui);
        registerSystemCommands(fs, ui);
        registerNetworkCommands(fs, ui);
        registerUtilsCommands(fs, ui);
        registerHelpCommands(fs, ui);

        // Register AI command
        registry.register('ai', async (args) => {
            // Switch to Agent mode using the UI button
            const agentBtn = document.querySelector('[data-mode="agent"]');
            if (agentBtn) {
                agentBtn.click();
                return 'Switched to Agent mode (✨). Type naturally or use direct commands.';
            }
            return 'Agent mode not available.';
        }, 'Switch to AI Agent mode', 'ai', 'AI');

        // Load aliases from filesystem
        this.loadAliases();
    }

    loadAliases() {
        try {
            const content = this.fs.cat('/configuration/aliases.txt');
            if (!content || content.startsWith('Error')) return;

            const lines = content.split('\n');
            lines.forEach(line => {
                line = line.trim();
                if (!line || line.startsWith('#')) return;

                const match = line.match(/^(\w+)=(.+)$/);
                if (match) {
                    const [, name, command] = match;
                    registry.setAlias(name, command);
                }
            });
        } catch (e) {
            console.error('Failed to load aliases:', e);
        }
    }

    async parse(input) {
        if (!input.trim()) return;

        // Tokenize
        const tokens = input.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
        const args = tokens.map(t => t.replace(/^["']|["']$/g, ''));
        let cmdName = args[0];
        let params = args.slice(1);
        let flags = {};

        // Check aliases
        if (registry.aliases[cmdName]) {
            const aliasParts = registry.aliases[cmdName].split(' ');
            cmdName = aliasParts[0];
            // Merge alias args (simplified)
            if (aliasParts.length > 1) {
                params.unshift(...aliasParts.slice(1));
            }
        }

        // Handle Pipes (|)
        if (input.includes('|')) {
            const parts = input.split('|');
            let previousOutput = '';

            for (const part of parts) {
                const result = await this.parse(part.trim() + (previousOutput ? ' ' + previousOutput : ''));
                previousOutput = result;
            }
            return previousOutput;
        }

        // Handle Redirection (> and >>)
        let redirectFile = null;
        let append = false;

        if (args.includes('>>')) {
            const index = args.indexOf('>>');
            redirectFile = args[index + 1];
            append = true;
            args.splice(index, 2); // Remove >> and filename
            params = args.slice(1); // Re-evaluate params
        } else if (args.includes('>')) {
            const index = args.indexOf('>');
            redirectFile = args[index + 1];
            append = false;
            args.splice(index, 2); // Remove > and filename
            params = args.slice(1); // Re-evaluate params
        }

        // Re-parse flags after modifying args
        flags = {};
        const cleanParams = [];
        params.forEach(p => {
            if (p.startsWith('-')) {
                p.slice(1).split('').forEach(f => flags[f] = true);
            } else {
                cleanParams.push(p);
            }
        });

        // Execute
        let output = '';
        if (registry.has(cmdName)) {
            const command = registry.get(cmdName);
            try {
                output = await command.handler(cleanParams, flags);
            } catch (e) {
                return `Error executing ${cmdName}: ${e.message}`;
            }
        } else if (registry.getAlias(cmdName)) {
            const realCmd = registry.getAlias(cmdName);
            if (registry.has(realCmd)) {
                try {
                    output = await registry.get(realCmd).handler(cleanParams, flags);
                } catch (e) {
                    return `Error executing ${realCmd}: ${e.message}`;
                }
            } else {
                return `Command not found: ${cmdName}`;
            }
        } else {
            return `Command not found: ${cmdName}`;
        }

        // Handle Redirection Output
        if (redirectFile) {
            const result = this.fs.write(redirectFile, output, append);
            return result || ''; // Return empty string on success (no output to terminal)
        }

        return output;
    }
}
