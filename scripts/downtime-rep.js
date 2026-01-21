const MODULE_ID = "downtime-rep";
const SHEET_TAB_ID = "downtime-rep";
const SHEET_TAB_LABEL = "Downtime";
const DEFAULT_HEADER_LABEL = "Downtime Reputation Tracker";
const DEFAULT_TAB_LABEL = SHEET_TAB_LABEL;
const DEFAULT_INTERVAL_LABEL = "Weekly";
const DEBUG_SETTING = "debugLogging";
const TIDY_TEMPLATE_PATH = "modules/downtime-rep/templates/downtime-rep.hbs";
let tidyApi = null;
const SOCKET_EVENT_STATE = "state-updated";
const SOCKET_EVENT_REQUEST = "state-request";
const RESTRICTED_ACTORS_SETTING = "restrictedActorUuids";

const DEFAULT_PHASE_CONFIG = [
  {
    id: "phase1",
    name: "Building the Hearth",
    narrativeDuration: "3-5 weeks",
    expectedGain: "1-3",
    target: 8,
    allowCriticalBonus: true,
    failureEvents: false,
    skills: ["insight", "persuasion", "religion"],
    skillTargets: { insight: 3, persuasion: 3, religion: 2 },
    image: "",
    skillDcSteps: {
      insight: [13, 13, 14],
      persuasion: [14, 14, 15],
      religion: [15, 16],
    },
    skillNarratives: {
      insight: {
        1: {
          title: "Learning Whose Silence Carries Weight",
          text:
           "Before anyone trusts your words, they need to know you are hearing theirs. In the Cogs, silence isn’t emptiness — it’s memory, caution, and names that never came back. To listen here is to learn who speaks, who cannot afford to, and who has already been ignored too many times.",
        },
        2: {
          title: "Recognizing the Pressures That Shape Every Choice",
          text: "You begin to see the strain beneath the metal. Every conversation carries the weight of consequences — lost work, broken parts, quiet punishments. You learn that disagreement isn’t hostility here. It’s fear choosing its words carefully.",
        },
        3: {
          title: "Knowing the Cost Others Pay to Stand Beside You",
          text: "Not everyone can stand in the light, even if they believe. Some can only help quietly, from the edges, where survival still demands silence. Understanding the movement now means knowing when not to ask more of someone than they can afford to give."
        }
      },
      persuasion: {
        1: {
          title: "When People Choose to Return Without Being Asked",
          text: "The first sign of trust isn’t agreement — it’s return.They come back after the shift ends.\nAfter the argument.\nAfter the doubt.\nNo one says why, but presence itself becomes an answer.",
        },
        2: {
          title: "When Others Speak in Your Defense Before You Do",
          text:
            "One day, the challenge isn’t answered by you.Someone else speaks first. Not louder — just steadier. In that moment, belief stops being something you explain and becomes something others are willing to stand beside.",
        },
        3: {
          title: "When Trust Becomes Action Without Instruction",
          text: "Eventually, no one waits to be told what to do. Food is shared. Watches are kept. Repairs are made without being asked.Trust stops being a feeling and becomes a habit — one that holds even when you are not there."
        }
      },
      religion: {
        1: {
          title: "Redefining the Hearth as Community, Not Houses",
          text: "They stop asking where Boldrei’s house is. They start asking who she protects. When hearth becomes people instead of walls, the question of belonging finally finds room to breathe.",
        },
        2: {
          title: "When the Words No Longer Need Your Voice",
          text:
            "You hear your words come back to you — changed. Sharper. Simpler. Truer to their lives than to your sermons. When the message no longer needs your voice to survive, you know it has found a home.",
        },
      },
    },
    failureLines: [
      "People listen, but do not act yet.",
      "Debate stalls the message for now.",
      "Fatigue keeps attention low.",
    ],
  },
  {
    id: "phase2",
    name: "Holding the Hearth",
    narrativeDuration: "1-3 months",
    expectedGain: "~1",
    target: 9,
    allowCriticalBonus: false,
    forceSkillAfterFailures: "insight",
    failureEvents: false,
    skills: ["persuasion", "religion", "insight"],
    skillDcs: { persuasion: 15, religion: 15, insight: 15 },
    image: "",
    progressNarrative: {
      1: {
        title: "Mutual Aid Routine",
        text: "Mutual aid becomes routine.",
      },
      3: {
        title: "Mutual Aid Routine",
        text: "Mutual aid becomes routine.",
      },
      4: {
        title: "Persists Without You",
        text: "Community persists without daily cleric presence.",
      },
      6: {
        title: "Persists Without You",
        text: "Community persists without daily cleric presence.",
      },
      7: {
        title: "External Pressure",
        text: "External pressure begins to mount.",
      },
      8: {
        title: "External Pressure",
        text: "External pressure begins to mount.",
      },
      9: {
        title: "Phase Complete",
        text: "Stable community holds together.",
      },
    },
    failureLines: [
      "Tension flares between groups.",
      "Burnout thins the gatherings.",
      "Fear keeps people indoors.",
    ],
  },
  {
    id: "phase3",
    name: "Tending the Ember",
    narrativeDuration: "Several months",
    expectedGain: "~1",
    target: 12,
    allowCriticalBonus: false,
    failureEvents: true,
    skills: ["persuasion", "religion", "insight"],
    skillDcs: { persuasion: 15, religion: 15, insight: 15 },
    image: "",
    progressNarrative: {
      3: {
        title: "Space Defended",
        text: "Defenders speak up when the space is challenged.",
      },
      6: {
        title: "Ritualized Space",
        text: "Rituals and repairs make the site feel lived-in.",
      },
      9: {
        title: "Early Warnings",
        text: "Early warnings travel fast when trouble stirs.",
      },
      12: {
        title: "Phase Complete",
        text:
          "The Shared Ember exists. Ash-Twenty-Seven emerges, and a safe place holds.",
      },
    },
    failureLines: [
      "Crackdown pressure forces dispersal.",
      "A forced relocation breaks momentum.",
      "An ideological split fractures support.",
    ],
  },
];

const DEFAULT_STATE = {
  activePhaseId: "phase1",
  phases: {
    phase1: { progress: 0, completed: false, failuresInRow: 0 },
    phase2: { progress: 0, completed: false, failuresInRow: 0 },
    phase3: { progress: 0, completed: false, failuresInRow: 0 },
  },
  checkCount: 0,
  criticalBonusEnabled: false,
  journalId: "",
  log: [],
};

const DEFAULT_SKILL_ALIASES = {
  persuasion: "per",
  insight: "ins",
  religion: "rel",
};


class DowntimeRepApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "downtime-rep-app",
      title: "Downtime Reputation Tracker",
      template: "modules/downtime-rep/templates/downtime-rep.hbs",
      width: 740,
      height: "auto",
      classes: ["downtime-rep"],
    });
  }

  getData() {
    return buildTrackerData({ showActorSelect: true, embedded: false });
  }

  activateListeners(html) {
    super.activateListeners(html);
    attachTrackerListeners(html, { render: () => this.render() });
  }
}

