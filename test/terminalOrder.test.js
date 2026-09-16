const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

let vscode;
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'vscode') { return vscode; }
  return originalLoad(request, parent, isMain);
};

function harness(count = 12) {
  const listeners = { open: new Set(), close: new Set() };
  const subscribe = (kind, fn) => {
    listeners[kind].add(fn);
    return { dispose() { listeners[kind].delete(fn); } };
  };
  const creationOrder = Array.from({ length: count }, (_, id) => ({ id,
    show() { vscode.window.activeTerminal = this; } }));
  const visualOrder = [...creationOrder].reverse();
  const calls = [];
  let onNavigate = () => {};
  vscode = {
    window: {
      terminals: creationOrder,
      activeTerminal: creationOrder[2],
      onDidOpenTerminal: fn => subscribe('open', fn),
      onDidCloseTerminal: fn => subscribe('close', fn),
    },
    commands: {
      async executeCommand(command) {
        calls.push(command);
        await new Promise(resolve => setImmediate(resolve));
        const next = command.endsWith('focusAtIndex1') ? 0
          : (visualOrder.indexOf(vscode.window.activeTerminal) + 1) % visualOrder.length;
        vscode.window.activeTerminal = visualOrder[next];
        onNavigate();
      },
    },
  };
  delete require.cache[require.resolve('../out/terminalOrder.js')];
  const { capturePanelTerminalOrder } = require('../out/terminalOrder.js');
  return { capturePanelTerminalOrder, creationOrder, visualOrder, calls, listeners,
    setOnNavigate(fn) { onNavigate = fn; } };
}

test.after(() => { Module._load = originalLoad; });

test('reads dragged order beyond nine tabs and restores original focus', async () => {
  const h = harness();
  const original = vscode.window.activeTerminal;
  assert.deepEqual(await h.capturePanelTerminalOrder(), h.visualOrder);
  assert.equal(vscode.window.activeTerminal, original);
  assert.equal(h.calls.length, 13);
  assert.ok(h.calls.every(c => c === 'workbench.action.terminal.focusAtIndex1'
    || c === 'workbench.action.terminal.focusNext'));
  assert.equal(h.listeners.open.size + h.listeners.close.size, 0);
});

for (const event of ['open', 'close']) {
  test(`refuses a scan when a terminal ${event}s and restores focus`, async () => {
    const h = harness();
    const original = vscode.window.activeTerminal;
    h.setOnNavigate(() => { for (const listener of h.listeners[event]) { listener(); } });
    await assert.rejects(h.capturePanelTerminalOrder(), /Terminals changed/);
    assert.equal(vscode.window.activeTerminal, original);
    assert.equal(h.listeners.open.size + h.listeners.close.size, 0);
  });
}

test('rejects navigation that cycles somewhere other than the first tab', async () => {
  const h = harness();
  const original = vscode.window.activeTerminal;
  h.setOnNavigate(() => {
    if (h.calls.length > 1) { vscode.window.activeTerminal = h.visualOrder[1]; }
  });
  await assert.rejects(h.capturePanelTerminalOrder(), /full cycle/);
  assert.equal(vscode.window.activeTerminal, original);
});
