# Modified fork notice

Modified on 15 September 2026 by the tmux Persistent Terminals project,
maintained at https://github.com/Roland013/tmux-persistent-terminals.

Based on pcassidy75/tmux-integrated, including upstream commit
`bd7c1136b0dceb35c6e94de880000b164d692ffa`. Original project:
https://github.com/pcassidy75/tmux-integrated.

This fork adds lifecycle rename flushing, best-effort append order for new
windows, preservation of other extensions' terminals during startup cleanup,
and protection for existing windows after a failed attachment. It also changes
the extension identity and distribution to fork-specific GitHub installers,
with matching source downloads and retained dependency notices.

The project remains GPL-3.0-only. The original license and inherited notices
are retained. This fork is independently maintained and is not presented as
an official release by the original maintainer, Microsoft, or the tmux project.


Modified on 16 September 2026 to incorporate the local **Save terminal order**
command. It saves manually arranged panel tabs by swapping existing tmux window
indices and verifies the result. It preserves window/pane identity and running
processes, restores focus, and reports interrupted saves. User instructions and
mocked-editor/real-tmux compatibility tests accompany the change.
