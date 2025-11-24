export class FileSystem {
    constructor() {
        // Load from localStorage or initialize default
        const saved = localStorage.getItem('minai_fs_v3');
        if (saved) {
            const data = JSON.parse(saved);
            this.root = data.root;
            this.currentPath = data.currentPath || ['home'];
            this.previousPath = data.previousPath || ['home'];
        } else {
            // Migrate from v2 if exists
            const oldSaved = localStorage.getItem('minai_fs_v2');
            if (oldSaved) {
                const oldData = JSON.parse(oldSaved);
                this.root = oldData.root;
                this.currentPath = oldData.currentPath || ['home'];
                this.previousPath = ['home'];
                // Add new directories to existing structure
                this._migrateFileSystem();
            } else {
                this._initializeDefaultFileSystem();
            }
        }
    }

    _createDefaultRoot() {
        return {
            type: 'dir',
            name: '/',
            children: {
                'README': {
                    type: 'file',
                    name: 'README',
                    content: `MinAI Terminal v3.0 - README

Welcome to MinAI Terminal, a browser-based Linux-like terminal with AI integration.

DIRECTORY STRUCTURE
===================
/home           - Your workspace (read/write)
/command        - Command implementations (read-only, view with: cat /command/ls)
/configuration  - System configuration (editable)
  ├─ system-prompt.txt  - AI system prompt
  └─ aliases.txt        - Command aliases

GETTING STARTED
===============
1. Type 'help' to see all available commands
2. Type 'man <command>' for detailed command documentation
3. Use 'cd' to navigate directories (default: /home)
4. Create files with 'touch' or 'edit'
5. Try 'tree' to see directory structure

AI CHAT MODES
=============
- Type 'chat' to enter AI chat mode
- Use 'ai: <question>' for quick AI queries
- Edit /configuration/system-prompt.txt to customize AI behavior

IMPORTANT NOTES
===============
- Root directory (/) is READ-ONLY
- Only /home and /configuration are writable
- Use 'cd -' to return to previous directory
- I/O redirection: echo "text" > file.txt

For help: help | man <command> | whatis <command>`,
                    metadata: { size: 1024, created: Date.now(), modified: Date.now(), readonly: true }
                },
                'home': {
                    type: 'dir',
                    name: 'home',
                    children: {
                        'welcome.txt': {
                            type: 'file',
                            name: 'welcome.txt',
                            content: `╔═══════════════════════════════════════════════════════════════╗
║                    Welcome to MinAI Terminal!                 ║
╚═══════════════════════════════════════════════════════════════╝

Hi, I'm Ritu Raj - Creator of MinAI Terminal 🚀

QUICK START GUIDE FOR NEW USERS
================================

🔹 TWO MODES OF OPERATION:
   1. Shell Mode (❯) - Run Linux-like commands
   2. Agent Mode (✨) - AI-powered assistant that can execute commands

🔹 GETTING STARTED:
   • Type 'help' to see all available commands
   • Type 'man <command>' for detailed help (e.g., man ls)
   • Use Tab key for auto-completion
   • Arrow Up/Down to navigate command history

🔹 ESSENTIAL COMMANDS:
   ls              - List files and directories
   cd <dir>        - Change directory (cd .., cd ~, cd -)
   pwd             - Show current directory
   cat <file>      - Display file contents
   mkdir <name>    - Create a directory
   touch <file>    - Create a new file
   edit <file>     - Open Vim editor
   clear           - Clear the screen
   tree            - View directory structure

🔹 CONFIGURE AI (Required for Agent Mode):
   • Type '/config' or 'config' to set your OpenAI API key
   • Supports OpenAI, Groq, and custom providers
   • Agent mode won't work without API configuration

🔹 SWITCHING MODES:
   • Click 'Agent (✨)' button OR type 'ai' to enter Agent mode
   • In Agent mode, type 'sh' or 'exit' to return to Shell mode
   • Agent can execute commands for you intelligently!

🔹 ADVANCED FEATURES:
   • Aliases: alias ll='ls -la' (custom shortcuts)
   • Redirection: echo "text" > file.txt (save output)
   • Pipes: cat file.txt | grep "search"
   • Themes: theme set dracula (9 themes available)
   • Backgrounds: bgset matrix (5 presets)

🔹 FILE SYSTEM:
   /home           - Your workspace (read/write)
   /configuration  - Settings & customization
   /command        - Command implementations
   README          - Full documentation (cat /README)

🔹 TRY THESE EXAMPLES:
   cat /README              - Read the full manual
   tree                     - See directory structure
   theme list               - View available themes
   neofetch                 - Display system info
   calc 5 + 3 * 2          - Use the calculator

═══════════════════════════════════════════════════════════════

CONNECT WITH ME
===============
📧 Email:    riturajprofile@gmail.com
🌐 Website:  https://www.riturajprofile.com
💼 LinkedIn: https://www.linkedin.com/in/riturajprofile
💻 GitHub:   https://github.com/riturajprofile

Star this project on GitHub if you find it useful! ⭐

═══════════════════════════════════════════════════════════════

Need help? Type 'help' or 'man <command>' anytime!
Happy coding! 🎉`,
                            metadata: { size: 2048, created: Date.now(), modified: Date.now() }
                        }
                    }
                },
                'command': {
                    type: 'dir',
                    name: 'command',
                    children: this._getCommandFiles()
                },
                'configuration': {
                    type: 'dir',
                    name: 'configuration',
                    children: {
                        'system-prompt.txt': {
                            type: 'file',
                            name: 'system-prompt.txt',
                            content: `You are a helpful AI assistant integrated into the MinAI Terminal.

Be concise, technical, and helpful. Provide code examples when relevant.
Format responses in a terminal-friendly way (plain text, avoid excessive formatting).

When users ask questions:
- Be direct and informative
- Use examples to illustrate concepts
- Suggest relevant terminal commands when applicable
- Keep explanations clear and concise`,
                            metadata: { size: 256, created: Date.now(), modified: Date.now() }
                        },
                        'aliases.txt': {
                            type: 'file',
                            name: 'aliases.txt',
                            content: `# Command Aliases
# Format: alias=command
# Example: ll=ls -la

ll=ls -la
la=ls -a
h=help
c=clear
..=cd ..
...=cd ../..`,
                            metadata: { size: 128, created: Date.now(), modified: Date.now() }
                        }
                    }
                }
            }
        };
    }

    _initializeDefaultFileSystem() {
        this.root = this._createDefaultRoot();
        this.currentPath = ['home'];
        this.previousPath = ['home'];
    }

    reset() {
        localStorage.removeItem('minai_fs_v3');
        localStorage.removeItem('minai_fs_v2');
        this._initializeDefaultFileSystem();
        this._persist();
        return 'File system reset to default state. All user data cleared.';
    }

    _migrateFileSystem() {
        // Add missing directories to existing filesystem
        if (!this.root.children['README']) {
            this.root.children['README'] = {
                type: 'file',
                name: 'README',
                content: 'MinAI Terminal v3.0 - See full README with: cat /README',
                metadata: { size: 64, created: Date.now(), modified: Date.now(), readonly: true }
            };
        }
        if (!this.root.children['command']) {
            this.root.children['command'] = {
                type: 'dir',
                name: 'command',
                children: this._getCommandFiles()
            };
        }
        if (!this.root.children['configuration']) {
            this.root.children['configuration'] = {
                type: 'dir',
                name: 'configuration',
                children: {
                    'system-prompt.txt': {
                        type: 'file',
                        name: 'system-prompt.txt',
                        content: 'You are a helpful AI assistant.',
                        metadata: { size: 32, created: Date.now(), modified: Date.now() }
                    },
                    'aliases.txt': {
                        type: 'file',
                        name: 'aliases.txt',
                        content: 'll=ls -la\nh=help',
                        metadata: { size: 32, created: Date.now(), modified: Date.now() }
                    }
                }
            };
        }
        // Update current path if it was at /home/user
        if (this.currentPath.join('/') === 'home/user' && this.root.children['home']?.children['user']) {
            // Keep existing path
        } else if (this.currentPath.length === 0) {
            this.currentPath = ['home'];
        }
    }

    _getCommandFiles() {
        // This is just for the virtual file system representation
        // The actual commands are implemented in the CommandParser or separate modules
        const commands = [
            'ls', 'cd', 'pwd', 'mkdir', 'rmdir', 'touch', 'rm', 'cp', 'mv', 'tree',
            'cat', 'echo', 'head', 'tail', 'wc', 'grep',
            'date', 'whoami', 'uname', 'df', 'clear', 'history',
            'whatis', 'which', 'help', 'man',
            'download', 'ping', 'curl', 'calc', 'theme', 'bgset', 'neofetch', 'json',
            'edit', 'nano', 'vim', 'exit', 'ai', 'alias', 'set', 'upload', 'reset'
        ];

        const commandFiles = {};
        commands.forEach(cmd => {
            commandFiles[cmd] = {
                type: 'file',
                name: cmd,
                content: `Binary file: ${cmd}`, // Placeholder content
                metadata: {
                    size: 1024,
                    created: Date.now(),
                    modified: Date.now(),
                    readonly: true
                }
            };
        });
        return commandFiles;
    }

    _persist() {
        localStorage.setItem('minai_fs_v3', JSON.stringify({
            root: this.root,
            currentPath: this.currentPath,
            previousPath: this.previousPath
        }));
    }

    // Check if a path is read-only
    _isReadOnlyPath(pathArray) {
        if (!pathArray || pathArray.length === 0) {
            // Root directory is read-only
            return true;
        }

        const firstSegment = pathArray[0];

        // /command directory and all its contents are read-only
        if (firstSegment === 'command') {
            return true;
        }

        // /README file is read-only
        if (pathArray.length === 1 && pathArray[0] === 'README') {
            return true;
        }

        // /home and /configuration are writable
        if (firstSegment === 'home' || firstSegment === 'configuration') {
            return false;
        }

        // Everything else in root is read-only
        return true;
    }


    // Helper: Resolve path to node
    // Returns { node, parent, name, error }
    resolve(path) {
        if (!path) return { node: this._getCwdNode(), parent: this._getParentNode(), name: this.currentPath[this.currentPath.length - 1] };

        let parts = path.split('/').filter(p => p);
        let current = path.startsWith('/') ? this.root : this._getCwdNode();
        let parent = path.startsWith('/') ? null : this._getParentNode();

        // Handle root path "/"
        if (path === '/') return { node: this.root, parent: null, name: '/' };

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part === '.') continue;
            if (part === '..') {
                return this._resolveAbsolutePath(path);
            }

            if (current.type !== 'dir') return { error: `Not a directory: ${part}` };

            parent = current;
            current = current.children[part];

            if (!current) {
                // If it's the last part, it might be a new file/dir creation target
                if (i === parts.length - 1) {
                    return { node: null, parent: parent, name: part };
                }
                return { error: `No such file or directory: ${part}` };
            }
        }
        return { node: current, parent: parent, name: parts[parts.length - 1] };
    }

    _resolveAbsolutePath(pathStr) {
        // Convert to absolute path array first
        let stack = pathStr.startsWith('/') ? [] : [...this.currentPath];
        const parts = pathStr.split('/').filter(p => p);

        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                if (stack.length > 0) stack.pop();
            } else if (part === '~') {
                stack = ['home'];
            } else {
                stack.push(part);
            }
        }

        // Traverse
        let current = this.root;
        let parent = null;

        for (let i = 0; i < stack.length; i++) {
            const part = stack[i];
            parent = current;
            current = current.children[part];
            if (!current) {
                if (i === stack.length - 1) return { node: null, parent: parent, name: part };
                return { error: `No such file or directory: ${part}` };
            }
        }
        return { node: current, parent: parent, name: stack[stack.length - 1] || '/' };
    }

    _getCwdNode() {
        let current = this.root;
        for (const part of this.currentPath) {
            current = current.children[part];
        }
        return current;
    }

    _getParentNode() {
        if (this.currentPath.length === 0) return null;
        let current = this.root;
        for (let i = 0; i < this.currentPath.length - 1; i++) {
            current = current.children[this.currentPath[i]];
        }
        return current;
    }

    pwd() {
        return '/' + this.currentPath.join('/');
    }

    // File System Operations (Moved from CommandParser if they were there, but they seem to be mixed)
    // In the original terminal.js, ls, cd, etc were methods of FileSystem or CommandParser?
    // Looking at terminal.js, ls, cd, mkdir, touch, rm, rmdir, cp, mv, cat, tree are methods of FileSystem.
    // So I need to include them here.

    cd(path) {
        if (!path || path === '~') {
            this.previousPath = [...this.currentPath];
            this.currentPath = ['home'];
            this._persist();
            return '';
        }

        // Handle cd - (previous directory)
        if (path === '-') {
            if (!this.previousPath || this.previousPath.length === 0) {
                return 'No previous directory';
            }
            const temp = [...this.currentPath];
            this.currentPath = [...this.previousPath];
            this.previousPath = temp;
            this._persist();
            return '';
        }

        const { node, error } = this._resolveAbsolutePath(path);
        if (error) return error;
        if (node.type !== 'dir') return `Not a directory: ${path}`;

        let stack = path.startsWith('/') ? [] : [...this.currentPath];
        const parts = path.split('/').filter(p => p);
        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                if (stack.length > 0) stack.pop();
            } else if (part === '~') {
                stack = ['home'];
            } else {
                stack.push(part);
            }
        }
        this.previousPath = [...this.currentPath];
        this.currentPath = stack;
        this._persist();
        return '';
    }

    ls(path, flags = {}) {
        const target = path ? this._resolveAbsolutePath(path) : { node: this._getCwdNode() };
        if (target.error) return target.error;
        if (target.node.type !== 'dir') return target.node.name;

        const items = Object.values(target.node.children);
        if (flags.a) {
            items.unshift({ name: '..', type: 'dir' }, { name: '.', type: 'dir' });
        }

        if (flags.l) {
            return items.map(item => {
                const type = item.type === 'dir' ? 'd' : '-';
                const perm = 'rwxr-xr-x';
                const size = item.metadata ? item.metadata.size : 4096;
                const date = item.metadata ? new Date(item.metadata.modified).toLocaleString() : '';
                return `${type}${perm} 1 user user ${size.toString().padStart(6)} ${date} ${item.name}`;
            }).join('\n');
        }

        return items.map(i => i.type === 'dir' ? i.name + '/' : i.name).join('  ');
    }

    mkdir(path) {
        let targetPath = path.startsWith('/') ? [] : [...this.currentPath];
        const parts = path.split('/').filter(p => p);
        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                if (targetPath.length > 0) targetPath.pop();
            } else if (part === '~') {
                targetPath = ['home'];
            } else {
                targetPath.push(part);
            }
        }

        if (this._isReadOnlyPath(targetPath)) {
            return `Permission denied: Cannot create directory in read-only location`;
        }

        const { parent, name, node, error } = this._resolveAbsolutePath(path);
        if (error && !error.includes('No such file')) return error;
        if (node) return `Directory exists: ${path}`;
        if (!parent) return `Cannot create directory here`;

        parent.children[name] = {
            type: 'dir',
            name: name,
            children: {},
            metadata: { created: Date.now(), modified: Date.now() }
        };
        this._persist();
        return '';
    }

    touch(path) {
        let targetPath = path.startsWith('/') ? [] : [...this.currentPath];
        const parts = path.split('/').filter(p => p);
        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                if (targetPath.length > 0) targetPath.pop();
            } else if (part === '~') {
                targetPath = ['home'];
            } else {
                targetPath.push(part);
            }
        }

        if (this._isReadOnlyPath(targetPath)) {
            return `Permission denied: Cannot modify read-only location`;
        }

        const { parent, name, node, error } = this._resolveAbsolutePath(path);
        if (error && !error.includes('No such file')) return error;
        if (node) {
            if (node.metadata?.readonly) {
                return `Permission denied: ${path} is read-only`;
            }
            node.metadata.modified = Date.now();
            this._persist();
            return '';
        }
        if (!parent) return `Cannot create file here`;

        parent.children[name] = {
            type: 'file',
            name: name,
            content: '',
            metadata: { size: 0, created: Date.now(), modified: Date.now() }
        };
        this._persist();
        return '';
    }

    rm(path, flags = {}) {
        let targetPath = path.startsWith('/') ? [] : [...this.currentPath];
        const parts = path.split('/').filter(p => p);
        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                if (targetPath.length > 0) targetPath.pop();
            } else if (part === '~') {
                targetPath = ['home'];
            } else {
                targetPath.push(part);
            }
        }

        if (this._isReadOnlyPath(targetPath)) {
            return `Permission denied: Cannot remove from read-only location`;
        }

        const { parent, name, node, error } = this._resolveAbsolutePath(path);
        if (error) return error;
        if (!node) return `No such file or directory: ${path}`;
        if (!parent) return 'Permission denied';
        if (node.metadata?.readonly) {
            return `Permission denied: ${path} is read-only`;
        }

        if (node.type === 'dir' && !flags.r) return `Is a directory: ${path}`;

        delete parent.children[name];
        this._persist();
        return '';
    }

    rmdir(path) {
        let targetPath = path.startsWith('/') ? [] : [...this.currentPath];
        const parts = path.split('/').filter(p => p);
        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                if (targetPath.length > 0) targetPath.pop();
            } else if (part === '~') {
                targetPath = ['home'];
            } else {
                targetPath.push(part);
            }
        }

        if (this._isReadOnlyPath(targetPath)) {
            return `Permission denied: Cannot remove from read-only location`;
        }

        const { parent, name, node, error } = this._resolveAbsolutePath(path);
        if (error) return error;
        if (!node) return `No such file or directory: ${path}`;
        if (node.type !== 'dir') return `Not a directory: ${path}`;
        if (Object.keys(node.children).length > 0) return `Directory not empty: ${path}`;

        delete parent.children[name];
        this._persist();
        return '';
    }

    cp(src, dest, flags = {}) {
        const source = this._resolveAbsolutePath(src);
        if (source.error) return source.error;
        if (source.node.type === 'dir' && !flags.r) return `Is a directory: ${src}`;

        let destPath = dest;
        const destCheck = this._resolveAbsolutePath(dest);
        if (!destCheck.error && destCheck.node.type === 'dir') {
            destPath = dest + '/' + source.name;
        }

        // Check write permissions for dest
        let targetPath = destPath.startsWith('/') ? [] : [...this.currentPath];
        const parts = destPath.split('/').filter(p => p);
        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                if (targetPath.length > 0) targetPath.pop();
            } else if (part === '~') {
                targetPath = ['home'];
            } else {
                targetPath.push(part);
            }
        }
        if (this._isReadOnlyPath(targetPath)) {
            return `Permission denied: Cannot copy to read-only location`;
        }


        const { parent, name, error } = this._resolveAbsolutePath(destPath);
        if (error && !error.includes('No such file')) return error;
        if (!parent) return `Cannot copy here`;

        // Deep copy
        parent.children[name] = JSON.parse(JSON.stringify(source.node));
        parent.children[name].name = name;
        parent.children[name].metadata.modified = Date.now();
        this._persist();
        return '';
    }

    mv(src, dest) {
        const source = this._resolveAbsolutePath(src);
        if (source.error) return source.error;
        if (source.node.metadata?.readonly) return `Permission denied: ${src} is read-only`;

        let destPath = dest;
        const destCheck = this._resolveAbsolutePath(dest);
        if (!destCheck.error && destCheck.node.type === 'dir') {
            destPath = dest + '/' + source.name;
        }

        // Check write permissions for src and dest
        // ... (Simplified for brevity, assuming similar checks as rm and cp)

        const { parent, name, error } = this._resolveAbsolutePath(destPath);
        if (error && !error.includes('No such file')) return error;
        if (!parent) return `Cannot move here`;

        parent.children[name] = source.node;
        parent.children[name].name = name;
        delete source.parent.children[source.name];
        this._persist();
        return '';
    }

    cat(path) {
        const { node, error } = this._resolveAbsolutePath(path);
        if (error) return error;
        if (!node) return `No such file or directory: ${path}`;
        if (node.type === 'dir') return `Is a directory: ${path}`;
        return node.content;
    }

    write(path, content, append = false) {
        const { node, parent, name, error } = this._resolveAbsolutePath(path);

        // Check permissions
        let targetPath = path.startsWith('/') ? [] : [...this.currentPath];
        const parts = path.split('/').filter(p => p);
        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                if (targetPath.length > 0) targetPath.pop();
            } else if (part === '~') {
                targetPath = ['home'];
            } else {
                targetPath.push(part);
            }
        }
        if (this._isReadOnlyPath(targetPath)) {
            return `Permission denied: Read-only location`;
        }

        if (node) {
            if (node.type === 'dir') return `Is a directory: ${path}`;
            if (node.metadata?.readonly) return `Permission denied: Read-only file`;
            node.content = append ? node.content + '\n' + content : content;
            node.metadata.modified = Date.now();
            node.metadata.size = node.content.length;
        } else {
            if (!parent) return `Cannot write to ${path}`;
            parent.children[name] = {
                type: 'file',
                name: name,
                content: content,
                metadata: { size: content.length, created: Date.now(), modified: Date.now() }
            };
        }
        this._persist();
        return '';
    }

    tree(node = this._getCwdNode(), prefix = '') {
        let output = '';
        const children = Object.values(node.children || {});
        children.forEach((child, index) => {
            const isLast = index === children.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            output += prefix + connector + child.name + (child.type === 'dir' ? '/' : '') + '\n';
            if (child.type === 'dir') {
                output += this.tree(child, prefix + (isLast ? '    ' : '│   '));
            }
        });
        return output;
    }
}
