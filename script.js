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
    waitingForConfirmation: null,
    confirmationResolver: null,
    dirHistory: JSON.parse(localStorage.getItem('minai_dir_history') || '{}'), // frecency tracking
    suggestions: [],
    suggestionIndex: 0
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
    // Calculate frecency score (frequency * recency multiplier)
    const now = Date.now();
    const scores = Object.entries(state.dirHistory).map(([path, data]) => {
        const ageHours = (now - data.lastVisit) / (1000 * 60 * 60);
        const recencyMultiplier = Math.max(0.25, 1 / (1 + ageHours / 24)); // Decay over days
        const frecency = data.count * recencyMultiplier;
        return { path, frecency };
    });

    // Filter and sort
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
        // Semi-transparent black to create trail effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#0F0'; // Green text
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

        // Stop on any key press
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
        this.canvas.style.opacity = '0.3'; // Return to subtle background
    }
}

const matrix = new MatrixEffect('matrixCanvas');
// Start subtle background effect immediately? No, user asked for command.
// But maybe a very slow one as background?
// For now, let's keep it as a command that goes full screen/active.
// Actually, the CSS sets opacity 0.3. Let's make the command boost it.
// Wait, if I want it as a background, I should run it always but slow?
// The user said "cmatrix command".
// Let's make the command trigger the "active" mode.
// But maybe we want a passive mode too?
// Let's just implement the command for now.

// Initialize FileSystem
const fs = new FileSystem();

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
    },
    toggleMatrix: () => {
        matrix.start();
    },
    setTheme: (themeName) => {
        document.body.className = `theme-${themeName}`;
        // Save to local storage
        localStorage.setItem('minai_theme', themeName);
    }
};

