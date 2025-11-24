import { registry } from './registry.js';

export function registerUtilsCommands(fs, ui) {
    registry.register('calc', (args) => {
        if (args.length === 0) return 'Usage: calc [expression]';
        try {
            return new Function('return ' + args.join(' '))().toString();
        } catch (e) {
            return 'Error: Invalid expression';
        }
    }, 'Simple calculator', 'calc <expression>', 'Tools');

    registry.register('json', (args) => {
        if (args.length === 0) return 'Usage: json <file>';
        const content = fs.cat(args[0]);
        if (content.startsWith('Error')) return content;
        try {
            const parsed = JSON.parse(content);
            const formatted = JSON.stringify(parsed, null, 2);
            // Add syntax highlighting (simplified)
            return formatted;
        } catch (e) {
            return 'Error: Invalid JSON';
        }
    }, 'Format JSON file', 'json <file>', 'Tools');

    registry.register('theme', (args) => {
        const themes = ['cyberpunk', 'ubuntu', 'hacker', 'retro', 'dracula', 'monokai', 'nord', 'solarized-dark', 'solarized-light'];
        if (args.length === 0 || args[0] === 'list') return `Available themes:\n${themes.join('\n')}`;
        if (args[0] === 'set' && themes.includes(args[1])) {
            ui.setTheme(args[1]);
            return `Theme set to ${args[1]}`;
        }
        return 'Usage: theme [list | set <name>]';
    }, 'Change theme', 'theme [list | set <name>]', 'System');

    registry.register('bgset', (args) => {
        if (args.length === 0) return 'Usage: bgset [preset|url|none|list]';
        const arg = args[0];
        if (arg === 'none') {
            document.body.style.backgroundImage = 'none';
            localStorage.setItem('minai_bg', 'none');
            return 'Background removed.';
        }
        if (arg === 'list') return 'Presets: cyberpunk, matrix, space, retro, nature';

        const presets = {
            'cyberpunk': 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=1920&q=80',
            'matrix': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&q=80',
            'space': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80',
            'retro': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80',
            'nature': 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80'
        };
        const url = presets[arg] || arg;
        document.body.style.backgroundImage = `url('${url}')`;
        localStorage.setItem('minai_bg', url);
        return `Background set to ${arg}`;
    }, 'Set background', 'bgset [preset|url]', 'System');

    registry.register('neofetch', () => {
        return `
    <span style="color: #00d4ff;">       _,met$$$$$gg.</span>          <span style="color: #fff;">user</span>@<span style="color: #fff;">minai</span>
    <span style="color: #00d4ff;">    ,g$$$$$$$$$$$$$$$P.</span>       ────────────────
    <span style="color: #00d4ff;">  ,g$$P"     """Y$$.".  </span>      <span style="color: #ff6b9d;">OS:</span> MinAI OS v3.0  
    <span style="color: #00d4ff;"> ,$$P'              \`$$$.</span>     <span style="color: #ff6b9d;">Shell:</span> minai-sh
    <span style="color: #00d4ff;">',$$P       ,ggs.     \`$$b:</span>   <span style="color: #ff6b9d;">Terminal:</span> MinAI Terminal
    <span style="color: #00d4ff;">\`d$$'     ,$P"'   .    $$$</span>   <span style="color: #ff6b9d;">Theme:</span> ${document.body.className.replace('theme-', '') || 'default'}
    <span style="color: #00d4ff;"> $$P      d$'     ,    $$P</span>    <span style="color: #ff6b9d;">Uptime:</span> ${Math.floor(performance.now() / 1000 / 60)} minutes
    <span style="color: #00d4ff;"> $$:      $$.   -    ,d$$'</span>    <span style="color: #ff6b9d;">Memory:</span> Virtual FS
    <span style="color: #00d4ff;"> $$;      Y$b._   _,d$P'</span>      <span style="color: #ff6b9d;">Browser:</span> ${navigator.userAgent.split(' ').slice(-2).join(' ')}
    <span style="color: #00d4ff;"> Y$$.    \`.\`"Y$$$P"'</span>         <span style="color: #ff6b9d;">Commands:</span> ${registry.getAll().length}
    <span style="color: #00d4ff;"> \`$$b      "-.__  </span>            
    <span style="color: #00d4ff;">  \`Y$$</span>                        ████████████████
    <span style="color: #00d4ff;">   \`Y$$.</span>                     
    <span style="color: #00d4ff;">     \`$$b.</span>                   Type <span style="color: #8be9fd;">help</span> for commands
    <span style="color: #00d4ff;">       \`Y$$b.</span>
    <span style="color: #00d4ff;">          \`"Y$b._</span>
    <span style="color: #00d4ff;">              \`"""</span>
        `;
    }, 'System info', 'neofetch', 'System');
}
