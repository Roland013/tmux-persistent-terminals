# First fork release validation

15 September 2026. Rebased onto upstream
`bd7c1136b0dceb35c6e94de880000b164d692ffa` (nine commits beyond the former fork main).

## Pending PR incorporated

PR #1 supplied terminal-name persistence and best-effort append order. Upstream
has since replaced title synchronization and close handling. The rebase retains
upstream's `TabTitleSync`, opt-in automatic names and exit-reason based shutdown
protection, and adapts the remaining fork changes to those interfaces. Four
conflicted files were resolved; the old parallel title tracker was not restored.

## Automated checks

- `npm test`: 39 tests passed, zero skipped, on Node 24 and tmux 3.4 on Linux.
  Includes a private real-tmux server, both rename directions, stale-title
  handling, automatic naming, index gaps, and recovery after an actual occupied
  index error. It also checks workspace selection, focus/shutdown rename wiring,
  preservation of other extension terminals, and failed-adoption protection.
- `npm run lint`: passed.
- `git diff --check`: passed.
- `npm audit --omit=dev`: zero reported production dependency vulnerabilities.
  The inherited development dependencies report nine advisories (seven high,
  two moderate). This release does not claim a clean full dependency audit.

The release workflow repeats tests and lint, then checks installer contents,
licenses, identity and matching source before uploading all release artifacts.

## Remaining compatibility limits

Interactive VS Code reload/close behavior, macOS, Windows clients with SSH/WSL,
and older tmux versions were not manually exercised for this release. A passing
Linux test suite is not a claim that those environments were tested. This first
fork release is marked pre-release.

Manual VS Code tab dragging alone is not persisted; use the explicit save command. Very late editor restoration can
still create duplicate tabs. Upstream's remembered-title classifier can ignore
a built-in rename back to an earlier title; use the explicit tmux rename command
for that case. These existing limits are documented rather than silently changed.


## Save terminal order integration — 16 September 2026

`npm test` passed 48 tests with zero skips after porting the installed local
command into TypeScript source. Tests cover visual order different from creation
order, more than nine tabs, focus restoration, concurrent tab changes, command
registration and re-entry, unsupported/incomplete panel scans, disconnected
windows, ID validation, index gaps, partial-save retry, and final-order checking.
The private real-tmux test saves order, verifies unchanged pane IDs and process
IDs, reconnects a new control client, and verifies the saved order again.

`npm run lint` and `git diff --check` passed. The command's navigation has not been
visually tested in the Windows VS Code client. The public success message has no
dependency on the private recovery helper used by the original local build.

Version 0.3.4 uses GitHub's pre-release designation. The release includes the
installer, matching source archive, and checksums.
