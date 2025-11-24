/**
 * Vim-like Modal Editor for MinAI Terminal
 * Supports Normal, Insert, and Command modes with keyboard navigation
 */

export class VimEditor {
    constructor(container, onSave, onClose) {
        this.container = container;
        this.onSave = onSave;
        this.onClose = onClose;

        // Editor state
        this.mode = 'NORMAL'; // 'NORMAL', 'INSERT', 'COMMAND'
        this.lines = [''];
        this.cursor = { line: 0, col: 0 };
        this.filename = '';
        this.dirty = false;
        this.commandBuffer = '';
        this.yankBuffer = '';
        this.currentMessage = ''; // For displaying messages

        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;

        // UI elements
        this.textArea = null;
        this.statusLine = null;
        this.commandLine = null;
        this.lineNumbers = null;

        this.setupUI();
        this.attachEventListeners();
    }

    setupUI() {
        // Clear container and create wrapper
        this.container.innerHTML = '';

        // Create main wrapper for the editor
        const wrapper = document.createElement('div');
        wrapper.className = 'vim-wrapper';
        wrapper.style.cssText = 'background: #000; border: 2px solid #33ff00; box-shadow: 0 0 5px rgba(51, 255, 0, 0.5); display: flex; flex-direction: column; height: 100%; width: 100%; overflow: hidden;';
        wrapper.tabIndex = -1; // Make focusable

        // Header with filename
        const header = document.createElement('div');
        header.className = 'vim-header';
        header.style.cssText = 'padding: 10px; background: #33ff00; color: #000; border-bottom: 1px solid #333; font-weight: bold;';
        this.filenameDisplay = document.createElement('span');
        header.appendChild(this.filenameDisplay);
        wrapper.appendChild(header);

        // Editor area with line numbers
        const editorArea = document.createElement('div');
        editorArea.style.cssText = 'display: flex; flex: 1; overflow: hidden; background: #0a0a0a;';

        // Line numbers
        this.lineNumbers = document.createElement('div');
        this.lineNumbers.className = 'vim-line-numbers';
        this.lineNumbers.style.cssText = 'padding: 10px 5px; background: #111; color: #555; text-align: right; user-select: none; font-family: monospace; font-size: 14px; min-width: 50px; border-right: 1px solid #333;';
        editorArea.appendChild(this.lineNumbers);

        // Text content area
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = 'flex: 1; position: relative; overflow: auto;';

        this.textArea = document.createElement('pre');
        this.textArea.className = 'vim-content';
        this.textArea.style.cssText = 'margin: 0; padding: 10px; font-family: monospace; font-size: 14px; color: #e0e0e0; background: transparent; outline: none; white-space: pre-wrap; tab-size: 4; min-height: 100%;';
        this.textArea.spellcheck = false;
        this.textArea.tabIndex = 0; // Make focusable
        contentWrapper.appendChild(this.textArea);

        editorArea.appendChild(contentWrapper);
        wrapper.appendChild(editorArea);

        // Status line
        this.statusLine = document.createElement('div');
        this.statusLine.className = 'vim-status';
        this.statusLine.style.cssText = 'padding: 8px 10px; background: #1a1a1a; border-top: 1px solid #333; font-family: monospace; font-size: 13px; display: flex; justify-content: space-between;';
        wrapper.appendChild(this.statusLine);

        // Command line
        this.commandLine = document.createElement('div');
        this.commandLine.className = 'vim-command';
        this.commandLine.style.cssText = 'padding: 5px 10px; background: #0a0a0a; border-top: 1px solid #333; font-family: monospace; font-size: 13px; color: #fff; min-height: 25px;';
        wrapper.appendChild(this.commandLine);

        // Add wrapper to container
        this.container.appendChild(wrapper);
        this.wrapper = wrapper;
    }

