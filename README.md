## Downtime Reputation Tracker

Foundry VTT v13 module for DnD5e 5.2.4 that tracks reputation-building during downtime. 
Build relationship phases with multiple skill checks and narrative events.
Track progress through your relationship phase and show activity log directly on character sheets.
Extensive customization and management via module settings.

<img width="1496" height="821" alt="default_and_tidy" src="https://github.com/user-attachments/assets/b05a552f-e9b6-4101-bdff-71c1b4089c25" />

<img width="1469" height="796" alt="settings" src="https://github.com/user-attachments/assets/363795a5-147a-4f39-bb09-bc73604e71b2" />


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
2. Configure phases in `Game Settings` -> `Module Settings` -> `Downtime Reputation Settings`.
3. Use the configuration buttons to edit phase config, skill aliases, and progress state.
4. Use the export/import menus in module settings for backups or transfers.
5. Open any character sheet and use the added tab to roll checks and track progress.
   
   NB: there are default settings which set up an example of a 3 phased downtime (with the 1st phase having the most complete setup).
       Until I can write better documentation please use the default configuration as an example.

### Settings Dialogs
- Skill Aliases: map custom skill IDs to system skills.
- Phase Configuration: edit phase rules, skills, DCs, narratives, penalties, and roll tables.
- Progress State: adjust progress, completion, failures, and check count.

### Export/Import
- `Export/Import Settings`: exports all configuration to JSON.
- `Export/Import State`: exports the current tracker state to JSON.
