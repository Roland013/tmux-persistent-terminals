# tmux Persistent Terminals for VS Code — 0.3.4 pre-release

First independently packaged release of this fork, incorporating upstream
changes through `bd7c113` and the rebased terminal-name/window-order PR.

## Install this fork

1. Install tmux on your Linux, macOS, WSL or SSH terminal host.
2. Download `tmux-persistent-terminals-0.3.4.vsix` from the assets below.
3. In VS Code, connect to your SSH/WSL environment if applicable.
4. Disable the original `pcassidy75.tmux-integrated` extension there.
5. Run **Extensions: Install from VSIX** and select the downloaded file.
6. Run **tmux: New tmux Terminal**.

The installed ID is `Roland013.tmux-persistent-terminals`. Existing
`tmux-integrated.*` settings and the `tmux-integrated` default profile remain
supported. This installer is for the fork, not the original Marketplace listing.

## Changes

- Include **tmux: Save terminal order**: arrange panel tabs, run the command,
  and wait for confirmation. It preserves the programs while saving their order
  for reconnects. Run it again after dragging; split/editor terminals are unsupported.

- Check and save tab renames on focus changes and shutdown, including pending writes.
- Create new windows after the highest tmux index, with fallback after index conflicts.
- Preserve running windows when attachment fails and preserve other extensions' terminals.
- Retain upstream's newer rename tracking, disconnect handling and color-response fix.
- Include the GPL license, bundled dependency MIT license, and matching source download.

## Verification and limits

48 tests passed with no skips, including a private real-tmux server on Linux;
lint passed. Interactive VS Code, macOS and SSH/WSL client behavior were not
manually tested. Dragged tab order must be saved explicitly with the new command; very late
editor restoration can still duplicate tabs. The inherited build tools have nine npm
audit advisories; the production dependency audit reports none.

Closing a terminal with the trash button ends its programs. Closing VS Code or
disconnecting can leave them running while the host and tmux session stay alive.
A reboot stops them.

Download the `-source.tar.gz` asset for exact corresponding source, including
node-pty's original source. `SHA256SUMS` covers both installer and source archive.
The project remains GPL-3.0-only and credits pcassidy75/tmux-integrated.
