import { VimEditor } from '../vim-editor.js';
import { state } from './state.js';

// DOM elements
export const elements = {
    input: document.getElementById('commandInput'),
    output: document.getElementById('output'),
    promptSymbol: document.querySelector('.prompt-symbol'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    settingsModal: document.getElementById('settingsModal'),
    apiKeyInput: document.getElementById('apiKey'),
    baseUrlInput: document.getElementById('baseUrl'),
    providerSelect: document.getElementById('provider'),
    saveSettingsBtn: document.getElementById('saveSettings'),
    closeSettingsBtn: document.getElementById('closeSettings'),
    editorModal: document.getElementById('editorModal'),
    editorContent: document.getElementById('editorContent'),
    editorTitle: document.getElementById('editorTitle'),
    fileInput: document.getElementById('fileInput')
};

// Vim Editor instance
let vimEditor = null;

export const uiHandler = {
    triggerUpload: (callback) => {
        const input = elements.fileInput;
        input.value = ''; // Reset

        const handler = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                callback(file.name, content);
            };

            if (file.type.startsWith('image/')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }

            input.removeEventListener('change', handler);
        };

        input.addEventListener('change', handler);
        input.click();
    },
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
    openEditor: (filename, content, fs) => {
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
    setContext: (user, dir) => {
        const userChip = document.querySelector('.chip.user');
        const dirChip = document.querySelector('.chip.dir');
        if (userChip) userChip.textContent = user;
        if (dirChip) dirChip.textContent = dir;
    },
    setPrompt: (text) => {
        // Legacy support or if we want to change the symbol
    },
    getHistory: () => state.history,
    setTheme: (themeName) => {
        document.body.className = `theme-${themeName}`;
        localStorage.setItem('minai_theme', themeName);
    }
};

export function scrollToBottom() {
    elements.output.scrollTop = elements.output.scrollHeight;
}

export function openSettings() {
    elements.apiKeyInput.value = state.apiKey;
    elements.baseUrlInput.value = state.baseUrl;

    const options = Array.from(elements.providerSelect.options).map(o => o.value);
    elements.providerSelect.value = options.includes(state.baseUrl) ? state.baseUrl : 'custom';

    elements.settingsModal.style.display = 'flex';
    elements.apiKeyInput.focus();
}

export function closeSettings() {
    elements.settingsModal.style.display = 'none';
    elements.input.focus();
}

export function saveSettings() {
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
