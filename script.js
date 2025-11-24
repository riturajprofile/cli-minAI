import { AIClient } from './ai.js';
import { FileSystem } from './modules/filesystem.js';
import { CommandParser } from './modules/parser.js';
import { state, trackDirectory, getDirectorySuggestions } from './modules/state.js';

import { elements, uiHandler, openSettings, closeSettings, saveSettings } from './modules/ui.js';

const fs = new FileSystem();

// Assign missing methods to uiHandler that depend on local scope or specific logic
uiHandler.handleChat = async (content) => await handleAgentRequest(content);
// Wrap openEditor to pass fs
const originalOpenEditor = uiHandler.openEditor;
uiHandler.openEditor = (filename, content) => originalOpenEditor(filename, content, fs);
// Wrap setPrompt to use updatePrompt if no text provided
const originalSetPrompt = uiHandler.setPrompt;
uiHandler.setPrompt = (text) => {
    if (text) originalSetPrompt(text);
    else updatePrompt();
};


// Simple Chat/Command Handler (used by CommandParser)
const aiHandler = async (prompt) => {
    if (!state.apiKey) return 'Error: API Key missing. Type /config to set it.';

    try {
        let systemPromptContent = 'You are MinAI, a helpful assistant.';
        try {
            const fileContent = fs.cat('/configuration/system-prompt.txt');
            if (!fileContent.startsWith('Error')) systemPromptContent = fileContent;
        } catch (e) { }

        const messages = [{ role: 'system', content: systemPromptContent }, { role: 'user', content: prompt }];
        const client = new AIClient(state.apiKey, state.baseUrl);
        const response = await client.sendMessage(messages);
        return response.content;
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

const parser = new CommandParser(fs, uiHandler, aiHandler);

function updatePrompt() {
    const user = 'user@minai';
    const path = state.path.join('/');
    const dir = path === 'home' ? '~' : (path.startsWith('home/') ? '~/' + path.slice(5) : path);

    uiHandler.setContext(user, dir);
}

function initializeModeSwitcher() {
    elements.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            state.currentMode = mode;
            elements.modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (mode === 'agent') {
                if (elements.promptSymbol) elements.promptSymbol.textContent = '✨';
                elements.input.placeholder = 'Ask me anything...';
                elements.input.style.color = '#8be9fd';
            } else {
                updatePrompt();
                if (elements.promptSymbol) elements.promptSymbol.textContent = '❯';
                elements.input.placeholder = "Type a command... (try 'help')";
                elements.input.style.color = '#ffffff';
            }
            elements.input.focus();
        });
    });
}

