## Downtime Reputation Tracker

Foundry VTT v13 module for DnD5e 5.2.4 that tracks reputation-building during downtime.

### Features
- Phase-based tracking with sequential unlocks and auto-advance on completion.
- Configurable skills, DCs, targets, narratives, and per-phase penalties.
- Per-phase settings for critical bonus, failure events, and event roll tables.
- Interval label (e.g., Weekly) is configurable and used across UI + chat.
- Activity log + chat summaries for checks and phase completion.
- Phase images with file picker support.
- GM-only settings dialogs (ApplicationV2) with export/import for settings and state.
- Works on default DnD5e sheet and Tidy5e sheet.

### Use
1. Enable the module.
2. Configure phases in `Game Settings` -> `Module Settings` -> `Downtime Reputation Settings` (GM only).
3. Use the configuration buttons to edit phase config, skill aliases, and progress state.
4. Use the export/import menus in module settings for backups or transfers.
5. Open any character sheet and use the `Downtime` tab to roll checks and track progress.

### Settings Dialogs
- Skill Aliases: map custom skill IDs to system skills.
- Phase Configuration: edit phase rules, skills, DCs, narratives, penalties, and roll tables.
- Progress State: adjust progress, completion, failures, and check count.

### Export/Import
- `Export/Import Settings`: exports all configuration to JSON.
- `Export/Import State`: exports the current tracker state to JSON.
