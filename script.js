import { AIClient } from './ai.js';
import { FileSystem, CommandParser } from './terminal.js';
import { VimEditor } from './vim-editor.js';

// State management
const state = {
    chatMode: false,
    configOpen: false,
    history: [],
    historyIndex: -1,
    path: ['home'],
    currentMode: 'sh', // 'sh' or 'agent'

    // Confirmation Handling
    waitingForConfirmation: false,
    confirmationResolver: null,

    // Directory Tracking
    dirHistory: JSON.parse(localStorage.getItem('minai_dir_history') || '{}'),
    suggestions: [],
    suggestionIndex: 0,

    // API Configuration (Load once on start)
    apiKey: localStorage.getItem('openai_api_key') || '',
    baseUrl: localStorage.getItem('openai_base_url') || 'https://aipipe.org/openrouter/v1/chat/completions',
    isLoading: false
};

// Directory tracking - like zoxide
function trackDirectory(path) {
    const now = Date.now();
    if (!state.dirHistory[path]) {
        state.dirHistory[path] = { count: 0, lastVisit: now };
    }
    state.dirHistory[path].count++;
    state.dirHistory[path].lastVisit = now;
    localStorage.setItem('minai_dir_history', JSON.stringify(state.dirHistory));
}

function getDirectorySuggestions(partial) {
    const now = Date.now();
    const scores = Object.entries(state.dirHistory).map(([path, data]) => {
        const ageHours = (now - data.lastVisit) / (1000 * 60 * 60);
        const recencyMultiplier = Math.max(0.25, 1 / (1 + ageHours / 24));
        const frecency = data.count * recencyMultiplier;
        return { path, frecency };
    });

    return scores
        .filter(s => !partial || s.path.includes(partial))
        .sort((a, b) => b.frecency - a.frecency)
        .slice(0, 5)
        .map(s => s.path);
}

// DOM elements
const elements = {
    input: document.getElementById('commandInput'),
    output: document.getElementById('output'),
    prompt: document.getElementById('promptText'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    settingsModal: document.getElementById('settingsModal'),
    apiKeyInput: document.getElementById('apiKey'),
    baseUrlInput: document.getElementById('baseUrl'),
    providerSelect: document.getElementById('provider'),
    saveSettingsBtn: document.getElementById('saveSettings'),
    closeSettingsBtn: document.getElementById('closeSettings'),
    editorModal: document.getElementById('editorModal'),
    editorContent: document.getElementById('editorContent'),
    editorTitle: document.getElementById('editorTitle')
};

// Vim Editor instance
let vimEditor = null;

// Matrix Effect
class MatrixEffect {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.active = false;
        this.interval = null;
        this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
        this.fontSize = 14;
        this.columns = 0;
        this.drops = [];

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = this.canvas.width / this.fontSize;
        this.drops = [];
        for (let i = 0; i < this.columns; i++) {
            this.drops[i] = 1;
        }
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#0F0';
        this.ctx.font = this.fontSize + 'px monospace';

        for (let i = 0; i < this.drops.length; i++) {
            const text = this.chars.charAt(Math.floor(Math.random() * this.chars.length));
            this.ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);

            if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
            this.drops[i]++;
        }
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.canvas.style.opacity = '1';
        this.interval = setInterval(() => this.draw(), 33);

        const stopHandler = () => {
            this.stop();
            document.removeEventListener('keydown', stopHandler);
            document.removeEventListener('click', stopHandler);
        };
        document.addEventListener('keydown', stopHandler);
        document.addEventListener('click', stopHandler);
    }

    stop() {
        this.active = false;
        clearInterval(this.interval);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.style.opacity = '0.3';
    }
}

const matrix = new MatrixEffect('matrixCanvas');
const fs = new FileSystem();

// UI Handler
const uiHandler = {
    print: (text, type = 'system') => {
        const line = document.createElement('div');
        line.className = `line ${type}`;
        if (type === 'user') {
            line.textContent = text;
        } else {
            line.innerHTML = text;
        }
        elements.output.appendChild(line);
        scrollToBottom();
    },
    clear: () => elements.output.innerHTML = '',
    openSettings: () => openSettings(),
    openEditor: (filename, content) => {
        if (!vimEditor) {
            vimEditor = new VimEditor(
                elements.editorModal,
                (fname, newContent) => {
                    const result = fs.write(fname, newContent);
                    uiHandler.print(result ? `Error: ${result}` : `Saved ${fname}`, result ? 'error' : 'system');
                },
                () => {
                    elements.editorModal.style.display = 'none';
                    elements.input.focus();
                    vimEditor = null;
                }
            );
        }
        vimEditor.open(filename, content);
        elements.editorModal.style.display = 'flex';
    },
    downloadFile: (filename, content) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    setPrompt: (text) => {
        if (text) elements.prompt.textContent = text;
        else updatePrompt();
    },
    getHistory: () => state.history,
    handleChat: async (content) => await handleChat(content),
    toggleMatrix: () => matrix.start(),
    setTheme: (themeName) => {
        document.body.className = `theme-${themeName}`;
        localStorage.setItem('minai_theme', themeName);
    }
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

function scrollToBottom() {
    elements.output.scrollTop = elements.output.scrollHeight;
}

function updatePrompt() {
    const cwd = fs.pwd();
    const displayPath = cwd === '/home' ? '~' : cwd.replace('/home', '~');
    elements.prompt.textContent = `user@minai:${displayPath}$`;
}

function initializeModeSwitcher() {
    elements.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            state.currentMode = mode;
            elements.modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (mode === 'agent') {
                elements.prompt.textContent = 'AI Agent:';
                elements.input.placeholder = 'Ask me anything...';
                elements.input.style.color = '#8be9fd';
            } else {
                updatePrompt();
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
            const validCommands = ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cat', 'help', 'clear', 'theme', 'cmatrix'];
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
            uiHandler.print(`${elements.prompt.textContent} ${input}`, 'user');
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
- VISUAL: theme, bgset, cmatrix, json <file>
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

// Settings Logic
function openSettings() {
    elements.apiKeyInput.value = state.apiKey;
    elements.baseUrlInput.value = state.baseUrl;

    const options = Array.from(elements.providerSelect.options).map(o => o.value);
    elements.providerSelect.value = options.includes(state.baseUrl) ? state.baseUrl : 'custom';

    elements.settingsModal.style.display = 'flex';
    elements.apiKeyInput.focus();
}

function closeSettings() {
    elements.settingsModal.style.display = 'none';
    elements.input.focus();
}

function saveSettings() {
    const key = elements.apiKeyInput.value.trim();
    const url = elements.baseUrlInput.value.trim();

    if (key) {
        state.apiKey = key;
        state.baseUrl = url;
        localStorage.setItem('openai_api_key', key);
        localStorage.setItem('openai_base_url', url);
        uiHandler.print('Configuration saved.', 'system');
        closeSettings();
    }
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