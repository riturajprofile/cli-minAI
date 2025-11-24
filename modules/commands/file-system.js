import { registry } from './registry.js';

export function registerFileSystemCommands(fs, ui) {
    registry.register('ls', (args, flags) => {
        return fs.ls(args[0], flags);
    }, 'List directory contents', 'ls [options] [path]', 'File System');

    registry.register('cd', (args) => {
        return fs.cd(args[0]);
    }, 'Change directory', 'cd [path]', 'File System');

    registry.register('pwd', () => {
        return fs.pwd();
    }, 'Print working directory', 'pwd', 'File System');

    registry.register('mkdir', (args) => {
        return fs.mkdir(args[0]);
    }, 'Create directory', 'mkdir <path>', 'File System');

    registry.register('rmdir', (args) => {
        return fs.rmdir(args[0]);
    }, 'Remove directory', 'rmdir <path>', 'File System');

    registry.register('touch', (args) => {
        return args.map(p => fs.touch(p)).filter(r => r).join('\n');
    }, 'Create file or update timestamp', 'touch <file>...', 'File System');

    registry.register('rm', (args, flags) => {
        return args.map(p => fs.rm(p, flags)).filter(r => r).join('\n');
    }, 'Remove files', 'rm [options] <file>...', 'File System');

    registry.register('cp', (args, flags) => {
        return fs.cp(args[0], args[1], flags);
    }, 'Copy file', 'cp <src> <dest>', 'File System');

    registry.register('mv', (args) => {
        return fs.mv(args[0], args[1]);
    }, 'Move/Rename file', 'mv <src> <dest>', 'File System');

    registry.register('tree', () => {
        return fs.tree();
    }, 'Display directory tree', 'tree', 'File System');
}
