const assert = require('node:assert/strict');
const events = require('node:events');
const Module = require('node:module');
const test = require('node:test');

const folders = [
  { name: 'resume', index: 0, uri: { fsPath: '/workspace/resume' } },
  { name: 'Applications', index: 1, uri: { fsPath: '/workspace/Applications' } },
];

class Disposable {
  dispose() {}
}

class EventEmitter {
  constructor() {
    this.emitter = new events.EventEmitter();
    this.event = (listener) => {
      this.emitter.on('event', listener);
      return new Disposable();
    };
  }

  fire(value) {
    this.emitter.emit('event', value);
  }
}

class FakeTmuxControlClient extends events.EventEmitter {
  setVersion() {}

  versionAtLeast() {
    return true;
  }

  isConnected() {
    return true;
  }

  async connect() {}

  async listWindows() {
    return [{ id: '@1', paneId: '%1', index: 0, name: 'tmux:0', automaticRename: true }];
  }

  async sendCommand(command) {
    return command.includes('__ping__') ? ['__ping__'] : [];
  }

  async updateEnvironment() {}

  disconnect() {}
}

test('workspace selection, terminal ownership, and rename lifecycle wiring', async () => {
  let profileProvider;
  const handlers = {};
  let foreignDisposed = false;
  const foreignTerminal = { name: 'other-extension', creationOptions: { pty: {} },
    dispose() { foreignDisposed = true; } };
  const vscode = {
    Disposable,
    EventEmitter,
    StatusBarAlignment: { Left: 1 },
    TerminalProfile: class {
      constructor(options) {
        this.options = options;
      }
    },
    Uri: { parse: (value) => ({ value }) },
    env: { appRoot: '/mock/vscode', openExternal() {} },
    workspace: {
      workspaceFolders: folders,
      getConfiguration(section) {
        return {
          get(key, fallback) {
            if (section === 'tmux-integrated' && key === 'autoConnect') {
              return false;
            }
            if (section === 'terminal.integrated' && key.startsWith('defaultProfile.')) { return 'tmux-integrated'; }
            return fallback;
          },
        };
      },
    },
    window: {
      terminals: [foreignTerminal],
      createOutputChannel: () => ({ appendLine() {}, dispose() {} }),
      createStatusBarItem: () => ({ show() {}, dispose() {}, text: '', command: '' }),
      registerTerminalProfileProvider(_id, provider) {
        profileProvider = provider;
        return new Disposable();
      },
      showQuickPick: async (items) => items.find((item) => item.workspaceFolder?.index === 1),
      showErrorMessage: async () => undefined,
      showWarningMessage() {},
      onDidOpenTerminal: (handler) => { handlers.onDidOpenTerminal = handler; return new Disposable(); },
      onDidCloseTerminal: (handler) => { handlers.onDidCloseTerminal = handler; return new Disposable(); },
      onDidChangeActiveTerminal: (handler) => { handlers.onDidChangeActiveTerminal = handler; return new Disposable(); },
      onDidChangeWindowState: (handler) => { handlers.onDidChangeWindowState = handler; return new Disposable(); },
      state: { focused: false },
    },
    commands: { registerCommand: () => new Disposable() },
  };

  const originalLoad = Module._load;
  Module._load = function loadMockedModule(request, parent, isMain) {
    if (request === 'vscode') {
      return vscode;
    }
    if (request === 'child_process') {
      return {
        execFileSync(_file, args) {
          if (args[0] === '-V') {
            return 'tmux 3.5a\n';
          }
          if (args[0] === 'has-session') {
            throw new Error('missing session');
          }
          return '';
        },
      };
    }
    if (request.endsWith('/tmuxControlClient') || request === './tmuxControlClient') {
      return {
        TmuxControlClient: FakeTmuxControlClient,
        CommandFlags: { None: 0, TolerateErrors: 1 },
        shellescape: (value) => value,
      };
    }
    return originalLoad(request, parent, isMain);
  };

  const subscriptions = [];
  try {
    const extension = require('../out/extension.js');
    await extension.activate({
      extensionPath: '/extension',
      globalStorageUri: { fsPath: '/extension-storage' },
      workspaceState: { get: (_key, fallback) => fallback, update: async () => {} },
      subscriptions,
    });
    assert.ok(profileProvider, 'profile provider was registered');

    const profile = await profileProvider.provideTerminalProfile({ isCancellationRequested: false });

    assert.equal(profile.options.pty.startDirectory, '/workspace/Applications');
    assert.equal(foreignDisposed, false, 'another extension owns its terminal even with a non-tmux title');

    const pty = profile.options.pty;
    const terminal = { name: 'custom-name', creationOptions: profile.options, show() {} };
    const observed = [];
    pty.maybeSyncNameFromVsCode = async (name) => { observed.push(name); };
    handlers.onDidOpenTerminal(terminal);
    handlers.onDidChangeWindowState({ focused: false });
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(observed.includes('custom-name'), 'focus loss catches a rename without input');

    let finish;
    pty.maybeSyncNameFromVsCode = () => new Promise((resolve) => { finish = resolve; });
    let stopped = false;
    const shutdown = extension.deactivate().then(() => { stopped = true; });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(stopped, false, 'deactivation waits for name writes');
    finish();
    await shutdown;
    assert.equal(stopped, true);
  } finally {
    for (const subscription of subscriptions) {
      subscription.dispose?.();
    }
    Module._load = originalLoad;
    delete require.cache[require.resolve('../out/extension.js')];
  }
});