class DowntimeRepSettings extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "downtime-rep-settings",
      title: "Downtime Reputation Settings",
      template: "modules/downtime-rep/templates/downtime-rep-settings.hbs",
      width: 520,
      height: "auto",
      classes: ["downtime-rep", "drep-settings"],
    });
  }

  getData() {
    const state = getWorldState();
    const skillAliases = getSkillAliases();
    const headerLabel = getHeaderLabel();
    const tabLabel = getTabLabel();
    const intervalLabel = getIntervalLabel();
    const restrictedActorUuids = getRestrictedActorUuids();
    const phaseConfig = getPhaseConfig();
    const phase1Config =
      phaseConfig.find((phase) => phase.id === "phase1") ?? phaseConfig[0];
    const phase1SkillState = getPhaseSkillList(phase1Config).map((key) => ({
      key,
      label: getSkillLabel(resolveSkillKey(key, skillAliases)),
      value: Number(state.phases.phase1?.skillProgress?.[key] ?? 0),
      target: getPhaseSkillTarget(phase1Config, key),
    }));
    const phaseStateRows = phaseConfig.map((phase) => {
      const phaseState = state.phases[phase.id] ?? {};
      return {
        id: phase.id,
        name: phase.name,
        target: phase.target,
        progress: Number(phaseState.progress ?? 0),
        completed: Boolean(phaseState.completed),
        failuresInRow: Number(phaseState.failuresInRow ?? 0),
        isPhase1: phase.id === "phase1",
        image: phase.image ?? "",
        skillRows: phase.id === "phase1" ? phase1SkillState : [],
      };
    });
    const phaseOptions = phaseConfig.map((phase) => {
      const unlocked = isPhaseUnlocked(phase.id, state);
      const completed = state.phases[phase.id]?.completed ?? false;
      const status = completed ? "Complete" : unlocked ? "Available" : "Locked";
      return {
        id: phase.id,
        label: `${phase.name} (${status})`,
        unlocked,
        completed,
      };
    });

    return {
      state,
      skillAliases,
      skillAliasJson: JSON.stringify(skillAliases, null, 2),
      phaseOptions,
      activePhaseId: state.activePhaseId,
      criticalBonusEnabled: state.criticalBonusEnabled,
      headerLabel,
      tabLabel,
      intervalLabel,
      restrictedActorUuidsText: restrictedActorUuids.join("\n"),
      phaseConfigJson: JSON.stringify(phaseConfig, null, 2),
      phaseStateRows,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-drep-drop='actor-uuids']").on("dragover", (event) => {
      event.preventDefault();
    });
    html.find("[data-drep-drop='actor-uuids']").on("drop", (event) => {
      event.preventDefault();
      const data = TextEditor.getDragEventData(event.originalEvent ?? event);
      const uuid = data?.uuid ?? (data?.type === "Actor" ? `Actor.${data.id}` : "");
      if (!uuid) return;
      const textarea = html.find("[data-drep-drop='actor-uuids']").first();
      const existing = parseRestrictedActorUuids(textarea.val());
      if (existing.includes(uuid)) return;
      existing.push(uuid);
      textarea.val(existing.join("\n"));
    });
    html.find("[data-drep-action]").on("click", (event) => {
      event.preventDefault();
      const action = event.currentTarget?.dataset?.drepAction;
      if (!action) return;
      if (action === "log-recalc") {
        this.#handleLogRecalc();
        return;
      }
      if (action.startsWith("log-")) {
        this.#handleLogAction(action, event.currentTarget?.dataset);
        return;
      }
      this.#handleMaintenanceAction(action);
    });
  }

  async _updateObject(event, formData) {
    const state = getWorldState();
    state.criticalBonusEnabled = Boolean(formData.criticalBonusEnabled);

    const requestedPhaseId = formData.activePhaseId;
    if (requestedPhaseId) {
      if (!isPhaseUnlocked(requestedPhaseId, state)) {
        ui.notifications.warn(
          "Downtime Reputation: selected phase is still locked."
        );
      } else if (state.phases[requestedPhaseId]?.completed) {
        ui.notifications.warn(
          "Downtime Reputation: selected phase is already complete."
        );
      } else {
        state.activePhaseId = requestedPhaseId;
      }
    }

    const skillAliases = parseSkillAliases(formData.skillAliasJson);
    if (!skillAliases) return;

    const parsedConfig = formData.phaseConfigJson
      ? parsePhaseConfig(formData.phaseConfigJson)
      : null;
    if (formData.phaseConfigJson && !parsedConfig) {
      return;
    }
    const phaseConfig = parsedConfig ?? getPhaseConfig();
    updatePhaseImagesFromForm(phaseConfig, formData);
    applyStateOverridesFromForm(state, formData, phaseConfig);

    if (parsedConfig) {
      await game.settings.set(MODULE_ID, "phaseConfig", parsedConfig);
    }

    await setWorldState(state);
    await game.settings.set(MODULE_ID, "skillAliases", skillAliases);
    await game.settings.set(
      MODULE_ID,
      "headerLabel",
      sanitizeLabel(formData.headerLabel, DEFAULT_HEADER_LABEL)
    );
    await game.settings.set(
      MODULE_ID,
      "tabLabel",
      sanitizeLabel(formData.tabLabel, DEFAULT_TAB_LABEL)
    );
    await game.settings.set(
      MODULE_ID,
      "intervalLabel",
      sanitizeLabel(formData.intervalLabel, DEFAULT_INTERVAL_LABEL)
    );
    await game.settings.set(
      MODULE_ID,
      RESTRICTED_ACTORS_SETTING,
      parseRestrictedActorUuids(formData.restrictedActorUuids)
    );
    refreshSheetTabLabel();
    ui.notifications.info("Downtime Reputation: settings saved.");
  }

  async #handleMaintenanceAction(action) {
    if (!action) return;

    const prompts = {
      "reset-progress": {
        title: "Reset Phase Progress",
        content:
          "<p>Reset progress, completion, and failure streaks for all phases?</p>",
      },
      "reset-log": {
        title: "Clear Activity Log",
        content: "<p>Clear all recorded downtime checks?</p>",
      },
      "reset-checks": {
        title: "Reset Check Count",
        content: "<p>Reset the check counter back to zero?</p>",
      },
      "reset-phase-config": {
        title: "Reset Phase Configuration",
        content: "<p>Restore the default phase configuration?</p>",
      },
      "reset-all": {
        title: "Reset All Tracking",
        content:
          "<p>Reset phases, log, and check count, and set the active phase to Phase 1?</p>",
      },
    };

    const prompt = prompts[action];
    if (!prompt) return;

    const confirmed = await Dialog.confirm({
      title: prompt.title,
      content: prompt.content,
    });
    if (!confirmed) return;

    const state = getWorldState();

    switch (action) {
      case "reset-progress":
        resetPhaseState(state);
        break;
      case "reset-log":
        state.log = [];
        break;
      case "reset-checks":
        state.checkCount = 0;
        break;
      case "reset-phase-config":
        await game.settings.set(MODULE_ID, "phaseConfig", DEFAULT_PHASE_CONFIG);
        break;
      case "reset-all":
        resetPhaseState(state);
        state.log = [];
        state.checkCount = 0;
        state.activePhaseId = getFirstPhaseId();
        state.journalId = "";
        break;
      default:
        return;
    }

    await setWorldState(state);
    this.render();
    ui.notifications.info("Downtime Reputation: maintenance action applied.");
  }

  async #handleLogAction(action, dataset) {
    const index = Number(dataset?.logIndex);
    if (!Number.isFinite(index)) return;

    const state = getWorldState();
    if (!Array.isArray(state.log) || !state.log[index]) return;

    if (action === "log-delete") {
      const confirmed = await Dialog.confirm({
        title: "Remove Log Entry",
        content: "<p>Remove this log entry and recalculate progress?</p>",
      });
      if (!confirmed) return;
      state.log.splice(index, 1);
    } else if (action === "log-toggle") {
      const entry = state.log[index];
      entry.success = !entry.success;
      if (!entry.success) {
        entry.criticalBonusApplied = false;
      }
    } else {
      return;
    }

    const recalculated = recalculateStateFromLog(state);
    await setWorldState(recalculated);
    this.render();
    ui.notifications.info("Downtime Reputation: log updated.");
  }

  async #handleLogRecalc() {
    const state = getWorldState();
    const recalculated = recalculateStateFromLog(state);
    await setWorldState(recalculated);
    this.render();
    ui.notifications.info("Downtime Reputation: progress recalculated.");
  }
}

function debugLog(message, data = {}) {
  try {
    if (!game?.settings?.get(MODULE_ID, DEBUG_SETTING)) return;
  } catch (error) {
    return;
  }
  const payload = Object.keys(data).length ? data : "";
  console.log(`[%s] %s`, MODULE_ID, message, payload);
}

function getPhaseConfig() {
  const stored = game.settings.get(MODULE_ID, "phaseConfig");
  if (!Array.isArray(stored) || !stored.length) {
    return normalizePhaseConfig(DEFAULT_PHASE_CONFIG);
  }
  return normalizePhaseConfig(stored);
}

