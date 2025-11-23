# MinAI Terminal v3.0

A modern, browser-based terminal emulator with **autonomous AI agent**, virtual file system, and 30+ Linux-like commands.

![MinAI Terminal](https://img.shields.io/badge/version-3.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🤖 **Autonomous AI Agent** - Natural language command execution with permission system
- 📁 **Virtual File System** - Full CRUD operations with localStorage persistence
- 🎨 **12 Premium Themes** - cyberpunk, ubuntu, dracula, tokyo-night, and more
- 🖼️ **Custom Backgrounds** - 14 presets + custom URLs
- 🔍 **Smart Autocomplete** - Zoxide-like frecency tracking, Tab cycling
- 🌟 **Wildcard Support** - Use `*.txt`, `*.json` patterns
- 🎯 **30+ Commands** - File ops, network tools, JSON formatter, calculator
- 💅 **Warp-Style UI** - Modern glassmorphism design

## 🚀 Quick Start

1. **Open `index.html` in your browser**
2. **Try these commands:**
   ```bash
   help          # Show all commands
   theme list    # View available themes
   ls            # List files
   ai            # Switch to Agent mode
   ```

## 🏗️ Architecture

### File Structure

```
basic-ai/
├── index.html           # Main HTML structure
├── style.css            # All styling + 12 themes
├── script.js            # UI logic, Agent mode, event handlers
├── terminal.js          # FileSystem & CommandParser classes
├── vim-editor.js        # Vim-like modal editor
├── README.md            # This file
└── COMMANDS.md          # Developer guide for adding commands
```

### Core Components

**1. FileSystem (terminal.js)**
- Virtual file system with directory tree structure
- Persistent storage via localStorage
- Path resolution, file/dir operations
- Read-only protection for system directories

**2. CommandParser (terminal.js)**
- Command tokenization and parsing
- Alias resolution
- Flag handling
- Output redirection (`>`, `>>`)
- Wildcard expansion (`*.txt`)

**3. UI Handler (script.js)**
- Terminal output rendering
- Input handling and history
- Mode switching (shell ↔ agent)
- Theme and background management

**4. AI Agent (script.js)**
- Natural language → command translation
- Permission-based execution
- File type awareness
- Contextual understanding

## 📝 Adding a New Command

See [COMMANDS.md](file:///home/riturajprofile/chatbot/basic-ai/COMMANDS.md) for detailed guide.

### Quick Example

**1. Add to valid commands list** (terminal.js ~line 1111):
```javascript
this.validCommands = [
    // ... existing commands
    'mycommand'  // Add your command
];
```

**2. Add switch case** (terminal.js ~line 1440):
```javascript
case 'mycommand':
    output = this._mycommand(params, flags);
    break;
```

**3. Implement method** (terminal.js ~line 1800+):
```javascript
_mycommand(params, flags) {
    if (params.length === 0) {
        return 'Usage: mycommand <arg>';
    }
    // Your logic here
    return `Result: ${params[0]}`;
}
```

**4. Add to help** (terminal.js ~line 1892):
```javascript
const categories = {
    'Tools': ['calc', 'json', 'mycommand'],  // Add here
    // ...
};
```

**5. Add manual** (terminal.js ~line 2010+):
```javascript
'mycommand': {
    desc: 'Brief description',
    usage: 'mycommand <arg> [-flag]',
    flags: [['-f', 'Flag description']],
    example: 'mycommand test -f'
}
```

**6. Update Agent knowledge** (script.js ~line 508+):
```javascript
UTILITIES:
• mycommand <arg> - Brief description
```

That's it! Reload and test: `mycommand test`

## 🎯 Command Categories

| Category | Commands |
|----------|----------|
| **File System** | ls, cd, pwd, mkdir, rmdir, touch, rm, cp, mv, tree |
| **Content** | cat, echo, head, tail, wc, grep, edit, vim |
| **Network** | ping, curl |
| **Utilities** | calc, json, theme, bgset, cmatrix, neofetch |
| **System** | date, whoami, uname, clear, download, history |
| **Help** | help, man, whatis, which, alias, set |
| **AI** | ai (switch to agent mode) |

## 🤖 Agent Mode

The autonomous AI agent can:
- ✅ Execute commands for you automatically
- ✅ Handle natural language requests
- ✅ Ask permission for destructive operations
- ✅ Detect file types (.json, .txt, etc.)
- ✅ Generate multi-step command sequences
- ✅ Chat naturally when not executing commands

**Usage:**
```bash
$ ai                        # Enter agent mode
You: create a test.txt file
You: show me all json files
You: exit                   # Back to shell
```

## 🎨 Themes & Customization

**Change themes:**
```bash
theme list
theme set tokyo-night
```

**Set backgrounds:**
```bash
bgset list               # Show presets
bgset cyberpunk          # Use preset
bgset https://...        # Custom URL
bgset none               # Remove background
```

## 🔧 Advanced Features

### Autocomplete
- **Tab** - Show matches / cycle through options
- **Frecency tracking** - Most-visited directories prioritized
- Works with `cd`, files, and all commands

### Wildcards
```bash
ls *.txt                 # All text files
cat *.json               # All JSON files
rm *.old                 # Delete all .old files
```

### Input/Output Redirection
```bash
ls > files.txt           # Write to file
echo "test" >> log.txt   # Append to file
```

### Aliases
```bash
alias ll='ls -la'        # Create alias
alias                    # List all aliases
```

## 🐛 Troubleshooting

**Commands not working?**
- Check browser console for errors
- Reload the page
- Clear localStorage: `localStorage.clear()`

**Agent mode not responding?**
- Ensure API key is configured (⚙️ settings)
- Check browser console for API errors

**Files disappeared?**
- Check localStorage size (5MB limit)
- Export important files with `download`

## 📚 Developer Resources

- **[COMMANDS.md](file:///home/riturajprofile/chatbot/basic-ai/COMMANDS.md)** - Detailed command development guide
- **Architecture** - See above for component breakdown
- **Code Style** - Follow existing patterns, add comments

## 🙏 Contributing

1. Fork the repository
2. Add your feature/command
3. Follow the patterns in COMMANDS.md
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use and modify!

## 🎉 Credits

Built with vanilla JavaScript - no frameworks, just pure code.

**Special Features:**
- Autonomous AI agent with permission system
- Zoxide-inspired directory tracking
- Warp-inspired modern UI
- JSON formatter with syntax highlighting
