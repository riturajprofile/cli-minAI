export class CommandRegistry {
    constructor() {
        this.commands = new Map();
        this.aliases = {};
    }

    register(name, handler, description, usage, category = 'General') {
        this.commands.set(name, {
            handler,
            description,
            usage,
            category
        });
    }

    get(name) {
        return this.commands.get(name);
    }

    getAll() {
        return Array.from(this.commands.entries()).map(([name, cmd]) => ({
            name,
            ...cmd
        }));
    }

    has(name) {
        return this.commands.has(name);
    }

    // Alias management
    setAlias(name, command) {
        this.aliases[name] = command;
    }

    getAlias(name) {
        return this.aliases[name];
    }

    removeAlias(name) {
        delete this.aliases[name];
    }
}

export const registry = new CommandRegistry();