function normalizePhaseConfig(config) {
  const output = [];

  for (const fallback of DEFAULT_PHASE_CONFIG) {
    const stored = Array.isArray(config)
      ? config.find((phase) => phase?.id === fallback.id)
      : null;
    const merged = foundry.utils.mergeObject(fallback, stored ?? {}, {
      inplace: false,
      overwrite: true,
    });
    merged.image = typeof merged.image === "string" ? merged.image : "";
    merged.skills =
      Array.isArray(merged.skills) && merged.skills.length
        ? merged.skills
        : fallback.skills ?? getDefaultSkills();
    if (merged.id === "phase1") {
      merged.skillTargets = normalizeSkillTargets(merged, fallback);
      if (!Number.isFinite(merged.target) || merged.target <= 0) {
        merged.target = getPhaseTotalTarget(merged);
      }
      merged.skillDcSteps = merged.skillDcSteps ?? fallback.skillDcSteps;
      merged.skillNarratives = merged.skillNarratives ?? fallback.skillNarratives;
    } else {
      merged.skillDcs = merged.skillDcs ?? fallback.skillDcs;
    }
    output.push(merged);
  }

  if (!output.length) {
    output.push(...DEFAULT_PHASE_CONFIG);
  }
  return output;
}

function parsePhaseConfig(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      ui.notifications.error(
        "Downtime Reputation: phase configuration must be a JSON array."
      );
      return null;
    }
  return normalizePhaseConfig(parsed);
  } catch (error) {
    console.error(error);
    ui.notifications.error(
      "Downtime Reputation: phase configuration JSON is invalid."
    );
    return null;
  }
}

function parseSkillAliases(raw) {
  if (!raw) return getSkillAliases();
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
      ui.notifications.error(
        "Downtime Reputation: skill aliases must be a JSON object."
      );
      return null;
    }
    return parsed;
  } catch (error) {
    console.error(error);
    ui.notifications.error(
      "Downtime Reputation: skill aliases JSON is invalid."
    );
    return null;
  }
}

function updatePhaseImagesFromForm(phaseConfig, formData) {
  if (!Array.isArray(phaseConfig) || !formData) return;
  for (const phase of phaseConfig) {
    const key = `phaseImage_${phase.id}`;
    if (Object.prototype.hasOwnProperty.call(formData, key)) {
      const value = String(formData[key] ?? "").trim();
      phase.image = value;
    }
  }
}

function normalizeSkillTargets(phase, fallback) {
  const targets = {};
  const skills = Array.isArray(phase?.skills) && phase.skills.length
    ? phase.skills
    : fallback?.skills ?? getDefaultSkills();
  for (const key of skills) {
    const direct = phase?.skillTargets?.[key];
    const fallbackTarget = fallback?.skillTargets?.[key];
    const legacy = phase?.skillTarget;
    const resolved = Number.isFinite(direct)
      ? direct
      : Number.isFinite(fallbackTarget)
        ? fallbackTarget
        : Number.isFinite(legacy)
          ? legacy
          : 2;
    targets[key] = Math.max(0, resolved);
  }
  return targets;
}

function applyStateOverridesFromForm(state, formData, phaseConfig) {
  if (!state || !formData || !Array.isArray(phaseConfig)) return;
  const checkCount = Number(formData.checkCount);
  if (Number.isFinite(checkCount)) {
    state.checkCount = Math.max(0, checkCount);
  }

  for (const phase of phaseConfig) {
    const phaseState = state.phases[phase.id] ?? {
      progress: 0,
      completed: false,
      failuresInRow: 0,
    };
    const failureValue = Number(formData[`${phase.id}FailuresInRow`]);
    if (Number.isFinite(failureValue)) {
      phaseState.failuresInRow = Math.max(0, failureValue);
    }

    if (phase.id === "phase1") {
      const skillProgress = buildEmptySkillProgress(phase);
      for (const key of getPhaseSkillList(phase)) {
        const value = Number(formData[`phase1Skill_${key}`]);
        if (Number.isFinite(value)) {
          const target = getPhaseSkillTarget(phase, key);
          skillProgress[key] = clampNumber(value, 0, target);
        }
      }
      phaseState.skillProgress = skillProgress;
      phaseState.progress = getPhase1TotalProgress({
        ...phase,
        skillProgress,
      });
    } else {
      const progressValue = Number(formData[`${phase.id}Progress`]);
      if (Number.isFinite(progressValue)) {
        phaseState.progress = clampNumber(progressValue, 0, phase.target ?? 0);
      }
    }

    if (formData[`${phase.id}Completed`] !== undefined) {
      phaseState.completed = Boolean(formData[`${phase.id}Completed`]);
    } else {
      phaseState.completed = isPhaseComplete({ ...phase, ...phaseState });
    }

    state.phases[phase.id] = phaseState;
  }
}

function clampNumber(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  if (Number.isFinite(max)) {
    return Math.min(Math.max(numeric, min), max);
  }
  return Math.max(numeric, min);
}

