# Command Development Guide

Complete guide for adding new commands to MinAI Terminal with the new modular architecture.

## 📋 Quick Start

Adding a command is now simpler with the command registry pattern!

### Example: Adding a New Command

**1. Choose the appropriate module** in `modules/commands/`:
- `file-system.js` - File/directory operations
- `content.js` - File content manipulation
- `system.js` - System commands
- `network.js` - Network operations
- `utils.js` - Utilities (calc, theme, etc.)
- `help.js` - Documentation commands

**2. Register your command:**

```javascript
// In modules/commands/utils.js (or appropriate file)
import { registry } from './registry.js';

export function registerUtilsCommands(fs, ui) {
    // ... existing commands
    
    registry.register('mycommand', (args, flags) => {
        if (args.length === 0) return 'Usage: mycommand <arg>';
        
        // Your logic here
        return `Result: ${args[0]}`;
    }, 'Brief description', 'mycommand <arg>', 'Tools');
}
```

**That's it!** The command is automatically:
- ✅ Available for execution
- ✅ Added to help system
- ✅ Included in `man` pages
- ✅ Supports aliases

## 🎯 Command Registry API

### `registry.register(name, handler, description, usage, category)`

**Parameters:**
- `name` (string): Command name
- `handler` (function): `(args, flags) => string` - Returns output
- `description` (string): One-line description
- `usage` (string): Usage example
- `category` (string): Category for help grouping

**Categories:**
- `'File System'` - File/directory operations
- `'Content'` - Content manipulation
- `'System'` - System commands
- `'Network'` - Network operations
- `'Tools'` - Utilities
- `'Info & Config'` - Documentation
- `'AI'` - AI-related

### Handler Function

```javascript
function handler(args, flags) {
    // args: Array of arguments (strings)
    // flags: Object with flag names as keys
    //        e.g., -la becomes { l: true, a: true }
    
    // Return: String or HTML output
    return 'Output to display';
}
```

## 📦 Complete Examples

### Simple Command

```javascript
registry.register('hello', () => {
    return 'Hello, World!';
}, 'Say hello', 'hello', 'Tools');
```

### With Arguments

```javascript
registry.register('greet', (args) => {
    if (args.length === 0) return 'Usage: greet <name>';
    return `Hello, ${args[0]}!`;
}, 'Greet someone', 'greet <name>', 'Tools');
```

### With Flags

```javascript
registry.register('list', (args, flags) => {
    const path = args[0] || '.';
    const long = flags.l;
    const all = flags.a;
    
    // Use fs to list directory
    return fs.ls(path, { l: long, a: all });
}, 'List directory', 'list [-la] [path]', 'File System');
```

### File Operation

```javascript
registry.register('count', (args) => {
    if (args.length === 0) return 'Usage: count <file>';
    
    const content = fs.cat(args[0]);
    if (content.startsWith('Error')) return content;
    
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).length;
    
    return `Lines: ${lines}, Words: ${words}`;
}, 'Count lines and words', 'count <file>', 'Content');
```

### Network Command (Async)

```javascript
registry.register('fetch', async (args) => {
    if (args.length === 0) return 'Usage: fetch <url>';
    
    try {
        const response = await fetch(args[0]);
        const text = await response.text();
        return text;
    } catch (e) {
        return `Error: ${e.message}`;
    }
}, 'Fetch URL content', 'fetch <url>', 'Network');
```

### HTML Output

```javascript
registry.register('colored', (args) => {
    const text = args.join(' ');
    return `
        <div style="color: #8be9fd;">
            <span style="color: #ff79c6;">Colored:</span> ${text}
        </div>
    `;
}, 'Display colored text', 'colored <text>', 'Tools');
```

## 🔧 Accessing System Components

Commands receive `fs` and `ui` when registered:

### FileSystem (`fs`)

```javascript
export function registerYourCommands(fs, ui) {
    registry.register('cmd', (args) => {
        // File operations
        const content = fs.cat('file.txt');
        fs.write('file.txt', 'content', false);
        const listing = fs.ls('.', { l: true, a: true });
        
        // Directory operations
        fs.cd('/home');
        const pwd = fs.pwd();
        fs.mkdir('newdir');
        fs.rmdir('olddir');
        
        // File management
        fs.touch('file.txt');
        fs.rm('file.txt', { r: true });
        fs.cp('src', 'dest');
        fs.mv('old', 'new');
        
        // Tree view
        const tree = fs.tree();
        
        // Reset filesystem
        fs.reset();
    }, ...);
}
```

### UI Handler (`ui`)

