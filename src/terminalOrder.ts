import * as vscode from 'vscode';

/**
 * Read terminal-panel order through VS Code navigation, not creation order.
 * Restore the original terminal even when navigation or validation fails.
 */
export async function capturePanelTerminalOrder(): Promise<vscode.Terminal[]> {
    const before = [...vscode.window.terminals];
    if (before.length === 0) {
        return [];
    }
    const original = vscode.window.activeTerminal;
    let changed = false;
    const opened = vscode.window.onDidOpenTerminal(() => { changed = true; });
    const closed = vscode.window.onDidCloseTerminal(() => { changed = true; });
    try {
        await vscode.commands.executeCommand('workbench.action.terminal.focusAtIndex1');
        const first = vscode.window.activeTerminal;
        if (!first) {
            throw new Error('No terminal-panel tab is available.');
        }
        const ordered: vscode.Terminal[] = [];
        for (let step = 0; step <= before.length; step++) {
            if (changed) {
                throw new Error('Terminals changed during the scan. Please save again.');
            }
            const current = vscode.window.activeTerminal;
            if (!current || !before.includes(current)) {
                throw new Error('The active terminal changed unexpectedly. Please save again.');
            }
            if (ordered.includes(current)) {
                if (current !== first) {
                    throw new Error('Terminal navigation did not complete a full cycle.');
                }
                return ordered;
            }
            ordered.push(current);
            // Await each navigation command across the editor/extension-host boundary.
            await vscode.commands.executeCommand('workbench.action.terminal.focusNext');
        }
        throw new Error('Could not read a stable terminal order. Please save again.');
    } finally {
        opened.dispose();
        closed.dispose();
        if (original && vscode.window.terminals.includes(original)) {
            original.show();
        }
    }
}