function buildTrackerData({
  actor = null,
  showActorSelect = true,
  embedded = false,
} = {}) {
  const state = getWorldState();
  const activePhase = getActivePhase(state);
  const activePhaseNumber = getPhaseNumber(activePhase.id);
  const skillAliases = getSkillAliases();
  const headerLabel = getHeaderLabel();
  const lastActorId = showActorSelect
    ? game.settings.get(MODULE_ID, "lastActorId")
    : actor?.id ?? "";
  const actors = showActorSelect
    ? game.actors
        .filter((entry) => entry.type === "character")
        .map((entry) => ({ id: entry.id, name: entry.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const skillChoices = getPhaseSkillChoices(activePhase, skillAliases).map(
    (choice) => ({
      ...choice,
      dc: getPhaseDc(activePhase, choice.key),
    })
  );
  const skillLabels = skillChoices.reduce((acc, choice) => {
    acc[choice.key] = choice.label;
    return acc;
  }, {});
  const skillTitles = skillChoices.reduce((acc, choice) => {
    acc[choice.key] = getNextSkillTitle(activePhase, choice.key, skillLabels);
    return acc;
  }, {});
  const forcedSkillChoice = getForcedSkillChoice(activePhase);
  const selectedSkillKey = forcedSkillChoice || skillChoices[0]?.key || "";
  const selectedSkillTitle = getNextSkillTitle(
    activePhase,
    selectedSkillKey,
    skillLabels
  );
  const phase1Penalty = getPhase1PenaltyInfo(activePhase, skillLabels);

  const progressPercent =
    activePhase.target > 0
      ? Math.min(
          100,
          Math.round((activePhase.progress / activePhase.target) * 100)
        )
      : 0;
  const forcedSkillLabel = forcedSkillChoice
    ? getSkillLabel(resolveSkillKey(forcedSkillChoice, skillAliases))
    : "";
  const canRoll = !activePhase.completed;
  const phase1Skills =
    activePhase.id === "phase1"
      ? buildPhase1SkillData(activePhase, skillLabels)
      : [];

  return {
    state,
    activePhase,
    activePhaseNumber,
    skillLabels,
    skillTitles,
    skillChoices,
    actors,
    lastActorId,
    progressPercent,
    forcedSkillChoice,
    forcedSkillLabel,
    canRoll,
    showActorSelect,
    embedded,
    phase1Skills,
    headerLabel,
    intervalLabel: getIntervalLabel(),
    selectedSkillTitle,
    phase1Penalty,
    sheetActor: actor ? { id: actor.id, name: actor.name } : null,
  };
}

function attachTrackerListeners(html, { render, actor } = {}) {
  const root = html.find("[data-drep-root]").first();
  const scope = root.length ? root : html;

  scope.find(".always-interactive").each((_, element) => {
    if (element?.dataset?.drepDisabled === "true") return;
    element.disabled = false;
  });
  debugLog("Listeners attached", {
    rollButtons: scope.find("[data-drep-action='roll-interval']").length,
  });

  scope.find("[data-drep-action='roll-interval']").on("click", (event) => {
    event.preventDefault();
    debugLog("Roll click detected");
    handleRoll(scope, { render, actorOverride: actor });
  });

  scope.find("[data-drep-name='skillChoice']").on("change", (event) => {
    const selected = $(event.currentTarget).val();
    const title = scope.find(`[data-drep-skill-title='${selected}']`).data("title") || "";
    if (!title) return;
    scope.find(".drep-skill-title").text(`Current Focus: ${title}`);
  });
}

async function handleRoll(root, { render, actorOverride } = {}) {
  const state = getWorldState();
  const activePhase = getActivePhase(state);
  if (activePhase.completed) {
    ui.notifications.warn("Downtime Reputation: this phase is already complete.");
    return;
  }

  const actor = resolveActor(root, actorOverride);
  if (!actor) return;

  await game.settings.set(MODULE_ID, "lastActorId", actor.id);

  const skillChoice = root.find("[data-drep-name='skillChoice']").val();

  await runIntervalRoll({
    actor,
    skillChoice,
  });

  if (render) render();
}

function resolveActor(root, actorOverride) {
  if (actorOverride) return actorOverride;
  const actorId = root.find("[data-drep-name='actorId']").val();
  if (!actorId) {
    ui.notifications.warn("Downtime Reputation: select an actor.");
    return null;
  }
  const actor = game.actors.get(actorId);
  if (!actor) {
    ui.notifications.warn("Downtime Reputation: actor not found.");
    return null;
  }
  return actor;
}

function resolveActorFromContext(context) {
  if (!context) return null;
  return (
    context.actor ??
    context.document ??
    context.app?.actor ??
    context.sheet?.actor ??
    context.context?.actor ??
    null
  );
}

async function runIntervalRoll({ actor, skillChoice }) {
  const skillAliases = getSkillAliases();
  const state = getWorldState();
  const activePhase = getActivePhase(state);
  if (activePhase.completed) return;

  const forcedSkillChoice = getForcedSkillChoice(activePhase);
  const allowedSkills = getPhaseSkillList(activePhase);
  const resolvedSkillChoice = forcedSkillChoice
    ? forcedSkillChoice
    : skillChoice || allowedSkills[0] || getDefaultSkills()[0] || "";
  const finalSkillChoice = allowedSkills.includes(resolvedSkillChoice)
    ? resolvedSkillChoice
    : allowedSkills[0] || getDefaultSkills()[0] || "";
  const skillKey = resolveSkillKey(finalSkillChoice, skillAliases);
  const skillLabel = getSkillLabel(skillKey);

  const dc = getPhaseDc(activePhase, finalSkillChoice);
  const roll = await rollSkill(actor, skillKey, false);
  if (!roll) return;

  const total = roll.total ?? roll._total ?? 0;
  const success = total >= dc;

  state.checkCount = Number.isFinite(state.checkCount) ? state.checkCount + 1 : 1;

  let progressGained = 0;
  let criticalBonusApplied = false;
  let narrative = null;
  let contextNote = "";
  if (success) {
    if (activePhase.id === "phase1") {
      const phase1Progress = getPhase1SkillProgress(activePhase);
      const currentValue = phase1Progress[finalSkillChoice] ?? 0;
      const maxValue = getPhaseSkillTarget(activePhase, finalSkillChoice);
      if (currentValue < maxValue) {
        progressGained = 1;
        let nextValue = Math.min(currentValue + 1, maxValue);
        if (
          activePhase.allowCriticalBonus &&
          state.criticalBonusEnabled &&
          isCriticalSuccess(roll)
        ) {
          const boosted = Math.min(nextValue + 1, maxValue);
          if (boosted > nextValue) {
            nextValue = boosted;
            progressGained += 1;
            criticalBonusApplied = true;
          }
        }
        phase1Progress[finalSkillChoice] = nextValue;
        activePhase.skillProgress = phase1Progress;
        narrative = getPhase1Narrative(
          activePhase,
          finalSkillChoice,
          activePhase.skillProgress
        );
        contextNote = getPhase1ContextNote(
          finalSkillChoice,
          activePhase.skillProgress,
          progressGained > 0
        );
      }
      activePhase.progress = getPhase1TotalProgress(activePhase);
      activePhase.completed = isPhaseComplete(activePhase);
      activePhase.failuresInRow = 0;
    } else {
      progressGained = 1;
      if (
        activePhase.allowCriticalBonus &&
        state.criticalBonusEnabled &&
        isCriticalSuccess(roll)
      ) {
        progressGained += 1;
        criticalBonusApplied = true;
      }
      activePhase.progress = Math.min(
        activePhase.progress + progressGained,
        activePhase.target
      );
      activePhase.failuresInRow = 0;
      narrative =
        activePhase.progressNarrative?.[activePhase.progress] ?? null;
    }
  } else if (hasForcedSkillRule(activePhase)) {
    activePhase.failuresInRow += 1;
  }

  const failureLine = success
    ? null
    : pickFailureLine(activePhase.failureLines);
  const failureEvent = Boolean(!success && activePhase.failureEvents);

  state.phases[activePhase.id] = {
    progress: activePhase.progress,
    completed: activePhase.completed,
    failuresInRow: activePhase.failuresInRow,
    skillProgress: activePhase.skillProgress ?? undefined,
  };

  if (isPhaseComplete(activePhase)) {
    state.phases[activePhase.id].completed = true;
    await handleCompletion(state, activePhase, actor);
  }

  state.log.unshift({
    checkNumber: state.checkCount,
    phaseId: activePhase.id,
    phaseName: activePhase.name,
    actorId: actor.id,
    actorName: actor.name,
    skillChoice: finalSkillChoice,
    skillKey,
    skillLabel,
    dc,
    total,
    success,
    progressGained,
    criticalBonusApplied,
    narrativeTitle: narrative?.title ?? "",
    narrativeText: narrative?.text ?? "",
    contextNote,
    skillProgress: activePhase.skillProgress ?? undefined,
    failureLine: failureLine ?? "",
    failureEvent,
    timestamp: Date.now(),
  });
  state.log = state.log.slice(0, 50);

  await setWorldState(state);
  await postSummaryMessage({
    actor,
    skillLabel,
    dc,
    total,
    success,
    progress: state.phases[activePhase.id].progress,
    progressTarget: activePhase.target,
    progressGained,
    criticalBonusApplied,
    narrative,
    contextNote,
    failureLine,
    failureEvent,
    forcedSkillChoice,
    forcedSkillLabel: forcedSkillChoice
      ? getSkillLabel(resolveSkillKey(forcedSkillChoice, skillAliases))
      : "",
    phase1SkillProgress: activePhase.skillProgress,
    phase1SkillTargets: activePhase.skillTargets,
    phase1SkillList: getPhaseSkillList(activePhase),
  });
}

async function postSummaryMessage({
  actor,
  skillLabel,
  dc,
  total,
  success,
  progress,
  progressTarget,
  progressGained,
  criticalBonusApplied,
  narrative,
  contextNote,
  failureLine,
  failureEvent,
  forcedSkillChoice,
  forcedSkillLabel,
  phase1SkillProgress,
  phase1SkillTargets,
  phase1SkillList,
}) {
  const outcome = success ? "Success" : "Failure";
  const progressLine = success
    ? `<p><strong>Progress:</strong> ${progress} / ${progressTarget}${
        progressGained ? ` (+${progressGained})` : ""
      }</p>`
    : `<p><strong>Progress:</strong> ${progress} / ${progressTarget}</p>`;
  const phase1Line = buildPhase1ProgressLine(
    phase1SkillProgress,
    phase1SkillTargets,
    phase1SkillList
  );
  const phase1Block = phase1Line
    ? `<p><strong>Phase 1:</strong> ${phase1Line}</p>`
    : "";
  const criticalLine = criticalBonusApplied
    ? "<p><strong>Critical:</strong> Bonus progress applied.</p>"
    : "";
  const forcedNote = forcedSkillChoice
    ? `<p><strong>Note:</strong> Two failures in a row. ${forcedSkillLabel} was required.</p>`
    : "";
  const narrativeBlock = narrative
    ? `<div class="narrative"><strong>${narrative.title}:</strong> ${narrative.text}</div>`
    : "";
  const contextBlock = contextNote
    ? `<div class="narrative"><strong>Note:</strong> ${contextNote}</div>`
    : "";
  const failureBlock = failureLine
    ? `<div class="narrative"><strong>${
        failureEvent ? "Event" : "Strain"
      }:</strong> ${failureLine}</div>`
    : "";

  const content = `
      <div class="drep-chat">
        <h3>${getIntervalLabel()} Check: ${skillLabel}</h3>
        <p><strong>Actor:</strong> ${actor.name}</p>
        <p><strong>DC:</strong> ${dc}</p>
        <p><strong>Result:</strong> ${total} (${outcome})</p>
        ${progressLine}
        ${phase1Block}
        ${criticalLine}
        ${forcedNote}
        ${narrativeBlock}
        ${contextBlock}
        ${failureBlock}
      </div>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
  });
}

async function handleCompletion(state, activePhase, actor) {
  if (activePhase.id !== "phase3") {
    await setWorldState(state);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content:
        "<div class=\"drep-chat\"><h3>Phase Complete</h3><p>Next phase is now available.</p></div>",
    });
    return;
  }

  const existing = state.journalId && game.journal.get(state.journalId);
  if (!existing) {
    const entry = await JournalEntry.create({
      name: "The Shared Ember",
      content: `
          <h2>The Shared Ember</h2>
          <p>The Shared Ember exists. Ash-Twenty-Seven emerges, and the Cogs now have a safe place.</p>
        `,
      folder: null,
    });
    state.journalId = entry?.id ?? "";
  }

  await setWorldState(state);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content:
      "<div class=\"drep-chat\"><h3>Phase Complete</h3><p>Journal entry created: The Shared Ember.</p></div>",
  });
}

function getWorldState() {
  const stored = game.settings.get(MODULE_ID, "projectState");
  const state = foundry.utils.mergeObject(DEFAULT_STATE, stored ?? {}, {
    inplace: false,
    overwrite: true,
  });
  if (!Number.isFinite(state.checkCount)) {
    if (Number.isFinite(stored?.windowDaysUsed)) {
      state.checkCount = stored.windowDaysUsed;
    } else if (Number.isFinite(stored?.daysElapsed)) {
      state.checkCount = stored.daysElapsed;
    } else if (Array.isArray(stored?.log) && stored.log.length) {
      const maxLogged = stored.log.reduce((max, entry) => {
        const value = Number(entry?.checkNumber ?? entry?.windowDay ?? 0);
        return Number.isFinite(value) ? Math.max(max, value) : max;
      }, 0);
      state.checkCount = maxLogged;
    } else {
      state.checkCount = 0;
    }
  }
  const phaseConfig = getPhaseConfig();
  state.phases = state.phases ?? {};
  for (const phase of phaseConfig) {
    const fallback = { progress: 0, completed: false, failuresInRow: 0 };
    state.phases[phase.id] = foundry.utils.mergeObject(
      fallback,
      state.phases[phase.id] ?? {},
      { inplace: false, overwrite: true }
    );
    if (phase.id === "phase1") {
      const existing = state.phases[phase.id];
      if (!existing.skillProgress) {
        existing.skillProgress = migratePhase1Progress(
          existing.progress ?? 0,
          phase
        );
      }
      existing.progress = getPhase1TotalProgress(existing);
      existing.completed = isPhaseComplete({ ...phase, ...existing });
    } else if (state.phases[phase.id].progress >= phase.target) {
      state.phases[phase.id].completed = true;
    }
  }
  if (!stored?.phases && Number.isFinite(stored?.progress)) {
    const phase1 = state.phases.phase1;
    const phase1Config = getPhaseDefinition("phase1");
    const target = phase1Config?.target ?? 0;
    phase1.progress = target
      ? Math.min(stored.progress, target)
      : stored.progress;
    phase1.completed = Boolean(stored.completed);
    if (target && phase1.progress >= target) {
      phase1.completed = true;
    }
    phase1.skillProgress = migratePhase1Progress(phase1.progress, phase1Config);
  }
  if (!phaseConfig.some((phase) => phase.id === state.activePhaseId)) {
    state.activePhaseId = getFirstPhaseId();
  }
  if (!isPhaseUnlocked(state.activePhaseId, state)) {
    state.activePhaseId =
      getNextIncompletePhaseId(state) ?? getFirstPhaseId();
  }
  return state;
}

function getActivePhase(state) {
  const definition = getPhaseDefinition(state.activePhaseId) ?? {
    ...DEFAULT_PHASE_CONFIG[0],
  };
  const phaseState = state.phases[definition.id] ?? {
    progress: 0,
    completed: false,
    failuresInRow: 0,
  };
  const merged = {
    ...definition,
    ...phaseState,
  };
  if (definition.id === "phase1") {
    merged.skillProgress = getPhase1SkillProgress(merged);
    merged.progress = getPhase1TotalProgress(merged);
    merged.completed = isPhaseComplete(merged);
  }
  return merged;
}

function getPhaseDefinition(phaseId) {
  return getPhaseConfig().find((phase) => phase.id === phaseId);
}

function getPhaseNumber(phaseId) {
  const config = getPhaseConfig();
  const index = config.findIndex((phase) => phase.id === phaseId);
  return index >= 0 ? index + 1 : 1;
}

function getFirstPhaseId() {
  return getPhaseConfig()[0]?.id ?? "phase1";
}

function getDefaultSkills() {
  return DEFAULT_PHASE_CONFIG[0]?.skills ?? [];
}

function getPhaseSkillList(phase) {
  if (Array.isArray(phase?.skills) && phase.skills.length) {
    return phase.skills;
  }
  return getDefaultSkills();
}

function getPhaseSkillChoices(phase, skillAliases) {
  const skills = getPhaseSkillList(phase);
  return skills.map((key) => {
    const resolvedKey = resolveSkillKey(key, skillAliases);
    return {
      key,
      label: getSkillLabel(resolvedKey),
    };
  });
}

function buildEmptySkillProgress(phase) {
  const progress = {};
  for (const key of getPhaseSkillList(phase)) {
    progress[key] = 0;
  }
  return progress;
}

function getPhaseSkillTarget(phase, skillChoice) {
  const target = phase?.skillTargets?.[skillChoice];
  if (Number.isFinite(target) && target >= 0) return target;
  const legacy = Number(phase?.skillTarget);
  if (Number.isFinite(legacy) && legacy >= 0) return legacy;
  return 2;
}

function getPhaseTotalTarget(phase) {
  const skills = getPhaseSkillList(phase);
  return skills.reduce(
    (total, key) => total + getPhaseSkillTarget(phase, key),
    0
  );
}

function getForcedSkillChoice(phase) {
  if (!phase) return "";
  const forced = phase.forceSkillAfterFailures ?? "";
  if (!forced) return "";
  if (Number(phase.failuresInRow) >= 2) return forced;
  return "";
}

function hasForcedSkillRule(phase) {
  return Boolean(phase?.forceSkillAfterFailures);
}

function getPhase1SkillProgress(phase) {
  const skills = getPhaseSkillList(phase);
  const progress = {};
  for (const key of skills) {
    progress[key] = Number(phase?.skillProgress?.[key] ?? 0);
  }
  return progress;
}

function getPhase1TotalProgress(phase) {
  const progress = getPhase1SkillProgress(phase);
  return getPhaseSkillList(phase).reduce(
    (total, key) =>
      total + Math.min(progress[key] ?? 0, getPhaseSkillTarget(phase, key)),
    0
  );
}

function buildPhase1SkillData(phase, labels) {
  const progress = getPhase1SkillProgress(phase);
  return getPhaseSkillList(phase).map((key) => {
    const target = getPhaseSkillTarget(phase, key);
    const value = Math.min(progress[key] ?? 0, target);
    const percent = target > 0 ? Math.round((value / target) * 100) : 0;
    return {
      key,
      label: labels[key] ?? key,
      value,
      target,
      percent,
    };
  });
}

function getPhaseDc(phase, skillChoice) {
  if (!phase) return 13;
  const skills = getPhaseSkillList(phase);
  if (!skills.includes(skillChoice)) return 13;
  if (phase.id === "phase1") {
    const progress = getPhase1SkillProgress(phase);
    const target = getPhaseSkillTarget(phase, skillChoice);
    const maxIndex = Math.max(0, target - 1);
    const stepIndex = Math.min(progress[skillChoice] ?? 0, maxIndex);
    const steps = phase.skillDcSteps?.[skillChoice];
    let base = 13;
    if (Array.isArray(steps) && steps.length) {
      base = Number(steps[stepIndex] ?? steps[steps.length - 1] ?? 13);
    }
    const penalty = getPhase1OtherSkillPenalty(phase, skillChoice);
    return base + penalty;
  }
  const dc = phase.skillDcs?.[skillChoice];
  if (Number.isFinite(dc)) return dc;
  return 15;
}

function getPhase1Narrative(phase, skillChoice, skillProgress) {
  if (!skillProgress || !phase) return null;
  const value = skillProgress[skillChoice];
  return phase.skillNarratives?.[skillChoice]?.[value] ?? null;
}

function getPhase1ContextNote() {
  return "";
}

function getPhase1PenaltySkillKey(phase) {
  const skills = getPhaseSkillList(phase);
  if (skills.includes("insight")) return "insight";
  return skills[0] ?? "";
}

function getPhase1OtherSkillPenalty(phase, skillChoice) {
  if (!phase || phase.id !== "phase1") return 0;
  const penaltySkill = getPhase1PenaltySkillKey(phase);
  if (!penaltySkill || skillChoice === penaltySkill) return 0;
  const progress = getPhase1SkillProgress(phase);
  const target = getPhaseSkillTarget(phase, penaltySkill);
  const current = Number(progress[penaltySkill] ?? 0);
  return Math.max(0, target - current);
}

function getPhase1PenaltyInfo(phase, skillLabels) {
  if (!phase || phase.id !== "phase1") return "";
  const penaltySkill = getPhase1PenaltySkillKey(phase);
  if (!penaltySkill) return "";
  const label = skillLabels?.[penaltySkill] ?? penaltySkill;
  const penalty = getPhase1OtherSkillPenalty(phase, "");
  if (!penalty) return "";
  return `+${penalty} DC to other checks until ${label} reaches its target.`;
}

function getNextSkillTitle(phase, skillChoice, skillLabels) {
  if (!phase || !skillChoice) return "";
  if (phase.id !== "phase1") {
    return skillLabels?.[skillChoice] ?? skillChoice;
  }
  const progress = getPhase1SkillProgress(phase);
  const currentValue = Number(progress[skillChoice] ?? 0);
  const target = getPhaseSkillTarget(phase, skillChoice);
  if (currentValue >= target) {
    return skillLabels?.[skillChoice] ?? skillChoice;
  }
  const narrative =
    phase.skillNarratives?.[skillChoice]?.[currentValue + 1] ?? null;
  return narrative?.title ?? skillLabels?.[skillChoice] ?? skillChoice;
}

function recalculateStateFromLog(state) {
  const phaseConfig = getPhaseConfig();
  const skillAliases = getSkillAliases();
  const rebuilt = {
    ...state,
    phases: {},
    log: [],
    checkCount: 0,
  };

  for (const phase of phaseConfig) {
    rebuilt.phases[phase.id] = {
      progress: 0,
      completed: false,
      failuresInRow: 0,
      skillProgress: phase.id === "phase1" ? buildEmptySkillProgress(phase) : undefined,
    };
  }

  const sorted = [...(state.log ?? [])].sort(
    (a, b) => getLogSortValue(a) - getLogSortValue(b)
  );
  const rebuiltLog = [];
  for (const entry of sorted) {
    rebuiltLog.push(
      applyLogEntryToState(entry, rebuilt, phaseConfig, skillAliases)
    );
  }

  for (const phase of phaseConfig) {
    const phaseState = rebuilt.phases[phase.id];
    phaseState.completed = isPhaseComplete({ ...phase, ...phaseState });
  }

  rebuilt.log = rebuiltLog.sort(
    (a, b) => getLogSortValue(b) - getLogSortValue(a)
  );
  rebuilt.checkCount = deriveCheckCount(rebuilt.log);
  if (!phaseConfig.some((phase) => phase.id === rebuilt.activePhaseId)) {
    rebuilt.activePhaseId = getFirstPhaseId();
  }
  if (!isPhaseUnlocked(rebuilt.activePhaseId, rebuilt)) {
    rebuilt.activePhaseId =
      getNextIncompletePhaseId(rebuilt) ?? getFirstPhaseId();
  }
  return rebuilt;
}

function applyLogEntryToState(entry, state, phaseConfig, skillAliases) {
  const phase =
    phaseConfig.find((candidate) => candidate.id === entry.phaseId) ??
    phaseConfig[0];
  const phaseState = state.phases[phase.id];
  const skillChoice = resolveSkillChoice(entry, phase, skillAliases);
  const skillKey = entry.skillKey ?? resolveSkillKey(skillChoice, skillAliases);
  const skillLabel = getSkillLabel(skillKey);
  const success = Boolean(entry.success);
  const dc = getPhaseDc(phase, skillChoice);

  let progressGained = 0;
  let criticalBonusApplied = Boolean(entry.criticalBonusApplied);
  let narrative = null;
  let contextNote = "";
  let failureLine = entry.failureLine ?? "";
  let failureEvent = Boolean(entry.failureEvent);

  if (success) {
    if (phase.id === "phase1") {
      const skillTarget = getPhaseSkillTarget(phase, skillChoice);
      const currentValue = phaseState.skillProgress?.[skillChoice] ?? 0;
      if (currentValue < skillTarget) {
        progressGained = 1;
        let nextValue = Math.min(currentValue + 1, skillTarget);
        if (phase.allowCriticalBonus && criticalBonusApplied) {
          const boosted = Math.min(nextValue + 1, skillTarget);
          if (boosted > nextValue) {
            nextValue = boosted;
            progressGained += 1;
          }
        }
        phaseState.skillProgress[skillChoice] = nextValue;
        narrative = getPhase1Narrative(
          phase,
          skillChoice,
          phaseState.skillProgress
        );
        contextNote = getPhase1ContextNote(
          skillChoice,
          phaseState.skillProgress,
          progressGained > 0
        );
      } else {
        criticalBonusApplied = false;
      }
      phaseState.progress = getPhase1TotalProgress({
        ...phase,
        skillProgress: phaseState.skillProgress,
      });
    } else {
      if (phaseState.progress < phase.target) {
        progressGained = 1;
        let nextValue = Math.min(phaseState.progress + 1, phase.target);
        if (phase.allowCriticalBonus && criticalBonusApplied) {
          const boosted = Math.min(nextValue + 1, phase.target);
          if (boosted > nextValue) {
            nextValue = boosted;
            progressGained += 1;
          }
        }
        phaseState.progress = nextValue;
        narrative = phase.progressNarrative?.[phaseState.progress] ?? null;
      } else {
        criticalBonusApplied = false;
      }
    }
    phaseState.failuresInRow = 0;
    failureLine = "";
    failureEvent = false;
  } else {
    criticalBonusApplied = false;
    if (hasForcedSkillRule(phase)) {
      phaseState.failuresInRow += 1;
    }
    if (!failureLine) {
      failureLine = pickFailureLine(phase.failureLines);
    }
    failureEvent = Boolean(phase.failureEvents);
  }

  return {
    ...entry,
    phaseId: phase.id,
    phaseName: phase.name,
    skillChoice,
    skillKey,
    skillLabel,
    dc,
    success,
    progressGained,
    criticalBonusApplied,
    narrativeTitle: narrative?.title ?? "",
    narrativeText: narrative?.text ?? "",
    contextNote,
    failureLine,
    failureEvent,
  };
}

function resolveSkillChoice(entry, phase, skillAliases) {
  const allowed = getPhaseSkillList(phase);
  if (entry.skillChoice && allowed.includes(entry.skillChoice)) {
    return entry.skillChoice;
  }
  const key = entry.skillKey;
  if (key) {
    for (const choice of allowed) {
      if (resolveSkillKey(choice, skillAliases) === key) return choice;
    }
  }
  return allowed[0] ?? getDefaultSkills()[0] ?? "";
}

function getLogSortValue(entry) {
  const value = Number(entry?.checkNumber ?? entry?.timestamp ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function deriveCheckCount(log) {
  let maxValue = 0;
  for (const entry of log ?? []) {
    const value = Number(entry?.checkNumber ?? 0);
    if (Number.isFinite(value)) {
      maxValue = Math.max(maxValue, value);
    }
  }
  return maxValue || (log?.length ?? 0);
}

function resetPhaseState(state) {
  state.phases = state.phases ?? {};
  for (const phase of getPhaseConfig()) {
    state.phases[phase.id] = {
      progress: 0,
      completed: false,
      failuresInRow: 0,
      skillProgress:
        phase.id === "phase1" ? buildEmptySkillProgress(phase) : undefined,
    };
  }
}

function getNextIncompletePhaseId(state) {
  for (const phase of getPhaseConfig()) {
    if (!state.phases[phase.id]?.completed) return phase.id;
  }
  return "";
}

function isPhaseUnlocked(phaseId, state) {
  const config = getPhaseConfig();
  const index = config.findIndex((phase) => phase.id === phaseId);
  if (index <= 0) return true;
  for (let i = 0; i < index; i += 1) {
    const prevId = config[i].id;
    if (!state.phases[prevId]?.completed) return false;
  }
  return true;
}

function isPhaseComplete(phase) {
  if (!phase) return false;
  if (phase.id === "phase1") {
    const progress = getPhase1SkillProgress(phase);
    return getPhaseSkillList(phase).every(
      (key) => (progress[key] ?? 0) >= getPhaseSkillTarget(phase, key)
    );
  }
  return phase.progress >= phase.target;
}

function migratePhase1Progress(total, phase) {
  let remaining = Math.max(0, Number(total) || 0);
  const progress = buildEmptySkillProgress(phase);
  const skills = getPhaseSkillList(phase);
  for (const key of skills) {
    if (remaining <= 0) break;
    const target = getPhaseSkillTarget(phase, key);
    const value = Math.min(target, remaining);
    progress[key] = value;
    remaining -= value;
  }
  return progress;
}

function buildPhase1ProgressLine(progress, targets, skills) {
  if (!progress || !targets) return "";
  const list = Array.isArray(skills) && skills.length ? skills : getDefaultSkills();
  const parts = list.map((key) => {
    const target = Number(targets?.[key] ?? 0);
    const value = Math.min(progress[key] ?? 0, target);
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    return `${label} ${value}/${target}`;
  });
  return parts.join(", ");
}

async function setWorldState(state) {
  if (!game.user?.isGM) {
    requestStateUpdate(state);
    return;
  }
  await game.settings.set(MODULE_ID, "projectState", state);
  notifyStateUpdated();
}

function getSkillAliases() {
  let stored = game.settings.get(MODULE_ID, "skillAliases");
  if (!stored) {
    try {
      stored = game.settings.get(MODULE_ID, "skillKeys");
    } catch (error) {
      stored = null;
    }
  }
  return foundry.utils.mergeObject(DEFAULT_SKILL_ALIASES, stored ?? {}, {
    inplace: false,
    overwrite: true,
  });
}

function resolveSkillKey(skillChoice, skillAliases) {
  if (skillAliases && typeof skillAliases[skillChoice] === "string") {
    return skillAliases[skillChoice];
  }
  return skillChoice;
}

function getHeaderLabel() {
  return game.settings.get(MODULE_ID, "headerLabel") || DEFAULT_HEADER_LABEL;
}

function getTabLabel() {
  return game.settings.get(MODULE_ID, "tabLabel") || DEFAULT_TAB_LABEL;
}

function getIntervalLabel() {
  return (
    game.settings.get(MODULE_ID, "intervalLabel") || DEFAULT_INTERVAL_LABEL
  );
}

function getRestrictedActorUuids() {
  const stored = game.settings.get(MODULE_ID, RESTRICTED_ACTORS_SETTING);
  if (!Array.isArray(stored)) return [];
  return stored.filter((uuid) => typeof uuid === "string" && uuid.trim().length);
}

function parseRestrictedActorUuids(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((value) => String(value ?? "").trim())
      .filter((value) => value.length);
  }
  return String(raw)
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter((value) => value.length);
}

function isActorAllowed(actor) {
  const restricted = getRestrictedActorUuids();
  if (!restricted.length) return true;
  if (!actor?.uuid) return false;
  return restricted.includes(actor.uuid);
}

function hideDowntimeTab($html) {
  if (!$html?.length) return;
  $html.find(`.tabs [data-tab='${SHEET_TAB_ID}']`).remove();
  $html.find(`[data-tab='${SHEET_TAB_ID}'].tab`).remove();
  $html.find(`[data-tab='${SHEET_TAB_ID}'].tab-body`).remove();
  $html
    .find("[data-tab], [data-tab-id], [data-tabid], [data-tab-target]")
    .each((_, element) => {
      const tab =
        element.dataset?.tab ??
        element.dataset?.tabId ??
        element.dataset?.tabid ??
        element.dataset?.tabTarget ??
        "";
      if (tab === SHEET_TAB_ID) {
        $(element).remove();
      }
    });
}

function sanitizeLabel(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function getSkillOptions() {
  const skills = CONFIG.DND5E?.skills ?? {};
  return Object.entries(skills)
    .map(([key, labelKey]) => ({
      key,
      label: localizeSkillLabel(labelKey, key),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function getSkillLabel(skillKey) {
  const skills = CONFIG.DND5E?.skills ?? {};
  const labelKey = skills[skillKey];
  return localizeSkillLabel(labelKey, skillKey);
}

function localizeSkillLabel(labelKey, fallback) {
  if (!labelKey) return fallback;
  if (typeof labelKey === "string") {
    return game.i18n.localize(labelKey);
  }
  if (typeof labelKey === "object") {
    const label = labelKey.label || labelKey.name;
    if (typeof label === "string") {
      return game.i18n.localize(label);
    }
  }
  return String(labelKey ?? fallback);
}

async function rollSkill(actor, skillKey, advantage) {
  if (!actor?.rollSkill) {
    ui.notifications.error("Downtime Reputation: actor cannot roll skills.");
    return null;
  }
  try {
    if (game.user?.isGM && actor.hasPlayerOwner) {
      return await rollSkillDirect(actor, skillKey, advantage);
    }
    const config = { skill: skillKey };
    if (advantage) {
      config.advantage = true;
    }
    const rolls = await actor.rollSkill(
      config,
      { fastForward: true },
      {}
    );
    if (Array.isArray(rolls)) {
      return rolls[0] ?? null;
    }
    return rolls ?? null;
  } catch (error) {
    console.error(error);
    if (game.user?.isGM && actor.hasPlayerOwner) {
      return rollSkillDirect(actor, skillKey, advantage);
    }
    ui.notifications.error("Downtime Reputation: roll failed.");
    return null;
  }
}

async function rollSkillDirect(actor, skillKey, advantage) {
  const skillData = actor.system?.skills?.[skillKey];
  const mod = Number(skillData?.total ?? skillData?.mod ?? 0);
  const formula = advantage ? "2d20kh + @mod" : "1d20 + @mod";
  const roll = await new Roll(formula, { mod }).evaluate({ async: true });
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${getSkillLabel(skillKey)} Check`,
  });
  return roll;
}

function isCriticalSuccess(roll) {
  const die = roll?.dice?.[0];
  if (!die || !die.results?.length) return false;
  const result =
    die.results[0]?.result ?? die.results[0]?.value ?? die.total ?? 0;
  return die.faces && result === die.faces;
}

function pickFailureLine(lines) {
  if (!lines || !lines.length) return "";
  return lines[Math.floor(Math.random() * lines.length)];
}

function registerSheetTab() {
  if (game.system?.id !== "dnd5e") return false;
  const sheetClass =
    globalThis.dnd5e?.applications?.actor?.CharacterActorSheet ??
    CONFIG.DND5E?.applications?.actor?.CharacterActorSheet ??
    null;
  if (!sheetClass) {
    debugLog("Character sheet class not found");
    return false;
  }

  const tabs = Array.isArray(sheetClass.TABS) ? [...sheetClass.TABS] : [];
  const tabLabel = getTabLabel();
  if (!tabs.some((tab) => tab.tab === SHEET_TAB_ID)) {
    tabs.push({
      tab: SHEET_TAB_ID,
      label: tabLabel,
      icon: "fas fa-fire",
    });
    sheetClass.TABS = tabs;
    debugLog("Registered downtime tab", { sheetClass: sheetClass.name });
  } else {
    sheetClass.TABS = tabs.map((tab) =>
      tab.tab === SHEET_TAB_ID ? { ...tab, label: tabLabel } : tab
    );
  }

  const parts = { ...(sheetClass.PARTS ?? {}) };
  if (!parts[SHEET_TAB_ID]) {
    parts[SHEET_TAB_ID] = {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "modules/downtime-rep/templates/downtime-rep.hbs",
      scrollable: [""],
    };
    sheetClass.PARTS = parts;
    debugLog("Registered downtime part", { sheetClass: sheetClass.name });
  }

  return true;
}

function notifyStateUpdated() {
  if (!game?.socket || !game.user?.isGM) return;
  game.socket.emit(`module.${MODULE_ID}`, {
    type: SOCKET_EVENT_STATE,
    userId: game.user.id,
  });
}

function requestStateUpdate(state) {
  if (!game?.socket) return;
  game.socket.emit(`module.${MODULE_ID}`, {
    type: SOCKET_EVENT_REQUEST,
    userId: game.user?.id,
    state,
  });
  ui.notifications.info("Downtime Reputation: update sent to GM.");
}

async function applyRequestedState(state) {
  if (!state) return;
  const merged = foundry.utils.mergeObject(DEFAULT_STATE, state, {
    inplace: false,
    overwrite: true,
  });
  await setWorldState(merged);
  rerenderCharacterSheets();
  rerenderSettingsApps();
}

function handleSocketMessage(payload) {
  if (!payload) return;
  if (payload.type === SOCKET_EVENT_STATE) {
    if (payload.userId && payload.userId === game.user?.id) return;
    debugLog("Received state update notification");
    rerenderCharacterSheets();
    rerenderSettingsApps();
    return;
  }
  if (payload.type === SOCKET_EVENT_REQUEST) {
    if (!game.user?.isGM) return;
    debugLog("Received state update request", { userId: payload.userId });
    applyRequestedState(payload.state);
  }
}

function refreshSheetTabLabel() {
  updateSheetTabLabel();
  updateTidyTabLabel();
  rerenderCharacterSheets();
}

function updateSheetTabLabel() {
  if (game.system?.id !== "dnd5e") return;
  const sheetClass =
    globalThis.dnd5e?.applications?.actor?.CharacterActorSheet ??
    CONFIG.DND5E?.applications?.actor?.CharacterActorSheet ??
    null;
  if (!sheetClass || !Array.isArray(sheetClass.TABS)) return;

  const tabLabel = getTabLabel();
  let changed = false;
  const updatedTabs = sheetClass.TABS.map((tab) => {
    if (tab.tab !== SHEET_TAB_ID) return tab;
    if (tab.label === tabLabel) return tab;
    changed = true;
    return { ...tab, label: tabLabel };
  });

  if (changed) {
    sheetClass.TABS = updatedTabs;
  }
}

function createTidyTab(api) {
  return new api.models.HandlebarsTab({
    title: getTabLabel(),
    iconClass: "fas fa-fire",
    tabId: SHEET_TAB_ID,
    path: TIDY_TEMPLATE_PATH,
    getData: async (data) => {
      const actor = resolveActorFromContext(data);
      if (!isActorAllowed(actor)) {
        return foundry.utils.mergeObject(data ?? {}, { isAllowedActor: false }, {
          inplace: false,
          overwrite: true,
        });
      }
      const trackerData = buildTrackerData({
        actor,
        showActorSelect: false,
        embedded: true,
      });
      return foundry.utils.mergeObject(data ?? {}, trackerData, {
        inplace: false,
        overwrite: true,
      });
    },
    onRender: (params) => {
      const actor = resolveActorFromContext(params);
      if (!isActorAllowed(actor)) {
        const root = $(params.app?.element ?? []);
        hideDowntimeTab(root);
        return;
      }
      const root = $(params.tabContentsElement);
      debugLog("Tidy5e downtime tab ready", {
        rollButtons: root.find("[data-drep-action='roll-interval']").length,
        actorName: actor?.name,
      });
      attachTrackerListeners(root, {
        render: () => params.app.render(),
        actor,
      });
    },
  });
}

function updateTidyTabLabel() {
  if (!tidyApi?.registerCharacterTab || !tidyApi?.models?.HandlebarsTab) return;
  tidyApi.registerCharacterTab(createTidyTab(tidyApi), {
    overrideExisting: true,
  });
}

function rerenderCharacterSheets() {
  for (const app of getOpenApps()) {
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.type !== "character") continue;
    forceRenderApp(app);
  }
}

