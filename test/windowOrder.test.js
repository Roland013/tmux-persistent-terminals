const assert = require('node:assert/strict');
const test = require('node:test');
const { TmuxControlClient } = require('../out/tmuxControlClient.js');

test('new windows append after the highest index, including index gaps', async () => {
  const client = new TmuxControlClient('test', 'tmux', '/unused');
  client.listWindows = async () => [{ index: 0 }, { index: 4 }];
  const commands = [];
  client.sendCommand = async (command) => { commands.push(command); return ['@7 %9 5']; };
  const result = await client.newWindow({ shell: '/bin/bash' });
  assert.equal(result.windowIndex, 5);
  assert.match(commands[0], / -t 5 '\/bin\/bash'$/);
});

test('an occupied append index falls back to ordinary tmux allocation', async () => {
  const client = new TmuxControlClient('test', 'tmux', '/unused');
  client.listWindows = async () => [{ index: 4 }];
  const commands = [];
  client.sendCommand = async (command) => {
    commands.push(command);
    if (commands.length === 1) { throw new Error('index in use'); }
    return ['@8 %10 1'];
  };
  const result = await client.newWindow({ shell: '/bin/bash' });
  assert.equal(result.windowIndex, 1);
  assert.equal(commands.length, 2);
  assert.doesNotMatch(commands[1], / -t /);
});
