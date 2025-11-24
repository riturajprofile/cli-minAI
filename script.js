import { AIClient } from './ai.js';
import { FileSystem, CommandParser } from './terminal.js';
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
            if (input.toLowerCase() === 'exit') {
                // Switch back to shell
                document.querySelector('[data-mode="sh"]').click();
                uiHandler.print('Switched to shell mode', 'system');
                elements.input.value = '';
                return;
            }

            // Direct command bypass
            const validCommands = ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cat', 'help', 'clear', 'theme'];
            const firstWord = input.trim().split(/\s+/)[0];
            if (validCommands.includes(firstWord)) {
                uiHandler.print(`$ ${input}`, 'user');
                elements.input.value = '';
                const result = await parser.parse(input);
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
            // Shell Mode
            const user = 'user@minai';
            const path = state.path.join('/');
            const dir = path === 'home' ? '~' : (path.startsWith('home/') ? '~/' + path.slice(5) : path);
            uiHandler.print(`${user}:${dir}$ ${input}`, 'user');
            elements.input.value = '';

            const result = await parser.parse(input);
            if (result) uiHandler.print(result);

            if (input.trim().startsWith('cd ')) {
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

CAPABILITIES:
- FILE OPS: ls, cd, pwd, mkdir, rm, cp, mv, touch, cat, echo (with > or >>)
- INFO: date, whoami, uname, help, history
- VISUAL: theme, bgset, json <file>
- NET: ping, curl

RESPONSE FORMAT (Strict JSON):
{
  "plan": "Brief explanation",
  "commands": ["cmd1", "cmd2"],
  "needsPermission": true/false
}
needsPermission = true for: mkdir, rm, cp, mv, theme, bgset, download.
needsPermission = false for: ls, cat, pwd, cd, grep, echo, date, whoami.

CRITICAL:
1. If asked to write content, use: echo 'line' > file.txt
2. If asked to read/format JSON, use: json filename.json
3. If asked to chat, use: echo 'Response'
4. ALWAYS return valid JSON.`;
}

// Agent Executor
async function handleAgentRequest(userRequest) {
    state.isLoading = true;
    uiHandler.print(`\n✨ Agent thinking...`, 'system');

    if (!state.apiKey) {
        uiHandler.print('❌ API Key not set. Use /config.', 'error');
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

uiHandler.print(`Hi, I'm Ritu Raj.\nType 'help' for commands, or click 'Agent' (✨) for AI assistance.`, 'system');

const savedTheme = localStorage.getItem('minai_theme');
if (savedTheme) uiHandler.setTheme(savedTheme);

const savedBg = localStorage.getItem('minai_bg');
if (savedBg) {
    const val = savedBg === 'none' ? 'none' : `url('${savedBg}')`;
    document.documentElement.style.setProperty('--bg-image', val);
}