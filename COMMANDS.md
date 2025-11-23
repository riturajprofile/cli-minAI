# Command Development Guide

Complete guide for adding new commands to MinAI Terminal.

## 📋 Command Checklist

When adding a new command, complete all these steps:

- [ ] Add to `validCommands` array
- [ ] Add switch case in `_execute()`
- [ ] Implement command method (`_yourcommand`)
- [ ] Add to help categories
- [ ] Add manual entry
- [ ] Update agent knowledge (if applicable)
- [ ] Test the command
- [ ] Document in this file

## 🎯 Step-by-Step Guide

### Step 1: Add to Valid Commands List

**Location:** `terminal.js` ~line 1111

```javascript
this.validCommands = [
    'ls', 'cd', 'pwd', // ... existing commands
    'yourcommand'  // Add here (alphabetically preferred)
];
```

### Step 2: Add Switch Case

**Location:** `terminal.js` in `_execute()` method ~line 1440

```javascript
switch (cmd) {
    // ... existing cases
    case 'yourcommand':
        output = this._yourcommand(params, flags);
        break;
```

**Patterns:**

```javascript
// Simple command with no params
case 'simple':
    output = this._simple();
    break;

// Command with params
case 'withparams':
    output = this._withparams(params, flags);
    break;

// Command that needs direct return
case 'special':
    this.ui.doSomething();
    return; // No output to print
```

### Step 3: Implement Command Method

**Location:** `terminal.js` after existing command methods ~line 1800+

```javascript
_yourcommand(params, flags) {
    // 1. Validate input
    if (params.length === 0) {
        return 'Usage: yourcommand <arg> [-f]';
    }
    
    // 2. Check flags
    if (flags.h) {
        return this._getMan('yourcommand');
    }
    
    // 3. Your logic here
    const arg = params[0];
    const result = // ... do something with arg
    
    // 4. Return output (string or HTML)
    return `Result: ${result}`;
}
```

**Common Patterns:**

```javascript
// File operation
_readfile(params) {
    const filepath = params[0];
    const content = this.fs.cat(filepath);
    if (content.startsWith('Error')) return content;
    return content;
}

// Network operation (async)
async _fetch(url) {
    try {
        const response = await fetch(url);
        const data = await response.text();
        return data;
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

// HTML output with styling
_formatted(data) {
    return `<div style="color: #8be9fd;">
        <span style="color: #ff79c6;">Label:</span> ${data}
    </div>`;
}
```

### Step 4: Add to Help Categories

**Location:** `terminal.js` in `_getHelp()` ~line 1892

```javascript
const categories = {
    'File System': ['ls', 'cd', 'pwd', ...],
    'Content': ['cat', 'echo', ...],
    'Tools': ['calc', 'json', 'yourcommand'],  // Add here
    // ...
};
```

**Categories:**
- **File System** - File/directory operations
- **Content** - Reading/writing file content
- **Network** - HTTP, ping, curl
- **Utilities** - Tools like calc, json, theme
- **System** - System info, date, clear
- **Help** - Documentation commands
- **AI** - AI agent related

### Step 5: Add Manual Entry

**Location:** `terminal.js` in `_getMan()` ~line 2010+

```javascript
const manuals = {
    // ... existing entries
    'yourcommand': {
        desc: 'Brief one-line description',
        usage: 'yourcommand <arg> [-options]',
        flags: [
            ['-f', 'Flag description'],
            ['-v', 'Verbose output']
        ],
        example: 'yourcommand test -f'
    }
};
```

### Step 6: Update Agent Knowledge (Optional)

If the agent should know about your command:

**Location:** `script.js` ~line 508+ in agent system prompt

```javascript
UTILITIES:
• calc <expression> - calculator
• json <file> - format JSON
• yourcommand <arg> - your description  // Add here
```

Also add an example:

**Location:** `script.js` ~line 680+

```javascript
User: "use yourcommand with test"
{
  "plan": "Execute yourcommand",
  "commands": ["yourcommand test"],
  "needsPermission": false
}
```

## 📦 Complete Example: Adding `reverse` Command

Reverses a string.

### Implementation

```javascript
// Step 1: Add to validCommands (line 1111)
this.validCommands = [
    // ...
    'reverse'
];

// Step 2: Add switch case (line 1440+)
case 'reverse':
    output = this._reverse(params);
    break;

// Step 3: Implement method (line 1800+)
_reverse(params) {
    if (params.length === 0) {
        return 'Usage: reverse <text>';
    }
    
    const text = params.join(' ');
    const reversed = text.split('').reverse().join('');
    
    return `<div style="color: #50fa7b;">
        Original: ${text}<br>
        Reversed: ${reversed}
    </div>`;
}

// Step 4: Add to help (line 1892)
const categories = {
    'Tools': ['calc', 'json', 'reverse'],
    // ...
};

// Step 5: Add manual (line 2010+)
'reverse': {
    desc: 'Reverse a string',
    usage: 'reverse <text>',
    example: 'reverse hello world'
}

// Step 6: Update agent (script.js line 508+)
UTILITIES:
• reverse <text> - reverse a string
```