function rerenderSettingsApps() {
  for (const app of getOpenApps()) {
    if (app instanceof DowntimeRepSettings && typeof app.render === "function") {
      forceRenderApp(app);
    }
  }
}

function getOpenApps() {
  const apps = [];
  if (ui?.windows) {
    apps.push(...Object.values(ui.windows));
  }
  const instances = foundry?.applications?.instances;
  if (instances) {
    if (instances instanceof Map) {
      apps.push(...instances.values());
    } else if (typeof instances === "object") {
      apps.push(...Object.values(instances));
    }
  }
  return [...new Set(apps)].filter(Boolean);
}

function forceRenderApp(app) {
  if (typeof app?.render !== "function") return;
  try {
    app.render({ force: true });
    return;
  } catch (error) {
    // fall through
  }
  try {
    app.render(true);
    return;
  } catch (error) {
    // fall through
  }
  try {
    app.render();
  } catch (error) {
    debugLog("Failed to re-render app", { appClass: app?.constructor?.name });
  }
}

function registerTidyTab() {
  Hooks.once("tidy5e-sheet.ready", (api) => {
    if (!api?.registerCharacterTab || !api?.models?.HandlebarsTab) {
      debugLog("Tidy5e API not available");
      return;
    }

    tidyApi = api;
    api.registerCharacterTab(createTidyTab(api));
    debugLog("Registered tidy5e downtime tab");
  });
}

