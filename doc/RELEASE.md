# Building and releasing this fork

This fork has extension ID `Roland013.tmux-persistent-terminals` and is distributed
through [its own GitHub Releases](https://github.com/Roland013/tmux-persistent-terminals/releases).
It does not publish to the original maintainer's Marketplace or Open VSX accounts.
A future Marketplace listing needs a registered publisher controlled by this project.

## Build an installer yourself

Use Node.js 24, npm, and Git. Clone the default branch to build the current
fork source. Building an installer does not publish a release. Run:

```bash
git clone https://github.com/Roland013/tmux-persistent-terminals.git
cd tmux-persistent-terminals
npm ci
npm test
npm run lint
npx vsce package --pre-release -o tmux-persistent-terminals.vsix
```

The real-tmux test uses a separate test socket, not your normal tmux server.
It requires tmux and a loadable node-pty. Test output must show that it ran rather
than skipped before claiming real-tmux validation. For a stable (even minor)
version, omit `--pre-release` from the packaging command.

Open VS Code in the environment where your terminals run and use **Extensions:
Install from VSIX** to install the file. Disable the original extension there
first because commands, settings, profile names and tmux sessions are shared.

## Version and release

Versions follow the inherited channel convention: odd minor versions are
pre-releases; even minor versions are stable. `scripts/release.js` computes the
next version, uses `npm version` to run the changelog lifecycle and tag the
release, then pushes. Do not hand-edit version numbers or generated changelog
entries. `CHANGELOG.md` remains stable-only; record beta changes in
`doc/RELEASE_NOTES.md` and update the README's direct installer link.

From clean, synchronized `main`, after tests, lint, license and package checks:

```bash
node scripts/release.js beta --dry-run
npm run release:beta
```

Use `release:stable` for a deliberately validated stable release. Creating and
pushing the tag publishes a GitHub release through `.github/workflows/release.yml`.
No Marketplace or Open VSX tokens are needed or used.

## Package and verify before publishing

On Linux with Node.js 24, Git, GNU tar, unzip and locked dependencies installed:

```bash
npm run package:release
cd dist
sha256sum -c SHA256SUMS
```

This requires a committed, clean tree and writes:

- `tmux-persistent-terminals-VERSION.vsix`: installer;
- `tmux-persistent-terminals-VERSION-source.tar.gz`: exact extension source,
  build files and original node-pty source;
- `SHA256SUMS`: checksums for both downloads.

The package command checks notices, extension identity, absence of native
binaries, and the dependency source checksum. It downloads node-pty's original
source from the immutable commit recorded in `scripts/dependency-sources.json`.
When changing that dependency, update and verify the source version, commit and
checksum together. The npm package alone omits its TypeScript source.

Keep the complete GPL license and node-pty MIT license in every installer. Keep
matching source available alongside each installer. The source archive excludes
Git history and stores neutral numeric owner/group metadata.

Before publishing, inspect archive contents for personal details, credentials,
local paths and unexpected files. Use a GitHub no-reply address for new commits.
A source archive does not erase metadata from previously published Git commits.

## Release recovery

If CI fails, inspect the failure and rerun the existing job after fixing its
cause. Do not delete or replace a published tag. If publishing manually, upload
the installer, matching source archive and checksum file together, and preserve
the pre-release designation for odd-minor versions.