// AI Handler for CommandParser (returns string for redirection)
const aiHandler = async (prompt) => {
    if (!state.apiKey) {
        return 'Error: API Key missing. Type /config to set it.';
    }

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
        const messages = [systemPrompt, { role: 'user', content: prompt }];

        const baseUrl = state.baseUrl || 'https://aipipe.org/openrouter/v1/chat/completions';
        const client = new AIClient(state.apiKey, baseUrl);

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
    // Mode Switcher - setup after DOM is ready
    const modeBtns = document.querySelectorAll('.mode-btn');

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            state.currentMode = mode;

            // Update active state
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update prompt and placeholder
            if (mode === 'agent') {
                elements.prompt.textContent = 'AI Agent:';
                elements.input.placeholder = 'Ask me anything...';
                elements.input.style.color = '#8be9fd';
            } else {
                const displayPath = state.path.join('/') || '/';
                elements.prompt.textContent = `user@minai:${displayPath}$`;
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

    // Tab Autocomplete with smart suggestions
    if (e.key === 'Tab') {
        e.preventDefault();
        const input = elements.input.value;
        const args = input.split(/\s+/);
        const command = args[0];
        const lastArg = args[args.length - 1];

        // Smart cd suggestions (zoxide-like)
        if (command === 'cd' && args.length >= 2) {
            const suggestions = getDirectorySuggestions(lastArg);

            if (suggestions.length === 1) {
                // Auto-complete single match
                args[args.length - 1] = suggestions[0];
                elements.input.value = args.join(' ');
                state.suggestions = [];
            } else if (suggestions.length > 1) {
                // Cycle through suggestions
                if (state.suggestions.length === 0 || state.suggestions.join() !== suggestions.join()) {
                    // First Tab - show all and initialize
                    state.suggestions = suggestions;
                    state.suggestionIndex = 0;
                    uiHandler.print(`\nSuggestions (smart):`, 'system');
                    suggestions.forEach((s, i) => {
                        const visits = state.dirHistory[s]?.count || 0;
                        uiHandler.print(`  ${i + 1}. ${s} (${visits} visits)`, 'system');
                    });
                    uiHandler.print(`Press Tab to cycle, Enter to accept`, 'system');
                } else {
                    // Subsequent Tab - cycle through
                    state.suggestionIndex = (state.suggestionIndex + 1) % state.suggestions.length;
                }
                // Update input with current suggestion
                args[args.length - 1] = state.suggestions[state.suggestionIndex];
                elements.input.value = args.join(' ');
            }
            return;
        }

        // Regular file/directory autocomplete
        const files = fs.ls(null, {});
        if (typeof files === 'string') {
            const rawList = files.split('  ').map(s => s.replace('/', '').trim()).filter(s => s);
            const matches = rawList.filter(f => f.startsWith(lastArg));

            if (matches.length === 1) {
                args[args.length - 1] = matches[0];
                elements.input.value = args.join(' ');
                state.suggestions = [];
            } else if (matches.length > 1) {
                // Cycle through file matches
                if (state.suggestions.length === 0 || state.suggestions.join() !== matches.join()) {
                    // First Tab - show all and initialize
                    state.suggestions = matches;
                    state.suggestionIndex = 0;
                    uiHandler.print(`\nMatches: ${matches.join('  ')}`, 'system');
                    uiHandler.print(`Press Tab to cycle, Enter to accept`, 'system');
                } else {
                    // Subsequent Tab - cycle through
                    state.suggestionIndex = (state.suggestionIndex + 1) % state.suggestions.length;
                }
                // Update input with current match
                args[args.length - 1] = state.suggestions[state.suggestionIndex];
                elements.input.value = args.join(' ');
            }
        }
        return;
    }


    if (e.key === 'Enter') {
        console.log('Enter pressed, currentMode:', state.currentMode);
        e.preventDefault();
        const input = elements.input.value.trim();
        if (!input) return;

        // Check if we're waiting for confirmation
        if (state.waitingForConfirmation) {
            const confirmed = input.toLowerCase() === 'yes' || input.toLowerCase() === 'y';
            elements.input.value = '';

            const callback = state.waitingForConfirmation;
            const resolver = state.confirmationResolver;

            // Clear the state
            state.waitingForConfirmation = null;
            state.confirmationResolver = null;

            // Execute the callback
            await callback(confirmed);
            resolver();
            return;
        }

        // Add to history
        state.history.push(input);
        state.historyIndex = -1;
        state.suggestions = []; // Clear autocomplete suggestions


        // Handle based on mode
        if (state.currentMode === 'agent') {
            // Agent/AI mode
            console.log('Agent mode - handling:', input);

            // Check for exit command to switch back to shell mode
            if (input.toLowerCase() === 'exit') {
                state.currentMode = 'sh';
                document.querySelectorAll('.mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === 'sh');
                });
                elements.prompt.textContent = `user@minai:${fs.pwd().replace('/home', '~')}$`;
                elements.input.placeholder = "Type a command... (try 'help')";
                elements.input.style.color = '#ffffff';
                uiHandler.print('Switched to shell mode', 'system');
                elements.input.value = '';
                return;
            }

            // Check if input is a direct command (starts with a known command)
            const validCommands = [
                'ls', 'cd', 'pwd', 'mkdir', 'rmdir', 'touch', 'rm', 'cp', 'mv', 'tree',
                'cat', 'echo', 'head', 'tail', 'wc', 'grep', 'edit', 'vim', 'nano',
                'date', 'whoami', 'uname', 'clear', 'download', 'history',
                'ping', 'curl', 'calc', 'theme', 'bgset', 'neofetch', 'cmatrix',
                'help', 'man', 'whatis', 'which', 'alias', 'set'
            ];

            const firstWord = input.trim().split(/\s+/)[0];
            if (validCommands.includes(firstWord)) {
                // Execute as direct command
                uiHandler.print(`$ ${input}`, 'user');
                elements.input.value = '';
                const result = await parser.parse(input);
                if (result) uiHandler.print(result);
                updatePrompt();
                return;
            }

            // Otherwise, use AI agent for natural language
            uiHandler.print(`You: ${input}`, 'user');
            elements.input.value = '';
            await handleAgentRequest(input);
        } else {
            // Shell mode
            console.log('Shell mode - handling:', input);
            uiHandler.print(`${elements.prompt.textContent} ${input}`, 'user');
            elements.input.value = '';

            // Parse and execute
            const result = await parser.parse(input);
            if (result) uiHandler.print(result);

            // Track directory if cd was used
            if (input.trim().startsWith('cd ')) {
                trackDirectory(fs.pwd());
            }

            // Update prompt after command execution
            updatePrompt();
        }

        return;
    }
}