```javascript
registry.register('cmd', (args) => {
    // Print to terminal
    ui.print('Text', 'system');  // types: 'system', 'error', 'user'
    
    // Clear screen
    ui.clear();
    
    // Set theme
    ui.setTheme('dracula');
    
    // Open editor
    ui.openEditor('file.txt', content);
    
    // Trigger file upload
    ui.triggerUpload((filename, content) => {
        fs.write(filename, content);
    });
    
    // Download file
    ui.downloadFile('file.txt', content);
    
    // Get history
    const history = ui.getHistory();
}, ...);
```

## 🎨 Styling Guidelines

Use terminal theme colors for consistency:

```javascript
const colors = {
    primary: '#8be9fd',    // Cyan
    secondary: '#ff79c6',   // Pink
    success: '#50fa7b',     // Green
    warning: '#f1fa8c',     // Yellow
    error: '#ff5555',       // Red
    info: '#bd93f9',        // Purple
    orange: '#ffb86c'       // Orange
};

// Example
return `<span style="color: ${colors.success};">Success!</span>`;
```

## 🧪 Testing Your Command

1. **Reload the page** (or restart dev server)
2. **Type** `help` to see your command listed
3. **Run** your command: `mycommand arg`
4. **Check** the manual: `man mycommand`
5. **Test** error cases (no args, invalid input)
6. **Test** with flags if applicable

## 🔍 Common Patterns

### Multiple Arguments

```javascript
registry.register('concat', (args) => {
    if (args.length < 2) return 'Usage: concat <file1> <file2> ...';
    
    const contents = args.map(f => fs.cat(f)).join('\n');
    return contents;
}, ...);
```

### Processing Each Argument

```javascript
registry.register('sizes', (args) => {
    return args.map(file => {
        const content = fs.cat(file);
        return `${file}: ${content.length} bytes`;
    }).join('\n');
}, ...);
```

### Conditional Logic

```javascript
registry.register('show', (args, flags) => {
    if (flags.h) return 'Help text here';
    if (flags.v) console.log('Verbose mode');
    
    const format = flags.j ? 'json' : 'text';
    // ... format logic
}, ...);
```

## 📚 Advanced: Creating Command Modules

To create a new command module:

**1. Create file:** `modules/commands/mycategory.js`

```javascript
import { registry } from './registry.js';

export function registerMyCategoryCommands(fs, ui) {
    registry.register('cmd1', (args) => {
        // ...
    }, 'Description 1', 'cmd1 <arg>', 'My Category');
    
    registry.register('cmd2', (args) => {
        // ...
    }, 'Description 2', 'cmd2 <arg>', 'My Category');
}
```

**2. Import in `modules/parser.js`:**

```javascript
import { registerMyCategoryCommands } from './commands/mycategory.js';

// In constructor:
registerMyCategoryCommands(fs, ui);
```

## 🚀 Best Practices

1. ✅ **Validate input** - Check args length and types
2. ✅ **Return meaningful errors** - Help users understand issues
3. ✅ **Use consistent styling** - Follow color guidelines
4. ✅ **Handle edge cases** - Empty input, missing files, etc.
5. ✅ **Keep it focused** - One command = one responsibility
6. ✅ **Document well** - Clear description and usage
7. ✅ **Test thoroughly** - With and without args/flags

## 🎓 Real-World Example: JSON Formatter

```javascript
// In modules/commands/utils.js
registry.register('json', (args) => {
    if (args.length === 0) return 'Usage: json <file>';
    
    // Read file
    const content = fs.cat(args[0]);
    if (content.startsWith('Error')) return content;
    
    // Parse and format
    try {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        
        // Syntax highlighting (simplified)
        return `<pre style="color: #8be9fd;">${formatted}</pre>`;
    } catch (e) {
        return `Error: Invalid JSON - ${e.message}`;
    }
}, 'Format JSON file', 'json <file>', 'Tools');
```

## 💡 Migration from Old System

If you have commands in the old `terminal.js` file:

**Before (old system):**
```javascript
// In terminal.js
this.validCommands = [..., 'mycommand'];

case 'mycommand':
    output = this._mycommand(params, flags);
    break;

_mycommand(params, flags) {
    // logic
}
```

**After (new system):**
```javascript
// In modules/commands/[category].js
registry.register('mycommand', (params, flags) => {
    // same logic
}, 'description', 'usage', 'Category');
```

## 📖 Reference

### Registry Methods

```javascript
// Register command
registry.register(name, handler, desc, usage, category);

// Get command
const cmd = registry.get('name');

// Check if exists
if (registry.has('name')) { ... }

// Get all commands
const all = registry.getAll();

// Alias management
registry.setAlias('ll', 'ls -la');
const alias = registry.getAlias('ll');
registry.removeAlias('ll');
```

### Command Object Structure

```javascript
{
    handler: Function,      // (args, flags) => string
    description: String,    // One-line description
    usage: String,          // Usage example
    category: String        // Help category
}
```

---

**Questions?** Check existing commands in `modules/commands/` for more examples!
