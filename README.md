# MinAI Terminal v3.0

A modern, browser-based terminal emulator with **autonomous AI agent**, modular architecture, virtual file system, and 40+ Linux-like commands.

![MinAI Terminal](https://img.shields.io/badge/version-3.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🤖 **Autonomous AI Agent** - Natural language command execution with permission system
- 📁 **Virtual File System** - Full CRUD operations with localStorage persistence
- 🏗️ **Modular Architecture** - Command registry pattern for easy extensibility
- 🎨 **9 Premium Themes** - cyberpunk, ubuntu, dracula, monokai, and more
- 🖼️ **Custom Backgrounds** - 5 presets + custom URLs
- 🔍 **Smart Autocomplete** - Tab completion with frecency tracking
- 📝 **Vim Editor** - Full modal editor (Normal, Insert, Command modes)
- 🎯 **40+ Commands** - File ops, network tools, JSON formatter, calculator
- 🔄 **I/O Redirection** - Pipes (`|`) and output redirection (`>`, `>>`)
- 💅 **Warp-Style UI** - Modern glassmorphism design with context chips

## 🚀 Quick Start

1. **Open `index.html` in your browser**
2. **Try these commands:**
   ```bash
   help          # Show all commands
   theme list    # View available themes
   ls            # List files
   ai            # Switch to Agent mode
   alias         # List all aliases
   ```

## 🏗️ Architecture

### File Structure

```
basic-ai/
├── index.html           # Main HTML structure
├── style.css            # All styling + 9 themes
├── script.js            # Main orchestration, AI agent, event handlers
├── ai.js                # AI client for API communication
├── vim-editor.js        # Vim-like modal editor
├── modules/
│   ├── state.js         # State management
│   ├── ui.js            # UI handler
│   ├── filesystem.js    # Virtual file system
│   ├── parser.js        # Command parser
│   └── commands/        # Command implementations
│       ├── registry.js      # Command registry
│       ├── file-system.js   # File/directory commands
│       ├── content.js       # Content manipulation
│       ├── system.js        # System commands
│       ├── network.js       # Network operations
│       ├── utils.js         # Utilities (calc, json, theme)
│       └── help.js          # Documentation commands
├── README.md            # This file
└── COMMANDS.md          # Developer guide for adding commands
```

### Core Components

**1. FileSystem (modules/filesystem.js)**
- Virtual file system with directory tree structure
- Persistent storage via localStorage
- Path resolution, file/dir operations
- Read-only protection for system directories

**2. CommandParser (modules/parser.js)**
- Command tokenization and parsing
- Alias resolution and loading
- Flag handling
- Output redirection (`>`, `>>`)
- Pipe support (`|`)

**3. Command Registry (modules/commands/registry.js)**
- Centralized command registration
- Alias management
- Category organization

**4. UI Handler (modules/ui.js)**
- Terminal output rendering
- Input handling and history
- Mode switching (shell ↔ agent)
- Theme and background management

**5. AI Agent (script.js)**
- Natural language → command translation
- Permission-based execution
- File type awareness
- Contextual understanding

## 📝 Adding a New Command

See [COMMANDS.md](COMMANDS.md) for detailed guide.

### Quick Example

**1. Create command in appropriate module** (e.g., `modules/commands/utils.js`):
```javascript
registry.register('mycommand', (args, flags) => {
    if (args.length === 0) return 'Usage: mycommand <arg>';
    return `Result: ${args[0]}`;
}, 'Brief description', 'mycommand <arg>', 'Tools');
```

That's it! The command is automatically:
- Added to the help system
- Available for execution
- Included in `man` pages

## 🎯 Command Categories

| Category | Commands |
|----------|----------|
| **File System** | ls, cd, pwd, mkdir, rmdir, touch, rm, cp, mv, tree |
| **Content** | cat, echo, head, tail, wc, grep, edit, vim, nano |
| **Network** | ping, curl, download, upload |
| **System** | date, whoami, uname, df, clear, history, reset, exit, theme, bgset, neofetch, alias, set |
| **Tools** | calc, json |
| **Info & Config** | help, man, whatis, which |
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
theme set dracula
```

**Available themes:**
- cyberpunk (default)
- ubuntu
- hacker
- retro
- dracula
- monokai
- nord
- solarized-dark
- solarized-light

**Set backgrounds:**
```bash
bgset list               # Show presets
bgset cyberpunk          # Use preset
bgset https://...        # Custom URL
bgset none               # Remove background
```

## 🔧 Advanced Features

### Aliases
```bash
alias ll='ls -la'        # Create alias
alias                    # List all aliases
ll                       # Use alias
```

Default aliases (in `/configuration/aliases.txt`):
- `ll` → `ls -la`
- `la` → `ls -a`
- `h` → `help`
- `c` → `clear`
- `..` → `cd ..`
- `...` → `cd ../..`

### Input/Output Redirection
```bash
ls > files.txt           # Write to file
echo "test" >> log.txt   # Append to file
cat file.txt | wc        # Pipe to another command
```

### Vim Editor
```bash
vim file.txt             # or: edit file.txt, nano file.txt
```

**Modes:**
- **Normal**: `h` `j` `k` `l` to navigate, `i` to insert, `:` for commands
- **Insert**: Type text, `ESC` to return to normal
- **Command**: `:w` save, `:q` quit, `:wq` save & quit, `:q!` force quit

### File Upload
```bash
upload                   # Opens file picker
```
Note: Filenames with spaces are automatically converted to underscores.

## 🐛 Troubleshooting

**Commands not working?**
- Check browser console for errors
- Reload the page
- Try: `reset` to restore default filesystem

**Agent mode not responding?**
- Ensure API key is configured (⚙️ settings)
- Check browser console for API errors

**Files disappeared?**
- Check localStorage size (5MB limit)
- Export important files with `download`

## 📚 Developer Resources

- **[COMMANDS.md](COMMANDS.md)** - Detailed command development guide
- **Architecture** - See above for component breakdown
- **Modular Design** - Each command category in separate file
- **Command Registry** - Easy registration with `registry.register()`

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
- Modular command registry architecture
- Warp-inspired modern UI with context chips
- Full vim modal editor implementation
- I/O redirection and pipe support
- JSON formatter with syntax highlighting

## 🔗 Links

- **Live Demo**: [cli.riturajprofile.me](https://cli.riturajprofile.me)
- **Portfolio**: [riturajprofile.me](https://www.riturajprofile.me)
- **GitHub**: [@riturajprofile](https://github.com/riturajprofile)
