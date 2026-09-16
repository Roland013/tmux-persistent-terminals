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

function windowOrderClient() {
  const client = new TmuxControlClient('test', 'tmux', '/unused');
  const windows = ['@1', '@2', '@3', '@4'].map((id, n) => ({ id, index: n * 3, paneId: `%${n}` }));
  client.listWindows = async () => windows.map(w => ({ ...w }));
  const commands = [];
  client.sendCommand = async command => {
    commands.push(command);
    const match = /^swap-window -d -s (@\d+) -t (@\d+)$/.exec(command);
    assert.ok(match, 'saving must only swap windows, without input or process replacement');
    const a = windows.find(w => w.id === match[1]);
    const b = windows.find(w => w.id === match[2]);
    [a.index, b.index] = [b.index, a.index];
    return [];
  };
  return { client, windows, commands };
}

test('saving dragged order keeps IDs, panes and index gaps; unopened windows follow', async () => {
  const { client, windows } = windowOrderClient();
  const panes = windows.map(w => [w.id, w.paneId]);
  await client.saveWindowOrder(['@3', '@1']);
  assert.deepEqual([...windows].sort((a, b) => a.index - b.index).map(w => w.id), ['@3', '@1', '@2', '@4']);
  assert.deepEqual(windows.map(w => [w.id, w.paneId]), panes);
  assert.deepEqual(windows.map(w => w.index).sort((a, b) => a - b), [0, 3, 6, 9]);
});

test('rejects duplicate, missing and malformed IDs before any swaps', async () => {
  for (const ids of [['@1', '@1'], ['@999'], ['@1; kill-server']]) {
    const { client, commands } = windowOrderClient();
    await assert.rejects(client.saveWindowOrder(ids), /window changed/);
    assert.deepEqual(commands, []);
  }
});

test('refuses success when another client changes the final order', async () => {
  const { client } = windowOrderClient();
  client.sendCommand = async () => []; // Simulate a conflicting client undoing each swap.
  await assert.rejects(client.saveWindowOrder(['@3', '@1']), /order changed/);
});

test('reports a failed swap and allows retry after a partial save', async () => {
  const { client, windows } = windowOrderClient();
  const send = client.sendCommand;
  let count = 0;
  client.sendCommand = async command => {
    if (++count === 2) { throw new Error('connection interrupted'); }
    return send(command);
  };
  await assert.rejects(client.saveWindowOrder(['@4', '@3', '@2', '@1']), /connection interrupted/);
  client.sendCommand = send;
  await client.saveWindowOrder(['@4', '@3', '@2', '@1']);
  assert.deepEqual(windows.sort((a, b) => a.index - b.index).map(w => w.id), ['@4', '@3', '@2', '@1']);
});