### Test

```bash
$ reverse hello
Original: hello
Reversed: olleh

$ reverse hello world
Original: hello world  
Reversed: dlrow olleh
```

## 🎨 Output Styling

Use these colors for consistency:

```javascript
// Cyberpunk theme colors
const colors = {
    primary: '#8be9fd',    // Cyan
    secondary: '#ff79c6',   // Pink
    success: '#50fa7b',     // Green
    warning: '#f1fa8c',     // Yellow
    error: '#ff5555',       // Red
    info: '#bd93f9',        // Purple
    orange: '#ffb86c'       // Orange
};

// Example usage
return `<span style="color: ${colors.success};">Success!</span>`;
```

## 🧪 Testing Checklist

- [ ] Command runs without errors
- [ ] Help text shows correctly (`help`)
- [ ] Manual page displays (`man yourcommand`)
- [ ] Handles no params gracefully
- [ ] Handles invalid params
- [ ] Works with flags (if applicable)
- [ ] Output is formatted nicely
- [ ] Agent can use it (if applicable)

## 🔍 Common Patterns

### File System Access

```javascript
// Read file
const content = this.fs.cat('file.txt');
if (content.startsWith('Error')) return content;

// Write file
this.fs.write('file.txt', 'content', false); // false = overwrite

// List directory
const files = this.fs.ls(path, { l: true, a: true });

// Check if exists
const { node, error } = this.fs.resolve(path);
if (error) return error;
if (node.type !== 'file') return 'Not a file';
```

### Network Requests

```javascript
async _fetch(url) {
    try {
        const response = await fetch(url, {
            mode: 'cors',  // or 'no-cors' for simple requests
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.text();
    } catch (e) {
        return `Error: ${e.message}`;
    }
}
```

### Processing Multiple Files (with wildcards)

```javascript
_process(params) {
    // params already has wildcards expanded
    // params = ['file1.txt', 'file2.txt', 'file3.txt']
    
    const results = params.map(file => {
        const content = this.fs.cat(file);
        return `${file}: ${content.length} bytes`;
    });
    
    return results.join('\n');
}
```

### Parsing Flags

```javascript
_command(params, flags) {
    // Boolean flags
    if (flags.v) console.log('Verbose mode');
    if (flags.a) console.log('All mode');
    
    // Combined flags work: -va = {v: true, a: true}
    
    // Parameters are separate from flags
    const filename = params[0]; // flags removed from params
}
```

## 📚 Reference

### Accessing Other Systems

```javascript
// File system
this.fs.cat(path)
this.fs.write(path, content, append)
this.fs.ls(path, flags)
this.fs.cd(path)
this.fs.pwd()
this.fs.mkdir(path)
this.fs.rm(path, flags)

// UI
this.ui.print(text, type)  // type: 'system', 'error', 'user'
this.ui.setTheme(name)
this.ui.toggleMatrix()

// Help system
this._getMan(commandName)
```

### File Types

When working with files, be aware of extensions:

```javascript
const ext = filename.split('.').pop();
if (ext === 'json') {
    // Parse JSON
    const parsed = JSON.parse(content);
} else if (ext === 'txt' || ext === 'md') {
    // Plain text
}
```

## 🚀 Best Practices

1. **Always validate input** - Check params length, types
2. **Return meaningful errors** - Help user understand what went wrong
3. **Use consistent styling** - Follow existing color scheme
4. **Add examples** - In manual and help text
5. **Handle edge cases** - Empty input, invalid paths, etc.
6. **Keep it simple** - One command = one responsibility
7. **Document well** - Update help, manual, and this guide

## 💡 Tips

- Look at existing commands for patterns
- Test with and without parameters
- Test with various flags
- Consider wildcard support if it makes sense
- Make error messages helpful
- Use colors to highlight important info
- Add your command to agent if it should be AI-accessible

## 🎓 Advanced: Adding Editor Commands

For commands that need modal UI (like vim):

```javascript
case 'editor':
    if (params.length === 0) return 'No file specified';
    this.ui.openEditor(params[0], this.fs);
    return; // No output, editor handles UI
```

See `vim-editor.js` for the editor implementation.

---

**Questions?** Check existing commands in `terminal.js` for more examples!