async function handleInput(e) {
    // History Navigation
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            elements.input.value = state.history[state.history.length - 1 - state.historyIndex];
        }
        return;
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (state.historyIndex > 0) {
            state.historyIndex--;
            elements.input.value = state.history[state.history.length - 1 - state.historyIndex];
        } else if (state.historyIndex === 0) {
            state.historyIndex = -1;
            elements.input.value = '';
        }
        return;
    }

    // Tab Autocomplete
    if (e.key === 'Tab') {
        e.preventDefault();
        const input = elements.input.value;
        const args = input.split(/\s+/);
        const command = args[0];
        const lastArg = args[args.length - 1];

        // Smart cd suggestions
        if (command === 'cd' && args.length >= 2) {
            const suggestions = getDirectorySuggestions(lastArg);
            handleSuggestions(suggestions, args);
            return;
        }

        // Regular file suggestions
        const files = fs.ls(null, {});
        if (typeof files === 'string') {
            const rawList = files.split('  ').map(s => s.replace('/', '').trim()).filter(s => s);
            const matches = rawList.filter(f => f.startsWith(lastArg));
            handleSuggestions(matches, args);
        }
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        const input = elements.input.value.trim();
        if (!input) return;

        // 1. Handle Confirmation Waiting (Logic fixed)
        if (state.waitingForConfirmation) {
            const isYes = input.toLowerCase() === 'yes' || input.toLowerCase() === 'y';
            elements.input.value = '';

            // Resolve the promise waiting in handleAgentRequest
            if (state.confirmationResolver) {
                state.confirmationResolver(isYes);
                state.confirmationResolver = null;
            }
            state.waitingForConfirmation = false;
            return;
        }

        // 2. Add to history
        state.history.push(input);
        state.historyIndex = -1;
        state.suggestions = [];

        // 3. Handle based on mode
        if (state.currentMode === 'agent') {
            if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'sh') {
                // Switch back to shell
                document.querySelector('[data-mode="sh"]').click();
                uiHandler.print('Switched to shell mode', 'system');
                elements.input.value = '';
                return;
            }

            // Direct command bypass - handle commands and slash commands
            const validCommands = ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cat', 'help', 'clear', 'theme',
                'config', 'man', 'alias', 'set', 'history', 'bgset'];
            const firstWord = input.trim().split(/\s+/)[0];
            // Remove leading slash if present
            const commandWord = firstWord.startsWith('/') ? firstWord.slice(1) : firstWord;

            if (validCommands.includes(commandWord) || firstWord.startsWith('/')) {
                // Handle slash commands by removing the slash
                const cleanInput = input.startsWith('/') ? input.slice(1) : input;
                uiHandler.print(`$ ${cleanInput}`, 'user');
                elements.input.value = '';
                const result = await parser.parse(cleanInput);
                if (result) uiHandler.print(result);
                updatePrompt();
                return;
            }

            // AI Agent
            uiHandler.print(`You: ${input}`, 'user');
            elements.input.value = '';
            await handleAgentRequest(input);

        } else {
            // Shell Mode
            const user = 'user@minai';
            const path = state.path.join('/');
            const dir = path === 'home' ? '~' : (path.startsWith('home/') ? '~/' + path.slice(5) : path);

            // Remove leading slash if present (e.g., /config -> config)
            const cleanInput = input.startsWith('/') ? input.slice(1) : input;

            uiHandler.print(`${user}:${dir}$ ${input}`, 'user');
            elements.input.value = '';

            const result = await parser.parse(cleanInput);
            if (result) uiHandler.print(result);

            if (cleanInput.trim().startsWith('cd ')) {
                trackDirectory(fs.pwd());
            }
            updatePrompt();
        }
    }
}

function handleSuggestions(suggestions, args) {
    if (suggestions.length === 1) {
        args[args.length - 1] = suggestions[0];
        elements.input.value = args.join(' ');
        state.suggestions = [];
    } else if (suggestions.length > 1) {
        if (state.suggestions.length === 0 || state.suggestions.join() !== suggestions.join()) {
            state.suggestions = suggestions;
            state.suggestionIndex = 0;
            uiHandler.print(`\nSuggestions: ${suggestions.join('  ')}`, 'system');
        } else {
            state.suggestionIndex = (state.suggestionIndex + 1) % state.suggestions.length;
        }
        args[args.length - 1] = state.suggestions[state.suggestionIndex];
        elements.input.value = args.join(' ');
    }
}

// === AUTONOMOUS AGENT LOGIC ===