// Autonomous Agent Handler
async function handleAgentRequest(userRequest) {
    const apiKey = localStorage.getItem('openai_api_key');
    const baseUrl = localStorage.getItem('openai_base_url') || 'https://api.openai.com/v1';

    if (!apiKey) {
        uiHandler.print('⚠️  No API key configured. Click the settings icon to add your OpenAI API key.', 'error');
        return;
    }

    try {
        uiHandler.print('🤖 Agent thinking...', 'system');

        // Get current directory context
        const currentPath = fs.pwd();
        const filesInDir = fs.ls(null, {});

        // AI prompt for autonomous agent
        const systemPrompt = `You are an autonomous terminal agent for MinAI Terminal - a browser-based terminal emulator. You understand user requests in natural language and execute them using terminal commands.

═══════════════════════════════════════
CURRENT CONTEXT
═══════════════════════════════════════
• Current directory: ${currentPath}
• Files/folders here: ${filesInDir}
• Shell: minai-sh (browser-based)
• OS: MinAI OS v3.0 (simulated)

═══════════════════════════════════════
AVAILABLE COMMANDS (organized by category)
═══════════════════════════════════════

FILE SYSTEM:
• ls [-l] [-a] [path] - list directory contents
• cd [dir] - change directory (/, /home, /command, /configuration)
• pwd - print working directory
• mkdir <dir> - create directory
• rmdir <dir> - remove empty directory
• touch <file> - create empty file
• rm [-r] <file|dir> - remove files/directories
• cp [-r] <src> <dst> - copy files/directories
• mv <src> <dst> - move/rename files
• tree [dir] - show directory tree

CONTENT:
• cat <file> - display file contents
• echo <text> - print text (supports > and >> redirection)
  NOTE: For multi-line text, use separate echo commands:
    echo 'Line 1' > file.txt
    echo 'Line 2' >> file.txt
  OR use the edit command for complex content
• head <file> - show first 10 lines
• tail <file> - show last 10 lines
• wc [-l] [-w] [-c] <file> - count lines/words/bytes
• grep [-i] <pattern> <file> - search text in files
• edit/vim <file> - open file in editor (preferred for multi-line content)

SYSTEM & INFO:
• date - show current date/time
• whoami - show username (always 'user')
• uname [-a] - show system info
• clear - clear screen
• history - show command history
• download <file> - download file to local machine
• neofetch - display system info with ASCII art

NETWORK (browser-limited, CORS applies):
• ping <host> - HTTP connectivity check (not real ICMP)
• curl [-I] [-o file] <url> - fetch URLs (subject to CORS)

UTILITIES:
• calc <expression> - evaluate math (supports basic math and Math.* functions)
• theme [list|set <name>] - change terminal theme
• bgset [list|<preset>|<url>|none] - set background image
• cmatrix - Matrix digital rain effect
• neofetch - system information display
• json <file> - format and display JSON files with syntax highlighting

IMPORTANT AGENT CAPABILITIES:
• You CAN work with JSON files using the 'json' command to view formatted content
• You CAN create formatted output by using multiple echo commands
• You CAN read file content with 'cat', then create formatted versions
• For complex formatting tasks:
  1. Use 'cat' to read the source file
  2. Generate multiple 'echo' commands to write formatted output
  3. Each line of formatted output should be a separate echo command
• Example: To format data, use: echo 'Line 1' > file.txt; echo 'Line 2' >> file.txt

FILE TYPE HANDLING - CRITICAL:
You MUST be aware of file extensions and handle them appropriately:
• .json files → Use 'json <file>' to display formatted JSON with colors
• .txt, .md, .log files → Use 'cat <file>' to display plain text
• .js, .py, .css, .html files → Use 'cat <file>' for source code
• When reading files, ALWAYS check the extension first
• Example: For "show me recipes.md", if it contains JSON, use: json recipes.md
• For "read hello.txt", use: cat hello.txt

When asked to format/display/read a file:
1. Identify the file extension (.json, .txt, .md, etc.)
2. Choose the appropriate command:
   - .json → json command
   - .txt/.md/.log → cat command
3. State in your plan which command you're using and why


CONFIG & HELP:
• help - show all commands
• man <command> - show command manual
• whatis <command> - brief description
• which <command> - locate command
• alias <name>=<cmd> - create alias
• set mode [strict|helpful|smart] - set parser mode
• /config - open settings modal

═══════════════════════════════════════
IMPORTANT LIMITATIONS
═══════════════════════════════════════
⚠️  Browser-based terminal - NOT a real Unix system
⚠️  No sudo, apt, npm, or system package managers
⚠️  Network commands affected by CORS policies
⚠️  File system is virtual (in-memory, resets on reload)
⚠️  Cannot execute arbitrary binaries or scripts
⚠️  ping uses HTTP, not real ICMP packets

═══════════════════════════════════════
FILE SYSTEM STRUCTURE
═══════════════════════════════════════
/
├── README (read-only system file)
├── home/
│   └── welcome.txt (startup message)
├── command/ (read-only command docs)
│   ├── ls, cd, pwd, mkdir, etc.
└── configuration/
    ├── system-prompt.txt (AI config)
    └── aliases.txt (user aliases)

═══════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════
ALWAYS respond with valid JSON only:
{
  "plan": "Brief 1-line explanation of what you'll do",
  "commands": ["command1", "command2", ...],
  "needsPermission": true/false
}

needsPermission = true for: mkdir, rmdir, touch, rm, cp, mv, edit, download, theme, bgset
needsPermission = false for: ls, cat, pwd, cd, grep, wc, head, tail, date, whoami, ping, curl -I, calc, tree, history, help, man

═══════════════════════════════════════
EXAMPLES
═══════════════════════════════════════

User: "show me what's in this folder"
{
  "plan": "List directory contents",
  "commands": ["ls -l"],
  "needsPermission": false
}

User: "create a projects folder and cd into it"
{
  "plan": "Create 'projects' directory and navigate into it",
  "commands": ["mkdir projects", "cd projects"],
  "needsPermission": true
}

User: "write a poem to hello.txt"
{
  "plan": "Create hello.txt with a multi-line poem",
  "commands": ["touch hello.txt", "echo 'Roses are red,' > hello.txt", "echo 'Violets are blue,' >> hello.txt", "echo 'This terminal is great,' >> hello.txt", "echo 'And so are you!' >> hello.txt"],
  "needsPermission": true
}

User: "show me the JSON in recipes.md in a nice format"
{
  "plan": "Use the json command to display formatted JSON (recipes.md contains JSON data)",
  "commands": ["json recipes.md"],
  "needsPermission": false
}

User: "read the readme.txt file"
{
  "plan": "Display contents of readme.txt using cat",
  "commands": ["cat readme.txt"],
  "needsPermission": false
}

User: "show me what's in data.json"
{
  "plan": "Display formatted JSON from data.json file",
  "commands": ["json data.json"],
  "needsPermission": false
}

User: "check if google is online"
{
  "plan": "Ping google.com to check connectivity",
  "commands": ["ping google.com"],
  "needsPermission": false
}

User: "change theme to tokyo-night and set a space background"
{
  "plan": "Switch to tokyo-night theme and apply space background",
  "commands": ["theme set tokyo-night", "bgset space"],
  "needsPermission": true
}

User: "find all txt files and count lines in each"
{
  "plan": "List .txt files, then count lines in README and welcome.txt",
  "commands": ["ls *.txt", "wc -l /README", "wc -l /home/welcome.txt"],
  "needsPermission": false
}

═══════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════
1. ONLY use commands from the available list above
2. CRITICAL RULES:
1. If user is asking you to DO something (create, delete, show, find, etc.) → Generate JSON with commands
2. If user is just CHATTING (hi, hello, how are you, thanks, etc.) → Respond with JSON but use "echo" to reply
3. ALWAYS respond with valid JSON in this format:

For ACTIONS (file operations, showing data, etc.):
{
  "plan": "what you will do",
  "commands": ["cmd1", "cmd2"],
  "needsPermission": true/false
}

For CONVERSATION (greetings, questions about you, thanks, etc.):
{
  "plan": "Respond to user's message",
  "commands": ["echo 'Your friendly response here'"],
  "needsPermission": false
}

EXAMPLES OF CONVERSATION:
User: "hi" or "hello" or "hey"
{"plan": "Greet the user", "commands": ["echo 'Hello! I'm your AI terminal assistant. I can help you with file operations, system commands, or just chat. What would you like to do?'"], "needsPermission": false}

User: "thanks" or "thank you"
{"plan": "Acknowledge thanks", "commands": ["echo 'You're welcome! Happy to help!'"], "needsPermission": false}

User: "how are you"
{"plan": "Respond to greeting", "commands": ["echo 'I'm doing great! Ready to help you with terminal commands or answer questions. What can I do for you?'"], "needsPermission": false}

3. If user asks for something impossible, explain in "plan" and set commands to ["echo 'Not supported in MinAI Terminal'"]

4. Use appropriate flags (e.g., ls -la for detailed listing)
5. Consider context (current directory, existing files)
6. Chain commands logically (mkdir before cd, etc.)
7. Be concise but accurate in your plan

Now respond to the user's request with JSON only.`;

        // Get the base URL - it already includes the full endpoint
        let apiUrl = baseUrl;

        // If baseUrl doesn't end with /chat/completions, add it
        if (!apiUrl.includes('/chat/completions')) {
            apiUrl = apiUrl.replace(/\/$/, '') + '/chat/completions';
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
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

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        const agentResponse = data.choices[0].message.content.trim();

        // Parse JSON response
        let plan;
        try {
            // Extract JSON - try direct parse first
            try {
                plan = JSON.parse(agentResponse);
            } catch (e) {
                // If direct parse fails, try extracting from markdown code blocks
                const jsonMatch = agentResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || agentResponse.match(/(\{[\s\S]*\})/);
                if (jsonMatch) {
                    const jsonStr = jsonMatch[1] || jsonMatch[0];
                    plan = JSON.parse(jsonStr);
                } else {
                    throw new Error('No valid JSON found in response');
                }
            }
        } catch (e) {
            uiHandler.print(`❌ Agent error: Could not parse response`, 'error');
            uiHandler.print(`Response was: ${agentResponse}`, 'system');
            console.error('Parse error:', e);
            return;
        }


        // Display plan
        uiHandler.print(`\n📋 Plan: ${plan.plan}`, 'system');
        uiHandler.print(`\n📝 Commands to execute:`, 'system');
        plan.commands.forEach((cmd, i) => {
            uiHandler.print(`  ${i + 1}. ${cmd}`, 'system');
        });

        // Ask for permission if needed
        if (plan.needsPermission) {
            uiHandler.print(`\n⚠️  Type 'yes' to execute, or 'no' to cancel:`, 'system');

            // Wait for user confirmation
            await waitForConfirmation(async (confirmed) => {
                if (confirmed) {
                    await executeCommands(plan.commands);
                } else {
                    uiHandler.print('❌ Cancelled by user', 'system');
                }
            });
        } else {
            // Execute without permission for safe commands
            await executeCommands(plan.commands);
        }

    } catch (error) {
        uiHandler.print(`❌ Agent error: ${error.message}`, 'error');
    }
}

// Execute commands sequentially
async function executeCommands(commands) {
    uiHandler.print(`\n🚀 Executing commands...\n`, 'system');

    for (const cmd of commands) {
        uiHandler.print(`$ ${cmd}`, 'user');

        try {
            const result = await parser.parse(cmd);
            if (result) uiHandler.print(result, 'system');

            // Update prompt after command
            updatePrompt();

            // Small delay between commands
            await new Promise(r => setTimeout(r, 200));
        } catch (err) {
            uiHandler.print(`Error: ${err.message}`, 'error');
            break; // Stop on first error
        }
    }

    uiHandler.print(`\n✅ Done!\n`, 'system');
}

// Wait for user confirmation
function waitForConfirmation(callback) {
    return new Promise((resolve) => {
        // Set a flag that we're waiting for confirmation
        state.waitingForConfirmation = callback;
        state.confirmationResolver = resolve;
    });
}


async function handleChat(message) {
    state.isLoading = true;
    const response = await aiHandler(message);
    state.isLoading = false;

    if (response.startsWith('Error:')) {
        uiHandler.print(response, 'error');
    } else {
        uiHandler.print(response, 'ai');
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

// Initial Focus & Prompt
elements.input.focus();
document.addEventListener('click', (e) => {
    // Don't steal focus if clicking inside an input, textarea, select, or modal
    if (e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.closest('.modal')) {
        return;
    }
    // Also don't steal if text is being selected
    if (window.getSelection().toString().length > 0) {
        return;
    }
    elements.input.focus();
});
updatePrompt();

// Initialize mode switcher buttons
initializeModeSwitcher();

// Welcome Message
const welcome = `Hi, I'm Ritu Raj.

Type 'help' for commands, or click 'Agent' (✨) for AI assistance.`;
uiHandler.print(welcome, 'system');


// Load Theme
const savedTheme = localStorage.getItem('minai_theme');
if (savedTheme) {
    uiHandler.setTheme(savedTheme);
}

// Load Background
const savedBg = localStorage.getItem('minai_bg');
if (savedBg) {
    if (savedBg === 'none') {
        document.documentElement.style.setProperty('--bg-image', 'none');
    } else {
        document.documentElement.style.setProperty('--bg-image', `url('${savedBg}')`);
    }
}
