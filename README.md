# tmux Persistent Terminals for VS Code

Use tmux through familiar VS Code terminal tabs. Keep programs running when you
disconnect, and return to the same terminals when you reconnect.

This is an independent fork of [tmux-integrated](https://github.com/pcassidy75/tmux-integrated).
It includes newer upstream fixes plus the additional changes described below.

## Install this fork

**Download:** [Installer for version 0.3.4 (pre-release)](https://github.com/Roland013/tmux-persistent-terminals/releases/download/v0.3.4/tmux-persistent-terminals-0.3.4.vsix)

[Release notes and matching source code](https://github.com/Roland013/tmux-persistent-terminals/releases/tag/v0.3.4)

This download installs **this fork**. The original `pcassidy75.tmux-integrated`
Marketplace listing installs the original project. This fork is distributed
through GitHub Releases; it does not yet have its own Marketplace listing.

### 1. Install tmux where your terminals run

For Ubuntu or Debian, open a terminal and run:

```bash
sudo apt update
sudo apt install tmux
```

For macOS, if you have [Homebrew](https://brew.sh/) installed:

```bash
brew install tmux
```

On Windows, use WSL or connect to a Linux machine through VS Code's Remote SSH
extension. Run the Linux installation commands inside WSL or on that remote
machine. Native Windows terminals are not supported.

Check the installation with `tmux -V`. This extension requires tmux 2.1 or
newer; tmux 3.x is recommended. See the [tmux installation guide](https://github.com/tmux/tmux/wiki/Installing)
for other Linux distributions.

### 2. Install the downloaded extension in VS Code

You need VS Code 1.80 or newer.

1. Download the `.vsix` file using the installer link above. A `.vsix` is a
   VS Code extension installer. You do not need the source-code ZIP.
2. Open VS Code. If you use SSH or WSL, connect to that environment first.
3. Open **View → Command Palette**.
4. Type **Extensions: Install from VSIX**, select it, and choose the downloaded
   `tmux-persistent-terminals-0.3.4.vsix` file.
5. Reload VS Code if prompted.
6. Open the Extensions view and check that **tmux Persistent Terminals for
   VS Code** is installed. Its extension ID is
   `Roland013.tmux-persistent-terminals`. For SSH or WSL, it must be installed in
   that remote environment, not only on your local computer.

**Already using the original extension?** Disable `pcassidy75.tmux-integrated`
in the same environment before enabling this fork. Both use the same commands,
settings, and workspace tmux sessions, so do not run them together. Disabling an
extension or reloading VS Code is different from deleting its terminal tabs:
**the terminal trash button ends that terminal's tmux window and programs.**

Existing `tmux-integrated.*` settings and the `tmux-integrated` terminal profile
name still work. Their old names are kept so your settings do not need changing.

### 3. Open a persistent terminal

1. Open your project folder in VS Code.
2. Open **View → Command Palette**.
3. Run **tmux: New tmux Terminal**.
4. Run your commands as usual.

Each terminal tab belongs to a tmux window. Terminals are grouped into a tmux
session named after your workspace folder. You can set a different session name
if you have projects with the same folder name.

### 4. Reconnect to your work

Close the VS Code window or disconnect from the remote machine. When you open
the same workspace again, the extension reconnects to existing sessions by
default. You can also run **tmux: Attach to tmux Window** and choose a terminal.

Programs keep running only while their host machine and tmux session remain
running. A host reboot stops them. Deleting a terminal tab also ends its tmux
window. This extension does not restore running programs after a reboot.

### Optional: use it for every new terminal

Run **Terminal: Select Default Profile** and select **tmux-integrated**.
For SSH or WSL, do this in the connected remote window.

Alternatively, add this to your Linux or Linux remote VS Code settings:

```json
{
  "terminal.integrated.defaultProfile.linux": "tmux-integrated"
}
```

On macOS, use `terminal.integrated.defaultProfile.osx` instead.

### Updating this fork

Download the installer from a newer [GitHub release](https://github.com/Roland013/tmux-persistent-terminals/releases)
and repeat **Extensions: Install from VSIX**. Updates to the original Marketplace
extension do not update this fork.

## What does this add to plain tmux?

Tmux already keeps programs running after you disconnect. This extension brings
those sessions into VS Code's normal terminal interface:

- **Separate VS Code tabs:** switch between tmux windows through familiar tabs.
- **Workspace reconnection:** reopen existing terminals for the project you return to.
- **Open files in VS Code:** use `code <file>` in your tmux terminals.
- **Editor terminal features:** use VS Code's rendering, mouse handling, scrolling,
  and supported shell integration instead of drawing tmux's interface inside a tab.
- **A terminal picker:** choose an existing tmux window from the command palette
  or status bar.

Tmux remains responsible for keeping programs running. The extension uses its
control mode to connect those programs to the editor.

## What is different in this fork?

After incorporating upstream changes through `bd7c113`, this fork adds:

- **More chances to save a tab rename.** Names are checked when focus changes,
  a tab closes, or the extension shuts down, even if you never typed after
  renaming. Shutdown waits for pending name writes.
- **More predictable restored order.** New tmux windows are created after the
  highest existing index. Closing an earlier window and opening another normally
  keeps the new terminal at the end after reconnecting.
- **Safer failed reconnection.** If restoring an existing window's output fails,
  that failure does not kill the window and its running programs.
- **Respect for other extensions' terminals.** Startup cleanup preserves
  terminals owned by other extensions, whatever their tab name.

Upstream's newer rename tracking, disconnect protection, and terminal color
response fix are retained. Automatic process names remain optional. These are
shared upstream features, not new inventions of this fork.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `tmux-integrated.sessionName` | Workspace folder name | Choose a different tmux session name. |
| `tmux-integrated.shell` | Your default shell | Choose the shell for new terminals. |
| `tmux-integrated.cwd` | Workspace folder | Set the starting directory; supports `${workspaceFolder}` and falls back to `terminal.integrated.cwd`. |
| `tmux-integrated.autoConnect` | `true` | Reopen existing workspace terminals when VS Code opens. |
| `tmux-integrated.showAutomaticRename` | `false` | Show the running program's name instead of a stable `tmux:<index>` label. Takes effect when terminals are created or reattached. |
| `tmux-integrated.closeStrayShellsOnActivation` | `true` | Close ordinary shell tabs opened before the extension starts, only when `tmux-integrated` is the default profile. Set to `false` if you want to keep those tabs. |

Use **tmux: Rename tmux Terminal** to give a terminal a fixed name. When automatic
names are enabled, submitting an empty name with this command returns it to
automatic naming. The explicit command also lets you reuse an earlier name that
the built-in Rename action may treat as a delayed title update.

## Limits and troubleshooting

- **Dragged tab order is not saved.** Reconnected tabs follow tmux window-index
  order. If another client takes a new window's intended index first, creation
  falls back to tmux's normal choice of index.
- **Slow restoration can still produce duplicate tabs.** The existing timed
  reconnection grace does not cover every editor restoration delay.
- **Nothing appears after installing?** Check that tmux is installed on the
  terminal host and that the extension is installed and enabled there. Open
  **View → Output → tmux-integrated** for diagnostic messages.
- **An ordinary shell tab appears at startup?** Check your default profile.
  VS Code may create that tab before extensions have activated. The cleanup
  setting above controls whether it is closed.
- **Your sessions vanished after a reboot?** tmux keeps live processes running;
  it is not a backup or a reboot recovery system.

The first fork release is a pre-release. Automated checks include a real tmux
server on Linux. Interactive VS Code, macOS, and Windows-to-WSL/SSH testing are
not claimed by this release. See [release validation](doc/VALIDATION.md).

## License and source

This modified fork is distributed under **GPL-3.0-only**, the same license as
[the original project](https://github.com/pcassidy75/tmux-integrated).
See [LICENSE](LICENSE), [FORK_CHANGES.md](FORK_CHANGES.md), and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Each release provides the installer and a matching source archive, including
the original source for the bundled node-pty JavaScript. Source downloads and
build instructions are available alongside the installer. No Marketplace
account is required to install it or to build a modified version.

For development and release instructions, see [doc/RELEASE.md](doc/RELEASE.md).