// Helper: Generate System Prompt
function getSystemPrompt() {
    const currentPath = fs.pwd();
    const filesInDir = fs.ls(null, {});

    return `You are an autonomous terminal agent for MinAI Terminal.
CURRENT CONTEXT:
- Directory: ${currentPath}
- Files: ${filesInDir}

AVAILABLE COMMANDS (40+ total):

FILE SYSTEM:
- ls [-la] [dir] - List files (flags: -l long, -a all)
- cd <dir> - Change directory (use: cd .., cd /path, cd ~)
- pwd - Print working directory
- mkdir <name> - Create directory
- rmdir <name> - Remove empty directory
- touch <file> - Create file
- rm <file> - Remove file
- cp <src> <dest> - Copy file
- mv <src> <dest> - Move/rename file
- tree - Show directory tree

CONTENT:
- cat <file> - Display file content
- echo <text> - Print text (use: echo 'text' > file.txt to write)
- head [-n N] <file> - Show first N lines (default 10)
- tail [-n N] <file> - Show last N lines
- wc <file> - Count lines, words, characters
- grep <pattern> <file> - Search in file
- edit/vim/nano <file> - Open editor

SYSTEM & INFO:
- date - Current date/time
- whoami - Current user
- uname - System info
- df - Disk space info
- clear - Clear screen
- history - Command history
- reset - Reset filesystem
- exit - Exit (in agent mode)
- neofetch - System info display

VISUAL & THEMES:
- theme list - Show available themes
- theme set <name> - Change theme
  Available: cyberpunk, ubuntu, hacker, retro, dracula, monokai, nord, solarized-dark, solarized-light
  Example: "theme set dracula" (NOT "theme dracula")
- bgset list - Show background presets
- bgset <preset|url|none> - Set background
  Presets: cyberpunk, matrix, space, retro, nature
  Example: "bgset cyberpunk" or "bgset none"
- json <file> - Format and display JSON

NETWORK:
- ping <host> - Ping a host
- curl <url> - Fetch URL content
- download <file> - Download file
- upload - Upload file

TOOLS:
- calc <expression> - Calculator (e.g., calc 5 + 3 * 2)
- alias [name='command'] - Create/list aliases
- set [VAR=value] - Set/show environment variables
- help - Show all commands
- man <command> - Show manual for command
- whatis <command> - Brief command description
- which <command> - Show command location

I/O REDIRECTION:
- command > file.txt - Overwrite file with output
- command >> file.txt - Append output to file
- command | command2 - Pipe output to another command

RESPONSE FORMAT (STRICT JSON):
{
  "plan": "Brief explanation of what I'll do",
  "commands": ["exact command 1", "exact command 2"],
  "needsPermission": true/false
}

PERMISSION RULES:
- needsPermission = true for: mkdir, rmdir, rm, cp, mv, touch, theme, bgset, download, upload, reset
- needsPermission = false for: ls, cat, pwd, cd, grep, echo, date, whoami, calc, json, help, man, tree, wc, head, tail, history, clear

CRITICAL RULES:
1. For theme changes: ALWAYS use "theme set <name>", NOT "theme <name>"
2. For backgrounds: Use "bgset <preset>" directly (e.g., "bgset matrix")
3. For writing files: Use echo 'content' > file.txt
4. For JSON files: Use json filename.json (not cat)
5. For dark themes: Use dracula, monokai, nord, solarized-dark, or hacker
6. ALWAYS return valid JSON with exact command syntax
7. If user asks conversational questions, respond via: echo 'Your answer here'
8. Double-check command syntax before responding`;
}

// Agent Executor
async function handleAgentRequest(userRequest) {
    state.isLoading = true;
    uiHandler.print(`\n✨ Agent thinking...`, 'system');

    if (!state.apiKey) {
        uiHandler.print('❌ API Key not set.', 'error');
        uiHandler.print('Do you want to activate /config? Type "yes" to configure:', 'system');

        // Wait for user input
        const confirmed = await new Promise((resolve) => {
            state.waitingForConfirmation = true;
            state.confirmationResolver = resolve;
        });

        if (confirmed) {
            // Open config modal
            openSettings();
            uiHandler.print('Configuration modal opened. Please set your API key.', 'system');
        } else {
            uiHandler.print('Configuration cancelled. You can type "/config" anytime.', 'system');
        }

        state.isLoading = false;
        return;
    }

    try {
        const systemPrompt = getSystemPrompt();

        // Prepare Fetch
        let apiUrl = state.baseUrl;
        if (!apiUrl.includes('/chat/completions')) {
            apiUrl = apiUrl.replace(/\/$/, '') + '/chat/completions';
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userRequest }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error(`API error: ${response.statusText}`);

        const data = await response.json();
        const agentResponse = data.choices[0].message.content.trim();

        // Robust JSON Parsing
        let plan;
        try {
            plan = JSON.parse(agentResponse);
        } catch (e) {
            // Regex fallback for Markdown code blocks
            const jsonMatch = agentResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || agentResponse.match(/(\{[\s\S]*\})/);
            if (jsonMatch) {
                plan = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in response');
            }
        }

        // Display Plan
        uiHandler.print(`\n📋 Plan: ${plan.plan}`, 'system');

        // Check Permission
        if (plan.needsPermission) {
            uiHandler.print(`\n⚠️  Commands: \n${plan.commands.map(c => ` > ${c}`).join('\n')}\nType 'yes' to execute:`, 'system');

            // Wait for user input via handleInput
            const confirmed = await new Promise((resolve) => {
                state.waitingForConfirmation = true;
                state.confirmationResolver = resolve;
            });

            if (!confirmed) {
                uiHandler.print('Cancelled.', 'system');
                state.isLoading = false;
                return;
            }
        } else {
            uiHandler.print(`\n📝 Executing: ${plan.commands.join(', ')}`, 'system');
        }

        // Execute Commands
        uiHandler.print(`\n🚀 Running...\n`, 'system');
        for (const cmdStr of plan.commands) {
            try {
                uiHandler.print(`$ ${cmdStr}`, 'user');
                await parser.parse(cmdStr);
                updatePrompt();
                await new Promise(r => setTimeout(r, 200)); // Visual delay
            } catch (err) {
                uiHandler.print(`Error: ${err.message}`, 'error');
                break;
            }
        }
        uiHandler.print(`\n✅ Done!`, 'system');

    } catch (error) {
        uiHandler.print(`❌ Agent error: ${error.message}`, 'error');
        console.error(error);
    }

    state.isLoading = false;
}

