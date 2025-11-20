import { AIClient } from './ai.js';
import { FileSystem, CommandParser } from './terminal.js';
import { VimEditor } from './vim-editor.js';

// State
const state = {
    apiKey: localStorage.getItem('openai_api_key') || '',
    baseUrl: localStorage.getItem('openai_base_url') || '',
    isLoading: false,
    history: [],
    historyIndex: -1
};

// Components
const fs = new FileSystem();
const elements = {
    output: document.getElementById('output'),
    input: document.getElementById('commandInput'),
    prompt: document.querySelector('.prompt'),
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

// UI Handler for CommandParser
const uiHandler = {
    print: (text, type = 'system') => {
        const line = document.createElement('div');
        line.className = `line ${type}`;
        if (type === 'user') {
            line.textContent = text;
        } else {
            line.innerHTML = text; // Allow HTML for system/ai messages
        }
        elements.output.appendChild(line);
        scrollToBottom();
    },
    clear: () => {
        elements.output.innerHTML = '';
    },
    openSettings: () => {
        openSettings();
    },
    openEditor: (filename, content) => {
        if (!vimEditor) {
            vimEditor = new VimEditor(
                elements.editorModal,
                (fname, newContent) => {
                    // Save callback
                    const result = fs.write(fname, newContent);
                    if (result) {
                        uiHandler.print(`Error saving: ${result}`, 'error');
                    } else {
                        uiHandler.print(`Saved ${fname}`, 'system');
                    }
                },
                () => {
                    // Close callback
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
        if (text) {
            elements.prompt.textContent = text;
        } else {
            updatePrompt(); // Reset to default
        }
    },
    getHistory: () => {
        return state.history;
    },
    handleChat: async (content) => {
        await handleChat(content);
    }
};

const parser = new CommandParser(fs, uiHandler);

function scrollToBottom() {
    elements.output.scrollTop = elements.output.scrollHeight;
}

function updatePrompt() {
    const cwd = fs.pwd();
    const displayPath = cwd === '/home' ? '~' : cwd.replace('/home', '~');
    elements.prompt.textContent = `user@minai:${displayPath}$`;
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
        const lastArg = args[args.length - 1];

        // Files in CWD
        const files = fs.ls(null, {}); // Get list of names
        if (typeof files === 'string') {
            // ls returned string (error or single item), try to parse
            // Actually fs.ls returns string joined by spaces or newlines depending on flags.
            // We need a raw list method in FS for autocomplete, but for now let's just use ls output if simple
            // Or better, expose a list method
            // Let's hack it:
            const rawList = fs.ls(null, { a: true }).split('  ').map(s => s.replace('/', ''));
            const matches = rawList.filter(f => f.startsWith(lastArg));
            if (matches.length === 1) {
                args[args.length - 1] = matches[0];
                elements.input.value = args.join(' ');
            }
        }
        return;
    }

    if (e.key === 'Enter') {
        const input = elements.input.value;
        elements.input.value = '';
        state.historyIndex = -1;

        if (input.trim()) {
            state.history.push(input);
            // Echo command
            // Check if we are in chat mode to style prompt differently in echo?
            // For now just use current prompt text
            uiHandler.print(`${elements.prompt.textContent} ${input}`, 'user');

            const result = await parser.parse(input);

            if (result && result.type === 'chat') {
                await handleChat(result.content);
            }

            // Only update prompt if we are NOT in chat mode (which sets its own prompt)
            if (parser.mode !== 'chat') {
                updatePrompt();
            }
        }
    }
}



async function handleChat(content) {
    if (!state.apiKey) {
        uiHandler.print('Error: API Key missing. Type /config to set it.', 'error');
        return;
    }

    state.isLoading = true;
    try {
        // Load system prompt from configuration
        let systemPromptContent = 'You are MinAI, a helpful assistant.';
        try {
            systemPromptContent = fs.cat('/configuration/system-prompt.txt');
            if (systemPromptContent.startsWith('Error')) {
                systemPromptContent = 'You are MinAI, a helpful assistant.';
            }
        } catch (e) { }

        const systemPrompt = { role: 'system', content: systemPromptContent };
        const messages = [systemPrompt, { role: 'user', content: content }];

        const baseUrl = state.baseUrl || 'https://aipipe.org/openrouter/v1/chat/completions';
        const client = new AIClient(state.apiKey, baseUrl);

        const response = await client.sendMessage(messages);

        uiHandler.print(response.content, 'ai');

    } catch (error) {
        uiHandler.print(`Error: ${error.message}`, 'error');
    } finally {
        state.isLoading = false;
    }
}

// Settings Logic
function openSettings() {
    elements.apiKeyInput.value = state.apiKey;
    const currentUrl = state.baseUrl || 'https://aipipe.org/openrouter/v1/chat/completions';
    elements.baseUrlInput.value = currentUrl;

    const options = Array.from(elements.providerSelect.options).map(o => o.value);
    if (options.includes(currentUrl)) {
        elements.providerSelect.value = currentUrl;
    } else {
        elements.providerSelect.value = 'custom';
    }

    elements.settingsModal.style.display = 'flex';
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

// Initial Focus & Prompt
elements.input.focus();
document.addEventListener('click', () => elements.input.focus());
updatePrompt();

// Welcome Message
uiHandler.print('Welcome to MinAI Terminal v3.0', 'system');
uiHandler.print('Type "help" for commands, "cat /README" for docs, or "chat" to talk to AI.', 'system');