    attachEventListeners() {
        this.textArea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
            }
            this.handleKeyDown(e);
        });
    }

    handleKeyDown(e) {
        // Global shortcuts
        if (e.key === 'Escape') {
            e.preventDefault();
            if (this.mode === 'COMMAND') {
                this.commandBuffer = '';
                this.setMode('NORMAL');
            } else if (this.mode === 'INSERT') {
                this.setMode('NORMAL');
            }
            return;
        }

        if (this.mode === 'NORMAL') {
            this.handleNormalMode(e);
        } else if (this.mode === 'INSERT') {
            this.handleInsertMode(e);
        } else if (this.mode === 'COMMAND') {
            this.handleCommandMode(e);
        }
    }

    handleNormalMode(e) {
        e.preventDefault();

        const key = e.key;

        // Movement keys
        if (key === 'h') this.moveCursor(-1, 0);
        else if (key === 'j') this.moveCursor(0, 1);
        else if (key === 'k') this.moveCursor(0, -1);
        else if (key === 'l') this.moveCursor(1, 0);
        else if (key === '0') this.cursor.col = 0;
        else if (key === '$') this.cursor.col = this.lines[this.cursor.line].length;
        else if (key === 'w') this.moveWord(1);
        else if (key === 'b') this.moveWord(-1);
        else if (key === 'G' && e.shiftKey) this.cursor.line = this.lines.length - 1;
        else if (key === 'g') {
            setTimeout(() => {
                const nextKey = this.nextKey;
                if (nextKey === 'g') {
                    this.cursor.line = 0;
                    this.cursor.col = 0;
                    this.render();
                }
                this.nextKey = null;
            }, 500);
            this.nextKey = 'g';
            return;
        }

        // Mode changes
        else if (key === 'i') this.setMode('INSERT');
        else if (key === 'I') {
            this.cursor.col = 0;
            this.setMode('INSERT');
        }
        else if (key === 'a') {
            this.moveCursor(1, 0);
            this.setMode('INSERT');
        }
        else if (key === 'A') {
            this.cursor.col = this.lines[this.cursor.line].length;
            this.setMode('INSERT');
        }
        else if (key === 'o') {
            this.insertLine(this.cursor.line + 1);
            this.cursor.line++;
            this.cursor.col = 0;
            this.setMode('INSERT');
        }
        else if (key === 'O') {
            this.insertLine(this.cursor.line);
            this.cursor.col = 0;
            this.setMode('INSERT');
        }

        // Editing
        else if (key === 'x') this.deleteChar();
        else if (key === 'd') {
            this.nextKey = 'd';
            setTimeout(() => {
                if (this.nextKey === 'd') {
                    this.deleteLine();
                }
                this.nextKey = null;
            }, 500);
            return;
        }
        else if (key === 'y') {
            this.nextKey = 'y';
            setTimeout(() => {
                if (this.nextKey === 'y') {
                    this.yankLine();
                }
                this.nextKey = null;
            }, 500);
            return;
        }
        else if (key === 'p') this.paste();
        else if (key === 'u') this.undo();
        else if (key === 'r' && e.ctrlKey) {
            e.preventDefault();
            this.redo();
        }

        // Command mode
        else if (key === ':') this.setMode('COMMAND');

        this.render();
    }

    handleInsertMode(e) {
        e.preventDefault();

        const line = this.lines[this.cursor.line];

        if (e.key === 'Enter') {
            const before = line.slice(0, this.cursor.col);
            const after = line.slice(this.cursor.col);
            this.lines[this.cursor.line] = before;
            this.lines.splice(this.cursor.line + 1, 0, after);
            this.cursor.line++;
            this.cursor.col = 0;
            this.dirty = true;
        } else if (e.key === 'Backspace') {
            if (this.cursor.col > 0) {
                this.lines[this.cursor.line] = line.slice(0, this.cursor.col - 1) + line.slice(this.cursor.col);
                this.cursor.col--;
                this.dirty = true;
            } else if (this.cursor.line > 0) {
                const prevLine = this.lines[this.cursor.line - 1];
                this.cursor.col = prevLine.length;
                this.lines[this.cursor.line - 1] = prevLine + line;
                this.lines.splice(this.cursor.line, 1);
                this.cursor.line--;
                this.dirty = true;
            }
        } else if (e.key === 'Tab') {
            this.lines[this.cursor.line] = line.slice(0, this.cursor.col) + '    ' + line.slice(this.cursor.col);
            this.cursor.col += 4;
            this.dirty = true;
        } else if (e.key === 'ArrowLeft') {
            if (this.cursor.col > 0) this.cursor.col--;
        } else if (e.key === 'ArrowRight') {
            if (this.cursor.col < line.length) this.cursor.col++;
        } else if (e.key === 'ArrowUp') {
            if (this.cursor.line > 0) {
                this.cursor.line--;
                this.cursor.col = Math.min(this.cursor.col, this.lines[this.cursor.line].length);
            }
        } else if (e.key === 'ArrowDown') {
            if (this.cursor.line < this.lines.length - 1) {
                this.cursor.line++;
                this.cursor.col = Math.min(this.cursor.col, this.lines[this.cursor.line].length);
            }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            this.lines[this.cursor.line] = line.slice(0, this.cursor.col) + e.key + line.slice(this.cursor.col);
            this.cursor.col++;
            this.dirty = true;
        }

        this.render();
    }

    handleCommandMode(e) {
        e.preventDefault();

        if (e.key === 'Enter') {
            this.executeCommand(this.commandBuffer);
            this.commandBuffer = '';
            this.setMode('NORMAL');
        } else if (e.key === 'Backspace') {
            this.commandBuffer = this.commandBuffer.slice(0, -1);
        } else if (e.key.length === 1) {
            this.commandBuffer += e.key;
        }

        this.updateCommandLine();
    }

    setMode(mode) {
        this.mode = mode;

        if (mode === 'COMMAND') {
            this.commandBuffer = '';
        }

        this.render();

        setTimeout(() => this.textArea.focus(), 0);
    }

    moveCursor(deltaCol, deltaLine) {
        this.cursor.line = Math.max(0, Math.min(this.lines.length - 1, this.cursor.line + deltaLine));
        this.cursor.col = Math.max(0, Math.min(this.lines[this.cursor.line].length, this.cursor.col + deltaCol));
    }

    moveWord(direction) {
        const line = this.lines[this.cursor.line];
        let col = this.cursor.col;

        if (direction > 0) {
            while (col < line.length && /\s/.test(line[col])) col++;
            while (col < line.length && !/\s/.test(line[col])) col++;
        } else {
            if (col > 0) col--;
            while (col > 0 && /\s/.test(line[col])) col--;
            while (col > 0 && !/\s/.test(line[col - 1])) col--;
        }

        this.cursor.col = col;
    }

    insertLine(index) {
        this.saveState();
        this.lines.splice(index, 0, '');
        this.dirty = true;
    }

    deleteLine() {
        this.saveState();
        if (this.lines.length > 1) {
            this.yankBuffer = this.lines[this.cursor.line];
            this.lines.splice(this.cursor.line, 1);
            if (this.cursor.line >= this.lines.length) {
                this.cursor.line = this.lines.length - 1;
            }
        } else {
            this.yankBuffer = this.lines[0];
            this.lines[0] = '';
        }
        this.cursor.col = 0;
        this.dirty = true;
        this.render();
    }

    deleteChar() {
        this.saveState();
        const line = this.lines[this.cursor.line];
        if (this.cursor.col < line.length) {
            this.lines[this.cursor.line] = line.slice(0, this.cursor.col) + line.slice(this.cursor.col + 1);
            this.dirty = true;
        }
    }

    yankLine() {
        this.yankBuffer = this.lines[this.cursor.line];
        this.showMessage('1 line yanked');
        this.render();
    }

    paste() {
        this.saveState();
        if (this.yankBuffer) {
            this.lines.splice(this.cursor.line + 1, 0, this.yankBuffer);
            this.cursor.line++;
            this.cursor.col = 0;
            this.dirty = true;
        }
    }

    saveState() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push({
            lines: JSON.parse(JSON.stringify(this.lines)),
            cursor: { ...this.cursor }
        });
        this.historyIndex++;

        if (this.history.length > 100) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            this.lines = JSON.parse(JSON.stringify(state.lines));
            this.cursor = { ...state.cursor };
            this.dirty = true;
            this.showMessage('1 change; before #' + (this.historyIndex + 2));
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            this.lines = JSON.parse(JSON.stringify(state.lines));
            this.cursor = { ...state.cursor };
            this.dirty = true;
            this.showMessage('1 change; after #' + (this.historyIndex + 1));
        }
    }

    executeCommand(cmd) {
        cmd = cmd.trim();

        if (cmd === 'w' || cmd === 'write') {
            this.save();
        } else if (cmd === 'q' || cmd === 'quit') {
            this.quit();
            return;
        } else if (cmd === 'wq' || cmd === 'x') {
            this.save();
            this.quit();
            return;
        } else if (cmd === 'q!') {
            this.dirty = false;
            this.quit();
            return;
        } else if (cmd.match(/^\d+$/)) {
            const lineNum = parseInt(cmd) - 1;
            this.cursor.line = Math.max(0, Math.min(this.lines.length - 1, lineNum));
            this.cursor.col = 0;
        } else if (cmd) {
            this.showMessage(`E492: Not an editor command: ${cmd}`);
        }

        this.render();
    }

    save() {
        const content = this.lines.join('\n');
        this.onSave(this.filename, content);
        this.dirty = false;
        this.showMessage(`"${this.filename}" ${this.lines.length}L written`);
    }

    quit() {
        if (this.dirty) {
            this.showMessage('No write since last change (add ! to override)');
            this.render();
            return;
        }
        if (this.onClose) {
            this.onClose();
        }
    }

    showMessage(msg) {
        this.currentMessage = msg;
        this.render();
        setTimeout(() => {
            this.currentMessage = '';
            this.render();
        }, 3000);
    }

    updateCommandLine() {
        if (this.mode === 'COMMAND') {
            this.commandLine.textContent = ':' + this.commandBuffer;
        }
    }

    render() {
        // Update line numbers
        this.lineNumbers.innerHTML = this.lines.map((_, i) =>
            `<div style="line-height: 1.5;">${i + 1}</div>`
        ).join('');

        // Update content - always render with cursor
        const rendered = this.lines.map((line, i) => {
            if (i === this.cursor.line) {
                const before = line.substring(0, this.cursor.col);
                const char = line[this.cursor.col] || ' ';
                const after = line.substring(this.cursor.col + 1);
                const cursorStyle = this.mode === 'INSERT'
                    ? 'background: #4CAF50; color: #000; border-left: 2px solid #4CAF50;'
                    : 'background: #fff; color: #000;';
                return before + `<span style="${cursorStyle}">${char}</span>` + after;
            }
            return line || ' ';
        }).join('\n');

        this.textArea.innerHTML = rendered;

        // Update status line
        const modeText = this.mode === 'NORMAL' ? '' : this.mode === 'INSERT' ? '-- INSERT --' : '-- COMMAND --';
        const position = `${this.cursor.line + 1},${this.cursor.col + 1}`;
        const modified = this.dirty ? '[+]' : '';

        this.statusLine.innerHTML = `
            <span style="color: ${this.mode === 'INSERT' ? '#4CAF50' : this.mode === 'COMMAND' ? '#2196F3' : '#888'};">${modeText}</span>
            <span>${modified} ${position} ${Math.floor((this.cursor.line + 1) / this.lines.length * 100)}%</span>
        `;

        // Update filename
        this.filenameDisplay.textContent = this.filename + (this.dirty ? ' [+]' : '');

        // Update command line
        if (this.mode === 'COMMAND') {
            this.updateCommandLine();
        } else if (this.currentMessage) {
            this.commandLine.textContent = this.currentMessage;
        } else {
            this.commandLine.textContent = '';
        }
    }

    open(filename, content) {
        this.filename = filename;
        this.lines = content ? content.split('\n') : [''];
        if (this.lines.length === 0) this.lines = [''];
        this.cursor = { line: 0, col: 0 };
        this.dirty = false;
        this.history = [{
            lines: JSON.parse(JSON.stringify(this.lines)),
            cursor: { ...this.cursor }
        }];
        this.historyIndex = 0;
        this.setMode('NORMAL');
        this.render();

        setTimeout(() => {
            this.wrapper.focus();
            this.textArea.focus();
        }, 100);
    }
}