Hooks.once("init", () => {
  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper("eq", (left, right) => left === right);
  }

  game.settings.register(MODULE_ID, "projectState", {
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_STATE,
    onChange: () => {
      debugLog("projectState updated");
      rerenderCharacterSheets();
      rerenderSettingsApps();
    },
  });

  game.settings.register(MODULE_ID, "skillAliases", {
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_SKILL_ALIASES,
  });

  game.settings.register(MODULE_ID, "phaseConfig", {
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_PHASE_CONFIG,
  });

  game.settings.register(MODULE_ID, "headerLabel", {
    scope: "world",
    config: false,
    type: String,
    default: DEFAULT_HEADER_LABEL,
  });

  game.settings.register(MODULE_ID, "tabLabel", {
    scope: "world",
    config: false,
    type: String,
    default: DEFAULT_TAB_LABEL,
  });

  game.settings.register(MODULE_ID, "intervalLabel", {
    scope: "world",
    config: false,
    type: String,
    default: DEFAULT_INTERVAL_LABEL,
  });

  game.settings.register(MODULE_ID, RESTRICTED_ACTORS_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: [],
    onChange: () => {
      rerenderCharacterSheets();
    },
  });

  game.settings.register(MODULE_ID, "lastActorId", {
    scope: "client",
    config: false,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, DEBUG_SETTING, {
    name: "Downtime Reputation: Debug Logging",
    hint: "Enable verbose console logging for the downtime tracker.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    restricted: true,
  });

  game.settings.registerMenu(MODULE_ID, "settings", {
    name: "Downtime Reputation Settings",
    label: "Configure",
    hint: "Configure downtime phases, window, and skill mapping.",
    icon: "fas fa-fire",
    type: DowntimeRepSettings,
    restricted: true,
  });

  // No settings menu: the tracker is embedded in the character sheet tab.
  if (!registerSheetTab()) {
    Hooks.once("ready", () => {
      registerSheetTab();
    });
  }

  registerTidyTab();
});

