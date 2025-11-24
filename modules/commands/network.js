import { registry } from './registry.js';

export function registerNetworkCommands(fs, ui) {
    registry.register('ping', async (args) => {
        const host = args[0];
        if (!host) return 'Usage: ping [host]';

        let url = host;
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        ui.print(`PING ${host} (${url}): HTTP probe`, 'system');

        const times = [];
        let received = 0;

        for (let i = 0; i < 4; i++) {
            const start = performance.now();
            try {
                await fetch(url, { mode: 'no-cors', method: 'HEAD', cache: 'no-cache' });
                const end = performance.now();
                const time = end - start;
                times.push(time);
                received++;
                ui.print(`Connected to ${host}: seq=${i} time=${time.toFixed(1)} ms`, 'system');
            } catch (e) {
                ui.print(`Request timeout for icmp_seq ${i}`, 'error');
            }
            if (i < 3) await new Promise(r => setTimeout(r, 1000));
        }

        ui.print(`--- ${host} ping statistics ---`, 'system');
        // ... stats logic ...
        return '';
    }, 'Send ICMP ECHO_REQUEST', 'ping <host>', 'Network');

    registry.register('curl', async (args, flags) => {
        // ... curl implementation ...
        // Simplified for brevity, copying core logic
        if (args.length === 0) return 'curl: try \'curl --help\'';
        let url = args[0];
        if (!url.startsWith('http')) url = 'https://' + url;

        ui.print(`curl: try connecting to ${url}...`, 'system');
        try {
            const response = await fetch(url, { method: flags.I ? 'HEAD' : 'GET' });
            if (flags.I) return `HTTP/1.1 ${response.status} ${response.statusText}`;
            const text = await response.text();
            if (flags.o) {
                // Handle output to file
                // This requires parsing params differently or assuming -o is handled
                // For now, just return text
                return text;
            }
            return text;
        } catch (e) {
            return `curl: Failed to connect to ${url}`;
        }
    }, 'Transfer a URL', 'curl [options] <url>', 'Network');

    registry.register('download', (args) => {
        const content = fs.cat(args[0]);
        if (!content.startsWith('Error')) {
            ui.downloadFile(args[0], content);
            return `Downloading ${args[0]}...`;
        }
        return content;
    }, 'Download file', 'download <file>', 'Network');

    registry.register('upload', () => {
        ui.triggerUpload((filename, content) => {
            const safeFilename = filename.replace(/\s+/g, '_');
            const result = fs.write(safeFilename, content);
            if (result) {
                ui.print(`Error uploading ${safeFilename}: ${result}`, 'error');
            } else {
                ui.print(`Successfully uploaded ${safeFilename}`, 'system');
                if (content.startsWith('data:image/')) {
                    ui.print(`<img src="${content}" style="max-width: 300px; border: 1px solid #33ff00; margin-top: 10px;">`, 'system');
                }
            }
        });
    }, 'Upload file', 'upload', 'Network');
}