// Event Listeners
elements.input.addEventListener('keydown', handleInput);
elements.saveSettingsBtn.addEventListener('click', saveSettings);
elements.closeSettingsBtn.addEventListener('click', closeSettings);
elements.providerSelect.addEventListener('change', () => {
    const val = elements.providerSelect.value;
    if (val !== 'custom') elements.baseUrlInput.value = val;
});

// Focus handling
elements.input.focus();
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.closest('.modal')) return;
    if (window.getSelection().toString().length > 0) return;
    elements.input.focus();
});

// Initialization

initializeModeSwitcher();
updatePrompt();

// Check if first visit
const hasVisited = localStorage.getItem('minai_visited');
if (!hasVisited) {
    // First-time visitor message
    uiHandler.print(`╔════════════════════════════════════════════════════════════════╗
║          Welcome to MinAI Terminal - AI-Powered CLI           ║
╚════════════════════════════════════════════════════════════════╝

✨ PROJECT MOTTO:
   This is a fun project built using vibe coding - not a production use case,
   but this type of functionality can be implemented in DevOps tools, CI/CD
   pipelines, cloud management platforms, and educational environments!

🚀 What is MinAI Terminal?
   A browser-based Linux-like terminal with AI intelligence built in!
   Experience the power of command-line interface with AI assistance.
💡 Quick Start (3 easy steps):
   1. Type 'help' to see all 40+ available commands
   2. Try 'cat welcome.txt' for a detailed guide
   3. Click 'Agent (✨)' for AI-powered command execution
🎯 Two Powerful Modes:
   • Shell Mode (❯)  - Traditional command-line interface
   • Agent Mode (✨) - AI assistant that executes commands for you
⚡ Try These Now:
   ls              - List files
   tree            - View directory structure
   theme list      - See available themes
🔑 Optional: Configure AI (for Agent mode)
   Type '/config' to set your OpenAI API key
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Created by Ritu Raj | riturajprofile@gmail.com
🌐 www.riturajprofile.com | 💻 github.com/riturajprofile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'system');

    localStorage.setItem('minai_visited', 'true');
} else {
    // Returning visitor message
    uiHandler.print(`Hi, I'm Ritu Raj.
contact: riturajprofile@gmail.com | www.riturajprofile.com
Type 'help' for commands, or click 'Agent' (✨) for AI assistance.`, 'system');
}

const savedTheme = localStorage.getItem('minai_theme');
if (savedTheme) uiHandler.setTheme(savedTheme);

const savedBg = localStorage.getItem('minai_bg');
if (savedBg) {
    const val = savedBg === 'none' ? 'none' : `url('${savedBg}')`;
    document.documentElement.style.setProperty('--bg-image', val);
}