Hooks.on("dnd5e.prepareSheetContext", (sheet, partId, context) => {
  if (partId !== SHEET_TAB_ID) return;
  if (sheet.actor?.type !== "character") return;
  if (!isActorAllowed(sheet.actor)) return;
  debugLog("Preparing sheet context", {
    partId,
    actorName: sheet.actor?.name,
  });
  Object.assign(
    context,
    buildTrackerData({
      actor: sheet.actor,
      showActorSelect: false,
      embedded: true,
    })
  );
});

Hooks.on("renderCharacterActorSheet", (app, html) => {
  debugLog("Render hook fired", {
    appClass: app?.constructor?.name,
    actorType: app?.actor?.type,
    actorName: app?.actor?.name,
    isEditable: app?.isEditable,
  });
  if (!isActorAllowed(app?.actor)) {
    const $html = html instanceof jQuery ? html : $(html);
    hideDowntimeTab($html);
    return;
  }
  const $html = html instanceof jQuery ? html : $(html);
  let root = $html.find(`.tab[data-tab='${SHEET_TAB_ID}']`).first();
  if (!root.length) {
    root = $html.find("[data-drep-root]").first();
  }
  if (!root.length) {
    debugLog("Downtime tab content not found");
    return;
  }
  debugLog("Downtime tab ready", {
    rollButtons: root.find("[data-drep-action='roll-interval']").length,
  });
  attachTrackerListeners(root, { render: () => app.render(), actor: app.actor });
});

Hooks.once("ready", () => {
  if (game.system?.id !== "dnd5e") {
    ui.notifications.warn(
      "Downtime Reputation: this module expects the DnD5e system."
    );
  }
  if (game.socket) {
    game.socket.on(`module.${MODULE_ID}`, handleSocketMessage);
  }
});
