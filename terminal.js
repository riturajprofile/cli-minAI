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
                            content: `Hi, I'm Ritu Raj.
                            for more information visit my portfolio website : www.riturajprofile.me.
                            github : github.com/riturajprofile
                            linkedin : linkedin.com/in/riturajprofile
                            `,
                            metadata: { size: 512, created: Date.now(), modified: Date.now() }
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
        const commands = {
            'ls': `Command: ls - List directory contents

SYNOPSIS
    ls [OPTION]... [FILE]...

DESCRIPTION
    List information about files and directories. Lists the current directory by default.

OPTIONS
    -l      Use long listing format (shows permissions, size, date)
    -a      Show all files including hidden files (. and ..)

IMPLEMENTATION
    1. Resolve target path (default: current directory)
    2. Get directory node from filesystem tree
    3. Retrieve all children of directory node
    4. If -a flag: prepend '.' and '..' entries
    5. If -l flag: format with permissions, size, date
    6. Otherwise: display names with '/' suffix for directories
    7. Return formatted output

EXAMPLES
    ls              List current directory
    ls -l           Long format listing
    ls -la          Long format with hidden files
    ls /home        List /home directory

SEE ALSO
    tree, cd, pwd`,

            'cat': `Command: cat - Concatenate and display file contents

SYNOPSIS
    cat [FILE]

DESCRIPTION
    Display complete contents of a file to standard output.
    Can be used with redirection to copy files.

IMPLEMENTATION
    1. Resolve file path to filesystem node
    2. Check if node exists and is a file (not directory)
    3. Return node.content as output
    4. Handle errors: file not found, is a directory

EXAMPLES
    cat file.txt            Display file contents
    cat /README             Display README file
    cat file.txt > new.txt  Copy file using redirection

SEE ALSO
    head, tail, echo, grep`,

            'echo': `Command: echo - Display a line of text

SYNOPSIS
    echo [TEXT]...

DESCRIPTION
    Display the given text to standard output.
    Commonly used with redirection to write files.
    ALL arguments are treated as TEXT, not commands.

IMPLEMENTATION
    1. Join all parameters with spaces
    2. Return as string output
    3. Do NOT execute any parameters as commands
    4. Handle output redirection if present

IMPORTANT
    echo ls         → Outputs the text "ls" (does NOT execute ls)
    echo "hello"    → Outputs: hello
    echo a b c      → Outputs: a b c

EXAMPLES
    echo Hello World           Display text
    echo "Text" > file.txt     Write to file
    echo "More" >> file.txt    Append to file

SEE ALSO
    cat, printf (not implemented)`,

            'cd': `Command: cd - Change directory

SYNOPSIS
    cd [DIRECTORY]

DESCRIPTION
    Change the current working directory.
    Special paths: ~ (home), .. (parent), - (previous)

IMPLEMENTATION
    1. If no argument: cd to /home
    2. If '-': switch to previous directory
    3. If '~': cd to /home
    4. Resolve target path
    5. Verify target is a directory
    6. Save current path as previous path
    7. Update current path to target
    8. Persist filesystem state

EXAMPLES
    cd              Go to home
    cd /command     Go to /command directory
    cd ..           Go to parent directory
    cd -            Go to previous directory

SEE ALSO
    pwd, ls`,

            'pwd': `Command: pwd - Print working directory

SYNOPSIS
    pwd

DESCRIPTION
    Print the absolute path of the current working directory.

IMPLEMENTATION
    1. Get current path array from filesystem state
    2. Join with '/' separator
    3. Prepend '/' for absolute path
    4. Return path string

EXAMPLES
    pwd             Display current directory

SEE ALSO
    cd, ls`,

            'mkdir': `Command: mkdir - Create directory

SYNOPSIS
    mkdir [DIRECTORY]

DESCRIPTION
    Create new directory if it doesn't exist.
    Only works in writable locations (/home, /configuration).

IMPLEMENTATION
    1. Resolve target path
    2. Check if parent exists
    3. Check write permissions (not in /, /command, /README)
    4. Verify directory doesn't already exist
    5. Create new directory node
    6. Persist filesystem

EXAMPLES
    mkdir projects          Create directory in current location
    mkdir /home/docs        Create in /home

SEE ALSO
    rmdir, touch, ls`,

            'touch': `Command: touch - Create file or update timestamp

SYNOPSIS
    touch [FILE]

DESCRIPTION
    Create empty file or update modification time of existing file.
    Only works in writable locations.

IMPLEMENTATION
    1. Resolve target path
    2. If file exists: update metadata.modified timestamp
    3. If not exists: create new file node with empty content
    4. Check write permissions
    5. Persist filesystem

EXAMPLES
    touch newfile.txt       Create empty file
    touch existing.txt      Update timestamp

SEE ALSO
    mkdir, edit, rm`,

            'rm': `Command: rm - Remove files or directories

SYNOPSIS
    rm [OPTION] [FILE]...

DESCRIPTION
    Remove files or directories.
    Use -r flag for directories.

OPTIONS
    -r      Remove directories and contents recursively

IMPLEMENTATION
    1. Resolve target path
    2. Check write permissions (not in protected areas)
    3. If directory and no -r flag: error
    4. Delete node from parent's children
    5. Persist filesystem

EXAMPLES
    rm file.txt             Remove file
    rm -r directory         Remove directory and contents

SEE ALSO
    rmdir, touch`,

            'edit': `Command: edit - Open Vim-like text editor

SYNOPSIS
    edit [FILE]
    vim [FILE]
    nano [FILE]

DESCRIPTION
    Open file in Vim-like modal editor.
    Creates file if it doesn't exist.

VIM MODES
    Normal Mode (default)
        h,j,k,l     Navigate left, down, up, right
        i           Enter insert mode (before cursor)
        a           Enter insert mode (after cursor)
        o           New line below and insert
        :           Enter command mode
        
    Insert Mode
        [type text]
        ESC         Return to normal mode
        
    Command Mode
        :w          Save file
        :q          Quit (if no changes)
        :wq         Save and quit
        :q!         Quit without saving

IMPLEMENTATION
    1. Resolve file path (create if doesn't exist)
    2. Load file content
    3. Open Vim modal editor UI
    4. Handle keyboard events for mode switching
    5. On save: write content back to filesystem

EXAMPLES
    edit file.txt           Open file for editing
    vim /home/notes.md      Edit with Vim
    edit new.txt            Create and edit new file

SEE ALSO
    cat, echo`,

            'help': `Command: help - Display available commands

SYNOPSIS
    help

DESCRIPTION
    Display categorized list of all available terminal commands.

IMPLEMENTATION
    1. Generate formatted HTML output
    2. Group commands by category
    3. Include usage hints
    4. Return formatted help text

EXAMPLES
    help                    Show all commands

SEE ALSO
    man, whatis, which`,

            'man': `Command: man - Display command manual

SYNOPSIS
    man [COMMAND]

DESCRIPTION
    Display detailed manual page for specified command.
    Includes description, synopsis, options, and examples.

IMPLEMENTATION
    1. Look up command in manuals database
    2. Format and return manual entry
    3. If not found: return error message

EXAMPLES
    man ls                  Show ls manual
    man edit                Show editor manual

SEE ALSO
    help, whatis`,

            'tree': `Command: tree - Display directory tree

SYNOPSIS
    tree [DIRECTORY]

DESCRIPTION
    Recursively list directory contents in tree format.

IMPLEMENTATION
    1. Start from current directory (or specified)
    2. Recursively traverse children
    3. Use box-drawing characters (├── └──)
    4. Show directories and files in tree structure

EXAMPLES
    tree                    Show tree from current directory
    tree /command           Show /command tree

SEE ALSO
    ls, find (not implemented)`,

            'grep': `Command: grep - Search for patterns in files

SYNOPSIS
    grep [OPTION] PATTERN [FILE]

DESCRIPTION
    Search for lines matching pattern in file.

OPTIONS
    -i      Case-insensitive search

IMPLEMENTATION
    1. Read file contents
    2. Split into lines
    3. Create regex from pattern
    4. Filter lines matching regex
    5. Return matching lines

EXAMPLES
    grep "error" log.txt        Find "error" in file
    grep -i "warning" log.txt   Case-insensitive search

SEE ALSO
    cat, wc`,

            'alias': `Command: alias - Create command aliases

SYNOPSIS
    alias [NAME=[COMMAND]]

DESCRIPTION
    Create or display command aliases.
    Aliases are stored in /configuration/aliases.txt

IMPLEMENTATION
    1. If no arguments: display all aliases
    2. If NAME=COMMAND format: create/update alias
    3. Write to /configuration/aliases.txt
    4. Reload aliases in command parser

EXAMPLES
    alias                   List all aliases
    alias ll='ls -la'       Create ll alias

SEE ALSO
    unalias (not implemented)`,

            'ping': `Command: ping - Send ICMP ECHO_REQUEST to network hosts

SYNOPSIS
    ping [HOST]

DESCRIPTION
    Send ICMP ECHO_REQUEST to network hosts.
    Note: This is a simulation in the browser.

IMPLEMENTATION
    1. Simulate sending packets
    2. Wait for simulated response
    3. Print stats

EXAMPLES
    ping google.com         Ping google.com
    ping localhost          Ping localhost`,

            'curl': `Command: curl - Transfer a URL

SYNOPSIS
    curl [options] [URL]

DESCRIPTION
    Transfer data from a server.
    Supports HTTP/HTTPS protocols.
    Note: Subject to browser CORS policies.

OPTIONS
    -I      Fetch the HTTP-header only
    -o      Write output to <file> instead of stdout

EXAMPLES
    curl https://api.example.com/data
    curl -I https://google.com
    curl https://example.com/data.json -o data.json`,

            'bgset': `Command: bgset - Set terminal background

SYNOPSIS
    bgset [preset|url|none|list]

DESCRIPTION
    Set or change the terminal background image.
    Choose from curated presets or use custom URLs.

OPTIONS
    list        Show all available presets
    none        Remove background image
    preset      Use a preset (cyberpunk, matrix, etc.)
    url         Use custom image URL

EXAMPLES
    bgset list                  List all presets
    bgset cyberpunk             Use cyberpunk preset
    bgset https://image.jpg     Use custom URL
    bgset none                  Remove background`,

            'calc': `Command: calc - Simple calculator

SYNOPSIS
    calc [EXPRESSION]

DESCRIPTION
    Evaluate mathematical expressions.
    Supports basic arithmetic (+, -, *, /, %, ^, ()) and Math functions.

EXAMPLES
    calc 2 + 2
    calc 10 * 5
    calc Math.sqrt(16)`,

            'theme': `Command: theme - Change terminal theme

SYNOPSIS
    theme [list | set <name>]

DESCRIPTION
    Change the color scheme of the terminal.

EXAMPLES
    theme list              List available themes
    theme set ubuntu        Switch to Ubuntu theme
    theme set cyberpunk     Switch to Cyberpunk theme`,

            'upload': `Command: upload - Upload file from system
            
SYNOPSIS
    upload

DESCRIPTION
    Opens system file picker to upload a file to the current directory.
    Supports text files and images.`,



            'neofetch': `Command: neofetch - System information

SYNOPSIS
    neofetch

DESCRIPTION
    Displays system information and an ASCII logo.
    Shows OS, Host, Kernel, Uptime, Resolution, etc.`
        };

        // Create file nodes for each command
        const commandFiles = {};
        for (const [cmd, content] of Object.entries(commands)) {
            commandFiles[cmd] = {
                type: 'file',
                name: cmd,
                content: content,
                metadata: {
                    size: content.length,
                    created: Date.now(),
                    modified: Date.now(),
                    readonly: true
                }
            };
        }
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
                // This is tricky in a tree without parent pointers. 
                // Simplification: We only support '..' if we are tracking the path stack or if we implement parent pointers.
                // For now, let's assume '..' only works if we are resolving from CWD relative path logic or we need a full path parser.
                // Let's implement a robust absolute path resolver instead.
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

        // Reconstruct path stack
        // This is a bit hacky, ideally we'd store parent pointers.
        // For now, we rely on the fact that _resolveAbsolutePath returns a valid node.
        // But we need to update this.currentPath.
        // Let's re-resolve the absolute path string to get the stack.

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
        // Compute target path array for read-only check
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

        // Check if path is read-only
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
        // Compute target path array for read-only check
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

        // Check if path is read-only
        if (this._isReadOnlyPath(targetPath)) {
            return `Permission denied: Cannot modify read-only location`;
        }

        const { parent, name, node, error } = this._resolveAbsolutePath(path);
        if (error && !error.includes('No such file')) return error;
        if (node) {
            // Check if file itself is marked readonly
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
        // Compute target path array for read-only check
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

        // Check if path is read-only
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
        // Compute target path array for read-only check
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

        // Check if path is read-only
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

    cat(path) {
        const { node, error } = this._resolveAbsolutePath(path);
        if (error) return error;
        if (node.type === 'dir') return `Is a directory: ${path}`;
        return node.content;
    }

    write(path, content, append = false) {
        // Compute target path array for read-only check
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

        // Check if path is read-only
        if (this._isReadOnlyPath(targetPath)) {
            return `Permission denied: Cannot write to read-only location`;
        }

        const { parent, name, node, error } = this._resolveAbsolutePath(path);
        if (error && !error.includes('No such file')) return error;

        if (node) {
            if (node.type === 'dir') return `Is a directory: ${path}`;
            if (node.metadata?.readonly) {
                return `Permission denied: ${path} is read-only`;
            }
            node.content = append ? node.content + content : content;
            node.metadata.size = node.content.length;
            node.metadata.modified = Date.now();
        } else {
            if (!parent) return `Cannot write here`;
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
        const keys = Object.keys(node.children);
        keys.forEach((key, index) => {
            const isLast = index === keys.length - 1;
            const item = node.children[key];
            output += `${prefix}${isLast ? '└── ' : '├── '}${item.name}\n`;
            if (item.type === 'dir') {
                output += this.tree(item, prefix + (isLast ? '    ' : '│   '));
            }
        });
        return output;
    }

    cp(srcPath, destPath, flags = {}) {
        const src = this._resolveAbsolutePath(srcPath);
        if (src.error) return src.error;

        const dest = this._resolveAbsolutePath(destPath);

        // Case 1: Dest exists and is a dir -> copy into it
        if (dest.node && dest.node.type === 'dir') {
            const newName = src.node.name;
            if (dest.node.children[newName]) return `Destination exists: ${newName}`;
            // Deep copy
            dest.node.children[newName] = JSON.parse(JSON.stringify(src.node));
            this._persist();
            return '';
        }

        // Case 2: Dest does not exist -> copy as new name
        if (!dest.node && dest.parent) {
            dest.parent.children[dest.name] = JSON.parse(JSON.stringify(src.node));
            this._persist();
            return '';
        }

        return `Invalid destination: ${destPath}`;
    }

    mv(srcPath, destPath) {
        const res = this.cp(srcPath, destPath, { r: true });
        if (res) return res; // Error
        return this.rm(srcPath, { r: true });
    }
}

export class CommandParser {
    constructor(fs, uiHandler, aiHandler) {
        this.fs = fs;
        this.ui = uiHandler;
        this.aiHandler = aiHandler;
        this.mode = 'command'; // 'command' | 'chat'
        this.config = {
            mode: 'smart', // 'strict', 'helpful', 'smart'
            typoTolerance: 2
        };
        this.validCommands = [
            'ls', 'cd', 'pwd', 'mkdir', 'rmdir', 'touch', 'rm', 'cp', 'mv', 'tree',
            'cat', 'echo', 'head', 'tail', 'wc', 'grep',
            'date', 'whoami', 'uname', 'df', 'clear', 'history',
            'whatis', 'which', 'help', 'man',
            'download', 'ping', 'curl', 'calc', 'theme', 'bgset', 'neofetch', 'json',
            'edit', 'nano', 'vim', 'exit', 'ai', 'alias', 'set', 'upload', 'reset'
        ];

        // Load aliases from configuration file
        this.aliases = this._loadAliases();
    }

    _loadAliases() {
        const defaultAliases = {
            'h': 'help',
            '?': 'help',
            'ask': 'chat',
            'ai:': 'ai',
            '/help': 'help',
            '/clear': 'clear',
            '/h': 'help'
        };

        try {
            const content = this.fs.cat('/configuration/aliases.txt');
            if (content && !content.startsWith('Error')) {
                const lines = content.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    // Skip comments and empty lines
                    if (!trimmed || trimmed.startsWith('#')) continue;

                    // Parse alias=command format
                    const match = trimmed.match(/^([^=]+)=(.+)$/);
                    if (match) {
                        const name = match[1].trim();
                        const command = match[2].trim();
                        defaultAliases[name] = command;
                    }
                }
            }
        } catch (e) {
            // If can't load, just use defaults
        }

        return defaultAliases;
    }

    _saveAliases() {
        const lines = ['# Command Aliases', '# Format: alias=command', '# Example: ll=ls -la', ''];
        for (const [name, command] of Object.entries(this.aliases)) {
            // Skip internal aliases (those starting with /)
            if (!name.startsWith('/') && name !== 'h' && name !== '?' && name !== 'ai' && name !== 'ask') {
                lines.push(`${name}=${command}`);
            }
        }

        // Also write back the defaults
        const defaults = ['ll=ls -la', 'la=ls -a', 'h=help', 'c=clear', '..=cd ..', '...=cd ../..'];
        const existing = lines.slice(4); // Skip header
        for (const def of defaults) {
            const [name] = def.split('=');
            if (!existing.some(l => l.startsWith(name + '='))) {
                lines.push(def);
            }
        }

        const content = lines.join('\n');
        return this.fs.write('/configuration/aliases.txt', content, false);
    }

    async parse(input) {
        if (!input.trim()) return;

        // 1. Check Mode
        if (this.mode === 'chat') {
            if (input.trim().toLowerCase() === 'exit' || input.trim().toLowerCase() === 'command') {
                this.mode = 'command';
                this.ui.print('Switched to Command Mode.', 'system');
                this.ui.setPrompt(); // Reset to default
                return;
            }
            return { type: 'chat', content: input };
        }

        // 2. Tokenize first to check if it's a command
        const tokens = input.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
        const args = tokens.map(t => t.replace(/^["']|["']$/g, ''));
        let cmd = args[0];

        // Handle empty input
        if (!cmd) return;

        // 3. Check for explicit AI prefix (only if followed by space or @)
        if (input.startsWith('@') || input.match(/^ask:\s/)) {
            return { type: 'chat', content: input.replace(/^(ask:\s*|@)/, '') };
        }

        // 4. Check Whitelist & Aliases
        let resolvedCmd = cmd;
        let params = args.slice(1);
        let flags = {};

        // Resolve Alias
        if (this.aliases[cmd]) {
            const aliasParts = this.aliases[cmd].split(' ');
            resolvedCmd = aliasParts[0];
            // If alias has flags, merge them (simple handling)
            if (aliasParts.length > 1) {
                const aliasArgs = aliasParts.slice(1);
                // Prepend alias args to params
                // This is a simplification. Ideally we re-tokenize the alias expansion + params.
                // For 'll' -> 'ls -la', we just want to set flags.
                aliasArgs.forEach(arg => {
                    if (arg.startsWith('-')) {
                        arg.slice(1).split('').forEach(f => flags[f] = true);
                    } else {
                        params.unshift(arg);
                    }
                });
            }
        }

        // Parse flags from user input
        let cleanParams = [];
        params.forEach(p => {
            if (p.startsWith('-')) {
                p.slice(1).split('').forEach(f => flags[f] = true);
            } else {
                cleanParams.push(p);
            }
        });

        if (this.validCommands.includes(resolvedCmd)) {
            // Expand wildcards for commands that work with files
            const fileCommands = ['ls', 'cat', 'rm', 'cp', 'mv', 'head', 'tail', 'wc', 'grep'];
            if (fileCommands.includes(resolvedCmd)) {
                cleanParams = this._expandGlobs(cleanParams);
            }

            // Execute Command
            await this._execute(resolvedCmd, cleanParams, flags, input);
            return;
        }

        // 5. Typo Detection
        const closest = this._findClosestCommand(cmd);
        if (closest) {
            this.ui.print(`Command not found: '${cmd}'. Did you mean '${closest}'?`, 'error');
            return;
        }

        // 6. Smart Detection (Natural Language)
        if (this.config.mode === 'smart' || this.config.mode === 'helpful') {
            if (this._isNaturalLanguage(input)) {
                return { type: 'chat', content: input };
            }
        }
        // 7. Default Error
        this.ui.print(`Command not found: ${cmd}. Type 'help' for available commands.`, 'error');
    }

    _expandGlobs(params) {
        const expanded = [];
        const cwd = this.fs._getCwdNode();

        for (const param of params) {
            if (param.includes('*')) {
                // Convert glob pattern to regex
                const pattern = param
                    .replace(/\./g, '\\.')
                    .replace(/\*/g, '.*');
                const regex = new RegExp('^' + pattern + '$');

                // Match against files in current directory
                const matches = Object.keys(cwd.children || {})
                    .filter(name => regex.test(name));

                if (matches.length > 0) {
                    expanded.push(...matches);
                } else {
                    // No matches, keep original
                    expanded.push(param);
                }
            } else {
                expanded.push(param);
            }
        }

        return expanded;
    }

    _findClosestCommand(cmd) {
        let closest = null;
        let minDistance = Infinity;

        for (const valid of this.validCommands) {
            const dist = this._levenshtein(cmd, valid);
            if (dist < minDistance) {
                minDistance = dist;
                closest = valid;
            }
        }

        if (minDistance <= this.config.typoTolerance) {
            return closest;
        }
        return null;
    }

    _levenshtein(a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1 // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    _isNaturalLanguage(input) {
        // Heuristics
        const lower = input.toLowerCase();
        if (lower.endsWith('?')) return true;
        const questionWords = ['how', 'what', 'why', 'when', 'where', 'who', 'can', 'could', 'would', 'is', 'are'];
        const firstWord = lower.split(' ')[0];
        if (questionWords.includes(firstWord)) return true;
        if (input.split(' ').length > 4) return true; // Long sentence
        return false;
    }

    async _execute(cmd, params, flags, fullInput) {
        let output = '';
        let targetFile = null;
        let append = false;

        // Handle redirection - parse before command execution
        // Check for >> first (must come before checking for >)
        let commandInput = fullInput;
        if (fullInput.includes('>>')) {
            const redirectIndex = fullInput.indexOf('>>');
            commandInput = fullInput.substring(0, redirectIndex).trim();
            targetFile = fullInput.substring(redirectIndex + 2).trim();
            append = true;
        } else if (fullInput.includes('>')) {
            const redirectIndex = fullInput.indexOf('>');
            commandInput = fullInput.substring(0, redirectIndex).trim();
            targetFile = fullInput.substring(redirectIndex + 1).trim();
            append = false;
        }

        // Re-tokenize commandInput if redirection was found
        // This ensures params don't include the redirect filename
        if (targetFile) {
            const tokens = commandInput.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
            const args = tokens.map(t => t.replace(/^["']|["']$/g, ''));
            // Skip first arg (command itself) and re-parse params/flags
            const newParams = args.slice(1);
            params = [];
            flags = {};
            newParams.forEach(p => {
                if (p.startsWith('-')) {
                    p.slice(1).split('').forEach(f => flags[f] = true);
                } else {
                    params.push(p);
                }
            });
        }

        switch (cmd) {
            case 'ls': output = this.fs.ls(params[0], flags); break;
            case 'cd': output = this.fs.cd(params[0]); break;
            case 'pwd': output = this.fs.pwd(); break;
            case 'mkdir': output = this.fs.mkdir(params[0]); break;
            case 'rmdir': output = this.fs.rmdir(params[0]); break;
            case 'touch': output = params.map(p => this.fs.touch(p)).filter(r => r).join('\n'); break;
            case 'rm': output = params.map(p => this.fs.rm(p, flags)).filter(r => r).join('\n'); break;
            case 'cp': output = this.fs.cp(params[0], params[1], flags); break;
            case 'mv': output = this.fs.mv(params[0], params[1]); break;
            case 'tree': output = this.fs.tree(); break;
            case 'cat': output = this.fs.cat(params[0]); break;
            case 'echo': output = params.join(' '); break;
            case 'date': output = new Date().toString(); break;
            case 'whoami': output = 'user'; break;
            case 'uname': output = flags.a ? 'Linux minai 5.10.0 generic x86_64' : 'Linux'; break;
            case 'df': output = 'Filesystem     1K-blocks      Used Available Use% Mounted on\n/dev/root       10000000   2000000   8000000  20% /'; break;
            case 'clear': this.ui.clear(); return;
            case 'history': output = this.ui.getHistory().map((cmd, i) => `${i + 1}  ${cmd}`).join('\n'); break;
            case 'whatis': output = this._getWhatis(params[0]); break;
            case 'which': output = this._getWhich(params[0]); break;
            case 'help': output = this._getHelp(); break;
            case 'man': output = this._getMan(params[0]); break;
            case 'wc': output = this._wc(params[0], flags); break;
            case 'head': output = this._head(params[0], 10); break;
            case 'tail': output = this._tail(params[0], 10); break;
            case 'grep': output = this._grep(params[0], params[1], flags); break;
            case 'download':
                const content = this.fs.cat(params[0]);
                if (!content.startsWith('Error') && !content.startsWith('Is a')) {
                    this.ui.downloadFile(params[0], content);
                    output = `Downloading ${params[0]}...`;
                } else {
                    output = content;
                }
                break;
            case 'ping': output = await this._ping(params[0]); break;
            case 'curl': output = await this._curl(params, flags); break;
            case 'calc': output = this._calc(params); break;
            case 'theme': output = this._theme(params); break;
            case 'bgset': output = this._bgset(params); break;
            case 'upload': this._upload(); return;
            case 'reset': output = this.fs.reset(); break;

            case 'neofetch':
                output = this._neofetch();
                break;
            case 'json':
                if (params.length === 0) {
                    output = 'Usage: json <file>';
                } else {
                    output = this._jsonFormat(params[0]);
                }
                break;
            case 'edit':
            case 'nano':
            case 'vim':
                const fileContent = this.fs.cat(params[0]);
                this.ui.openEditor(params[0], fileContent.startsWith('Error') ? '' : fileContent);
                return;
            case '/config': this.ui.openSettings(); return;
            case 'exit': return 'Type "exit" is not needed. Just close the terminal.';
            case 'ai':
                // Switch to Agent mode using the UI button
                const agentBtn = document.querySelector('[data-mode="agent"]');
                if (agentBtn) {
                    agentBtn.click();
                    return 'Switched to Agent mode (✨). Type naturally or use direct commands.';
                } else {
                    return 'Agent mode not available. Click the ✨ button to enable it.';
                }

            case 'alias':
                if (params.length === 0) {
                    // List all aliases
                    const aliasList = [];
                    for (const [name, command] of Object.entries(this.aliases)) {
                        // Skip internal aliases
                        if (!name.startsWith('/')) {
                            aliasList.push(`${name}='${command}'`);
                        }
                    }
                    output = aliasList.length > 0 ? aliasList.join('\n') : 'No aliases defined';
                } else {
                    // Parse alias name=command format
                    const aliasStr = params.join(' ');
                    const match = aliasStr.match(/^([^=]+)=(.+)$/);
                    if (match) {
                        const name = match[1].trim();
                        const command = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
                        this.aliases[name] = command;
                        const saveResult = this._saveAliases();
                        if (saveResult) {
                            output = saveResult; // Error message
                        } else {
                            output = `Alias created: ${name}='${command}'`;
                        }
                    } else {
                        output = 'Usage: alias [name=command]';
                    }
                }
                break;
            case 'set':
                if (params[0] === 'mode') {
                    if (['strict', 'helpful', 'smart'].includes(params[1])) {
                        this.config.mode = params[1];
                        output = `Mode set to ${params[1]}`;
                    } else {
                        output = 'Usage: set mode [strict|helpful|smart]';
                    }
                } else {
                    output = 'Usage: set mode [strict|helpful|smart]';
                }
                break;
            default:
                output = `Unknown command: ${cmd}`;
        }

        if (targetFile) {
            const res = this.fs.write(targetFile, output, append);
            if (res) this.ui.print(res);
        } else if (output) {
            this.ui.print(output);
        }
    }

    _wc(path, flags) {
        const content = this.fs.cat(path);
        if (content.startsWith('Error') || content.startsWith('Is a')) return content;
        const lines = content.split('\n').length;
        const words = content.split(/\s+/).length;
        const chars = content.length;
        if (flags.l) return `${lines} ${path}`;
        if (flags.w) return `${words} ${path}`;
        if (flags.c) return `${chars} ${path}`;
        return `${lines} ${words} ${chars} ${path}`;
    }

    _head(path, n) {
        const content = this.fs.cat(path);
        if (content.startsWith('Error')) return content;
        return content.split('\n').slice(0, n).join('\n');
    }

    _tail(path, n) {
        const content = this.fs.cat(path);
        if (content.startsWith('Error')) return content;
        const lines = content.split('\n');
        return lines.slice(Math.max(lines.length - n, 0)).join('\n');
    }

    _grep(pattern, path, flags) {
        const content = this.fs.cat(path);
        if (content.startsWith('Error')) return content;
        const lines = content.split('\n');

        const regex = new RegExp(pattern, flags.i ? 'i' : '');
        return lines.filter(l => regex.test(l)).join('\n');
    }

    async _ping(host) {
        if (!host) return 'Usage: ping [host]';

        let url = host;
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        this.ui.print(`PING ${host} (${url}): HTTP probe`, 'system');

        const times = [];
        let received = 0;

        for (let i = 0; i < 4; i++) {
            const start = performance.now();
            try {
                // We use mode: 'no-cors' because we just want to know if it's reachable,
                // we don't care about the content (and most sites block CORS)
                await fetch(url, { mode: 'no-cors', method: 'HEAD', cache: 'no-cache' });
                const end = performance.now();
                const time = end - start;
                times.push(time);
                received++;
                this.ui.print(`Connected to ${host}: seq=${i} time=${time.toFixed(1)} ms`, 'system');
            } catch (e) {
                this.ui.print(`Request timeout for icmp_seq ${i}`, 'error');
            }
            // Small delay between pings
            if (i < 3) await new Promise(r => setTimeout(r, 1000));
        }

        this.ui.print(`--- ${host} ping statistics ---`, 'system');

        if (times.length > 0) {
            const min = Math.min(...times);
            const max = Math.max(...times);
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const stddev = Math.sqrt(times.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / times.length);

            this.ui.print(`${4} packets transmitted, ${received} packets received, ${((4 - received) / 4 * 100).toFixed(1)}% packet loss`, 'system');
            this.ui.print(`round-trip min/avg/max/stddev = ${min.toFixed(3)}/${avg.toFixed(3)}/${max.toFixed(3)}/${stddev.toFixed(3)} ms`, 'system');
        } else {
            this.ui.print(`${4} packets transmitted, ${received} packets received, 100% packet loss`, 'system');
        }

        return '';
    }

    async _curl(params, flags) {
        if (params.length === 0) return 'curl: try \'curl --help\' or \'curl --manual\' for more information';

        let url = params[0];
        // Handle case where -o is first arg
        if (params[0] === '-o' && params.length > 2) {
            url = params[2];
        } else if (flags.o && params.length > 1) {
            // If -o flag is parsed but we need to find the filename and url
            // The parser puts non-flag args in params.
            // If command was: curl url -o file
            // params = [url, file]
            // If command was: curl -o file url
            // params = [file, url]
            // This simple parser might be tricky. Let's assume standard position or look for args.
            // Let's rely on the params array.
            // We need to identify which param is the URL and which is the output file.
            // Usually -o takes the NEXT argument.
            // But our parser separates flags and params.
            // Let's simplify: if -o is present, we expect 2 params: URL and Filename.
            // We'll try to guess which is which. URL usually has http/https or dots.
        }

        // Better argument parsing for curl specifically
        // We need to handle: curl <url> -o <file> OR curl -o <file> <url>
        // Since our parser extracts flags separately, we might lose the position of -o.
        // But wait, the parser in _execute receives `cleanParams` which are non-flag arguments.
        // If the user typed `curl url -o file`, `cleanParams` is `[url, file]`.
        // If `curl -o file url`, `cleanParams` is `[file, url]`.
        // This is ambiguous without knowing where -o was.
        // However, usually the URL is the one with http/https.

        let outputFile = null;
        if (flags.o) {
            if (params.length < 2) return 'curl: no output file specified';
            // Heuristic: find the one that looks like a URL
            const urlIndex = params.findIndex(p => p.startsWith('http') || p.includes('www.'));
            if (urlIndex !== -1) {
                url = params[urlIndex];
                outputFile = params[urlIndex === 0 ? 1 : 0];
            } else {
                // Default: first is URL, second is file
                url = params[0];
                outputFile = params[1];
            }
        } else {
            url = params[0];
        }

        if (!url) return 'curl: no URL specified';
        if (!url.startsWith('http')) url = 'https://' + url;

        this.ui.print(`curl: try connecting to ${url}...`, 'system');

        try {
            const method = flags.I ? 'HEAD' : 'GET';
            const response = await fetch(url, { method: method });

            if (flags.I) {
                // Print headers
                let headers = `HTTP/1.1 ${response.status} ${response.statusText}\n`;
                response.headers.forEach((val, key) => {
                    headers += `${key}: ${val}\n`;
                });
                return headers;
            }

            const text = await response.text();

            if (outputFile) {
                const res = this.fs.write(outputFile, text);
                if (res) return res;
                return ''; // Silent on success? Or stats?
                // curl usually shows a progress meter. We'll just say saved.
                // Actually curl -o is silent if no -v.
                // But for UX let's print something.
                // return `Saved ${text.length} bytes to ${outputFile}`;
                // Real curl is silent. Let's be silent but maybe update UI?
                // Let's return nothing to mimic standard behavior, or maybe a small confirmation since we don't have a progress bar.
                return '';
            }

            return text;

        } catch (error) {
            return `curl: (7) Failed to connect to ${url}. \nPossible reasons:\n- CORS policy blocked the request (Browser limitation)\n- Network error\n- Invalid URL`;
        }
    }

    _calc(params) {
        if (params.length === 0) return 'Usage: calc [expression]';
        const expr = params.join(' ');
        try {
            const result = new Function('return ' + expr)();
            return result.toString();
        } catch (e) {
            return 'Error: Invalid expression';
        }
    }

    _theme(params) {
        const themes = ['cyberpunk', 'ubuntu', 'hacker', 'retro', 'dracula', 'monokai', 'nord', 'solarized-dark', 'solarized-light', 'gruvbox', 'one-dark', 'tokyo-night'];
        if (params.length === 0 || params[0] === 'list') {
            return `Available themes (${themes.length}):\n${themes.join('\n')}`;
        }
        if (params[0] === 'set') {
            const theme = params[1];
            if (themes.includes(theme)) {
                this.ui.setTheme(theme);
                return `Theme set to ${theme}`;
            }
            return `Unknown theme: ${theme}. Try 'theme list'`;
        }
        return 'Usage: theme [list | set <name>]';
    }

    _bgset(args) {
        if (args.length === 0) return 'Usage: bgset [preset|url|none|list]';
        const arg = args[0];

        if (arg === 'none') {
            document.documentElement.style.setProperty('--bg-image', 'none');
            localStorage.setItem('minai_bg', 'none');
            return 'Background removed.';
        }

        if (arg === 'list') {
            return 'Presets: cyberpunk, matrix, space, retro, nature';
        }

        const presets = {
            'cyberpunk': 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=1920&q=80',
            'matrix': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&q=80',
            'space': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80',
            'retro': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80',
            'nature': 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80'
        };

        const url = presets[arg] || arg;
        const cssValue = `url('${url}')`;

        document.documentElement.style.setProperty('--bg-image', cssValue);
        localStorage.setItem('minai_bg', url);
        return `Background set to ${arg}`;
    }

    _upload() {
        this.ui.triggerUpload((filename, content) => {
            // Sanitize filename: replace spaces with underscores
            const safeFilename = filename.replace(/\s+/g, '_');

            const result = this.fs.write(safeFilename, content);
            if (result) {
                this.ui.print(`Error uploading ${safeFilename}: ${result}`, 'error');
            } else {
                this.ui.print(`Successfully uploaded ${safeFilename}`, 'system');
                // If it's an image, show a preview
                if (content.startsWith('data:image/')) {
                    this.ui.print(`<img src="${content}" style="max-width: 300px; border: 1px solid #33ff00; margin-top: 10px;">`, 'system');
                }
            }
        });
    }

    _neofetch() {
        const os = 'MinAI OS v3.0';
        const host = 'minai-terminal';
        const kernel = 'WebKernel 5.10';
        const uptime = Math.floor(performance.now() / 60000) + ' mins';
        const pkgs = Object.keys(this.fs.root.children['command'].children).length;
        const shell = 'minai-sh';
        const res = `${window.screen.width}x${window.screen.height}`;
        const theme = localStorage.getItem('minai_theme') || 'cyberpunk';
        const cpu = 'Simulated CPU';
        const memory = (navigator.deviceMemory ? navigator.deviceMemory + 'GB' : 'Unknown');

        const art = `
    <span style="color: #00d4ff;">       _,met$$$$$gg.</span>          <span style="color: #fff;">user</span>@<span style="color: #fff;">minai</span>
    <span style="color: #00d4ff;">    ,g$$$$$$$$$$$$$$$P.</span>       ────────────────
    <span style="color: #00d4ff;">  ,g$$P"     """Y$$.".  </span>      <span style="color: #ff6b9d;">OS:</span> MinAI OS v3.0  
    <span style="color: #00d4ff;"> ,$$P'              \`$$$.</span>     <span style="color: #ff6b9d;">Shell:</span> minai-sh
    <span style="color: #00d4ff;">',$$P       ,ggs.     \`$$b:</span>   <span style="color: #ff6b9d;">Terminal:</span> MinAI Terminal
    <span style="color: #00d4ff;">\`d$$'     ,$P"'   .    $$$</span>   <span style="color: #ff6b9d;">Theme:</span> ${document.body.className.replace('theme-', '') || 'default'}
    <span style="color: #00d4ff;"> $$P      d$'     ,    $$P</span>    <span style="color: #ff6b9d;">Uptime:</span> ${Math.floor(performance.now() / 1000 / 60)} minutes
    <span style="color: #00d4ff;"> $$:      $$.   -    ,d$$'</span>    <span style="color: #ff6b9d;">Memory:</span> Virtual FS
    <span style="color: #00d4ff;"> $$;      Y$b._   _,d$P'</span>      <span style="color: #ff6b9d;">Browser:</span> ${navigator.userAgent.split(' ').slice(-2).join(' ')}
    <span style="color: #00d4ff;"> Y$$.    \`.\`"Y$$$P"'</span>         <span style="color: #ff6b9d;">Commands:</span> ${this.validCommands.length}
    <span style="color: #00d4ff;"> \`$$b      "-.__  </span>            
    <span style="color: #00d4ff;">  \`Y$$</span>                        ████████████████
    <span style="color: #00d4ff;">   \`Y$$.</span>                     
    <span style="color: #00d4ff;">     \`$$b.</span>                   Type <span style="color: #8be9fd;">help</span> for commands
    <span style="color: #00d4ff;">       \`Y$$b.</span>
    <span style="color: #00d4ff;">          \`"Y$b._</span>
    <span style="color: #00d4ff;">              \`"""</span>
        `;
        return art;
    }

    _jsonFormat(filepath) {
        const content = this.fs.cat(filepath);
        if (content.startsWith('Error')) return content;

        try {
            const parsed = JSON.parse(content);
            const formatted = JSON.stringify(parsed, null, 2);

            // Add syntax highlighting for JSON
            const highlighted = formatted
                .replace(/("[\w]+")(:\s?)([^,\}\]]+)/g, '<span style="color: #ff79c6;">$1</span>$2<span style="color: #50fa7b;">$3</span>')
                .replace(/"([^"]+)":/g, '<span style="color: #8be9fd;">"$1"</span>:')
                .replace(/: "([^"]+)"/g, ': <span style="color: #f1fa8c;">"$1"</span>')
                .replace(/: (\d+)/g, ': <span style="color: #bd93f9;">$1</span>')
                .replace(/: (true|false|null)/g, ': <span style="color: #ffb86c;">$1</span>');

            return `<pre style="font-family: monospace; line-height: 1.5;">${highlighted}</pre>`;
        } catch (e) {
            return `Error: Invalid JSON - ${e.message}`;
        }
    }

    _getHelp() {
        const categories = {
            'File System': ['ls', 'cd', 'pwd', 'mkdir', 'rmdir', 'touch', 'rm', 'cp', 'mv', 'tree'],
            'Content': ['cat', 'echo', 'head', 'tail', 'wc', 'grep', 'edit', 'vim'],
            'System': ['date', 'whoami', 'uname', 'clear', 'download', 'upload', 'history', 'exit', 'ping', 'curl', 'theme', 'neofetch', 'reset'],
            'Tools': ['calc', 'json'],
            'Info & Config': ['whatis', 'which', 'man', 'help', 'alias', 'set', '/config'],
            'AI': ['ai (switch to Agent mode ✨)']
        };

        let html = '<div style="color: #a8a8a8; margin-bottom: 10px;">MinAI Terminal v3.0 Help</div>';

        html += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
        html += '<thead><tr style="border-bottom: 1px solid #444; text-align: left;">';
        html += '<th style="padding: 8px; color: #fff;">Category</th>';
        html += '<th style="padding: 8px; color: #fff;">Available Commands</th>';
        html += '</tr></thead><tbody>';

        const colors = {
            'File System': '#4CAF50',
            'Content': '#2196F3',
            'System': '#FFC107',
            'Tools': '#FF9800',
            'Info & Config': '#9C27B0',
            'AI Chat': '#E91E63'
        };

        for (const [category, commands] of Object.entries(categories)) {
            html += '<tr>';
            html += `<td style="padding: 8px; color: ${colors[category] || '#fff'}; font-weight: bold; vertical-align: top; width: 150px;">${category}</td>`;
            html += `<td style="padding: 8px; color: #ccc;">${commands.join(', ')}</td>`;
            html += '</tr>';
        }

        html += '</tbody></table>';

        html += `<div style="margin-top: 15px; color: #888;">
            Usage: <span style="color: #fff;">command [arguments] [flags]</span><br>
            Try <span style="color: #fff;">man [command]</span> for detailed documentation.<br>
            View implementations: <span style="color: #fff;">cat /command/[command]</span><br>
            Edit config: <span style="color: #fff;">edit /configuration/system-prompt.txt</span>
        </div>`;

        return html;
    }

    _getMan(cmd) {
        const manuals = {
            'ls': {
                desc: 'List directory contents',
                usage: 'ls [path] [-l] [-a]',
                flags: [
                    ['-l', 'Use a long listing format'],
                    ['-a', 'Do not ignore entries starting with .']
                ],
                example: 'ls -la /home'
            },
            'cd': {
                desc: 'Change the shell working directory',
                usage: 'cd [dir]',
                example: 'cd projects'
            },
            'pwd': {
                desc: 'Print name of current/working directory',
                usage: 'pwd'
            },
            'mkdir': {
                desc: 'Create the DIRECTORY(ies), if they do not already exist',
                usage: 'mkdir [directory]',
                example: 'mkdir my_project'
            },
            'rmdir': {
                desc: 'Remove empty directories',
                usage: 'rmdir [directory]',
                example: 'rmdir old_project'
            },
            'touch': {
                desc: 'Update the access and modification times of each FILE to the current time. Creates an empty file if it does not exist.',
                usage: 'touch [file]',
                example: 'touch readme.txt'
            },
            'rm': {
                desc: 'Remove files or directories',
                usage: 'rm [file] [-r]',
                flags: [
                    ['-r', 'Remove directories and their contents recursively']
                ],
                example: 'rm -r old_folder'
            },
            'cp': {
                desc: 'Copy files and directories',
                usage: 'cp [source] [dest] [-r]',
                flags: [
                    ['-r', 'Copy directories recursively']
                ],
                example: 'cp file.txt backup.txt'
            },
            'mv': {
                desc: 'Move (rename) files',
                usage: 'mv [source] [dest]',
                example: 'mv file.txt /home/user/docs/'
            },
            'tree': {
                desc: 'List contents of directories in a tree-like format',
                usage: 'tree [dir]'
            },
            'cat': {
                desc: 'Concatenate files and print on the standard output',
                usage: 'cat [file]',
                example: 'cat readme.txt'
            },
            'echo': {
                desc: 'Display a line of text',
                usage: 'echo [text]',
                example: 'echo Hello World'
            },
            'head': {
                desc: 'Output the first part of files',
                usage: 'head [file]',
                example: 'head large_log.txt'
            },
            'tail': {
                desc: 'Output the last part of files',
                usage: 'tail [file]',
                example: 'tail large_log.txt'
            },
            'wc': {
                desc: 'Print newline, word, and byte counts for each file',
                usage: 'wc [file] [-l] [-w] [-c]',
                flags: [
                    ['-l', 'Print the newline counts'],
                    ['-w', 'Print the word counts'],
                    ['-c', 'Print the byte counts']
                ]
            },
            'grep': {
                desc: 'Print lines that match patterns',
                usage: 'grep [pattern] [file] [-i]',
                flags: [
                    ['-i', 'Ignore case']
                ],
                example: 'grep "error" log.txt'
            },
            'edit': {
                desc: 'Open file in the integrated text editor',
                usage: 'edit [file]',
                aliases: ['nano', 'vim'],
                example: 'edit script.js'
            },
            'nano': { see: 'edit' },
            'vim': { see: 'edit' },
            'date': {
                desc: 'Print the system date and time',
                usage: 'date'
            },
            'whoami': {
                desc: 'Print effective userid',
                usage: 'whoami'
            },
            'ping': {
                desc: 'Send ICMP ECHO_REQUEST to network hosts',
                usage: 'ping [host]',
                example: 'ping google.com'
            },
            'curl': {
                desc: 'Transfer a URL',
                usage: 'curl [options] [URL]',
                flags: [
                    ['-I', 'Fetch the HTTP-header only'],
                    ['-o', 'Write output to file']
                ],
                example: 'curl https://api.example.com/data'
            },
            'bgset': {
                desc: 'Set terminal background image',
                usage: 'bgset [preset|url|none|list]',
                example: 'bgset cyberpunk'
            },
            'calc': {
                desc: 'Simple calculator',
                usage: 'calc [expression]',
                example: 'calc 2 + 2'
            },
            'theme': {
                desc: 'Change terminal theme',
                usage: 'theme [list | set <name>]',
                example: 'theme set ubuntu'
            },
            'upload': {
                desc: 'Upload a file from your computer',
                usage: 'upload'
            },
            'reset': {
                desc: 'Reset file system to default state',
                usage: 'reset'
            },
            'neofetch': {
                desc: 'System information',
                usage: 'neofetch'
            },
            'uname': {
                desc: 'Print system information',
                usage: 'uname [-a]',
                flags: [
                    ['-a', 'Print all information']
                ]
            },
            'df': {
                desc: 'Report file system disk space usage',
                usage: 'df'
            },
            'clear': {
                desc: 'Clear the terminal screen',
                usage: 'clear'
            },
            'download': {
                desc: 'Download a file from the virtual filesystem to your local machine',
                usage: 'download [file]',
                example: 'download result.json'
            },
            'history': {
                desc: 'Display the history list',
                usage: 'history'
            },
            'whatis': {
                desc: 'Display one-line manual page descriptions',
                usage: 'whatis [command]'
            },
            'which': {
                desc: 'Locate a command',
                usage: 'which [command]'
            },
            'man': {
                desc: 'An interface to the system reference manuals',
                usage: 'man [command]'
            },
            'help': {
                desc: 'Display information about builtin commands',
                usage: 'help'
            },
            'set': {
                desc: 'Set shell options',
                usage: 'set mode [strict|helpful|smart]',
                example: 'set mode strict'
            },
            '/config': {
                desc: 'Open the configuration settings modal',
                usage: '/config'
            },
            'chat': {
                desc: 'Enter AI Chat Mode',
                usage: 'chat',
                aliases: ['/chat', 'ai', 'ask']
            },
            '/chat': { see: 'chat' },
            'exit': {
                desc: 'Exit the current mode (chat -> command)',
                usage: 'exit'
            }
        };

        const entry = manuals[cmd];
        if (!entry) return `<span style="color: #f44336;">No manual entry for '${cmd}'</span>`;
        if (entry.see) return this._getMan(entry.see);

        let html = `<div style="margin-bottom: 10px;">
            <div style="font-size: 1.2em; font-weight: bold; color: #fff; text-transform: uppercase;">${cmd}</div>
            <div style="color: #ccc;">${entry.desc}</div>
        </div>`;

        html += `<div style="margin-bottom: 8px;">
            <span style="color: #4CAF50; font-weight: bold;">Usage:</span> <span style="font-family: monospace;">${entry.usage}</span>
        </div>`;

        if (entry.aliases) {
            html += `<div style="margin-bottom: 8px;">
                <span style="color: #FF9800; font-weight: bold;">Aliases:</span> ${entry.aliases.join(', ')}
            </div>`;
        }

        if (entry.flags) {
            html += `<div style="margin-bottom: 5px; color: #2196F3; font-weight: bold;">Flags:</div>`;
            entry.flags.forEach(flag => {
                html += `<div style="margin-left: 15px;">
                    <span style="font-weight: bold; color: #fff;">${flag[0]}</span> <span style="color: #aaa;">- ${flag[1]}</span>
                </div>`;
            });
        }

        if (entry.example) {
            html += `<div style="margin-top: 10px;">
                <span style="color: #E91E63; font-weight: bold;">Example:</span> <span style="font-family: monospace; background: #333; padding: 2px 5px; border-radius: 3px;">${entry.example}</span>
            </div>`;
        }

        return html;
    }


    _getWhatis(cmd) {
        const descriptions = {
            'ls': 'list directory contents',
            'cd': 'change directory',
            'pwd': 'print name of current/working directory',
            'mkdir': 'make directories',
            'rmdir': 'remove empty directories',
            'touch': 'change file timestamps (create empty file)',
            'rm': 'remove files or directories',
            'cp': 'copy files and directories',
            'mv': 'move (rename) files',
            'tree': 'list contents of directories in a tree-like format',
            'cat': 'concatenate files and print on the standard output',
            'echo': 'display a line of text',
            'head': 'output the first part of files',
            'tail': 'output the last part of files',
            'wc': 'print newline, word, and byte counts for each file',
            'grep': 'print lines that match patterns',
            'edit': 'edit file',
            'nano': 'edit file',
            'vim': 'edit file',
            'date': 'print or set the system date and time',
            'whoami': 'print effective userid',
            'uname': 'print system information',
            'df': 'report file system disk space usage',
            'clear': 'clear the terminal screen',
            'help': 'display information about builtin commands',
            'man': 'an interface to the system reference manuals',
            'history': 'display the history list',
            'download': 'download a file',
            'alias': 'define or display aliases',
            'set': 'set shell options',
            'exit': 'exit the shell',
            'chat': 'start chat session',
            'whatis': 'display one-line manual page descriptions',
            'which': 'locate a command'
        };
        return descriptions[cmd] || `${cmd}: nothing appropriate.`;
    }

    _getWhich(cmd) {
        if (this.validCommands.includes(cmd)) {
            return `/bin/${cmd}`;
        }
        return `${cmd} not found`;
    }
}
