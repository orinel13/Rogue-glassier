import "./style.css";
import { AudioManager } from "./audio.js";

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const hud = {
  levelIndex: document.querySelector("#levelIndex"),
  levelName: document.querySelector("#levelName"),
  difficulty: document.querySelector("#difficulty"),
  trackType: document.querySelector("#trackType"),
  modifiers: document.querySelector("#modifiers"),
  launches: document.querySelector("#launches"),
  totalLaunches: document.querySelector("#totalLaunches"),
  activeBalls: document.querySelector("#activeBalls"),
  shards: document.querySelector("#shards"),
  powerUpgrade: document.querySelector("#powerUpgrade"),
  speedUpgrade: document.querySelector("#speedUpgrade"),
  ballsUpgrade: document.querySelector("#ballsUpgrade"),
  rewardCount: document.querySelector("#rewardCount"),
  brokenGlass: document.querySelector("#brokenGlass"),
  coreHp: document.querySelector("#coreHp"),
  coreDistance: document.querySelector("#coreDistance"),
  audioStatus: document.querySelector("#audioStatus"),
};

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const TAU = Math.PI * 2;

const BASE_BALL_POWER = 8;
const BASE_BALL_SPEED = 0.15;
const TRACK_WIDTH = 54;
const MAX_LANE_OFFSET = TRACK_WIDTH * 0.28;
const UPGRADE_COSTS = {
  power: [10, 15, 25, 40, 60, 90, 135],
  speed: [8, 12, 18, 28, 42, 64, 96],
  balls: [25, 40, 65, 100, 150, 225],
};

const REWARD_POOL = [
  {
    id: "temperedCore",
    name: "Tempered Core",
    tier: "common",
    description: "+15% base power until run end.",
  },
  {
    id: "quickLaunch",
    name: "Quick Launch",
    tier: "common",
    description: "+8% base speed until run end.",
  },
  {
    id: "extraMarble",
    name: "Extra Marble",
    tier: "rare",
    description: "+1 start ball until run end.",
  },
  {
    id: "glassTax",
    name: "Glass Tax",
    tier: "rare",
    description: "+20% shards from wave rewards.",
  },
  {
    id: "multiplierPolish",
    name: "Multiplier Polish",
    tier: "rare",
    description: "First multiplier each level gets +1 value.",
  },
  {
    id: "deepCrack",
    name: "Deep Crack",
    tier: "common",
    description: "First hit each level deals +50% damage.",
  },
  {
    id: "coreBruiser",
    name: "Core Bruiser",
    tier: "rare",
    description: "+25% damage to core.",
  },
  {
    id: "cleanBreak",
    name: "Clean Break",
    tier: "common",
    description: "+5 shards for each 10th broken segment in a level.",
  },
];

const ACT_ROOMS = 6;

const DIFFICULTY = {
  safe: { label: "Safe", glassHpScale: 0.85, coreHpScale: 0.9, shardMultiplier: 0.85 },
  normal: { label: "Normal", glassHpScale: 1, coreHpScale: 1, shardMultiplier: 1 },
  risky: { label: "Risky", glassHpScale: 1.15, coreHpScale: 1.1, shardMultiplier: 1.25 },
  elite: { label: "Elite", glassHpScale: 1.35, coreHpScale: 1.3, shardMultiplier: 1.6 },
  boss: { label: "Boss", glassHpScale: 1.55, coreHpScale: 1.6, shardMultiplier: 2 },
};

const LEVEL_MODIFIERS = {
  brittleGlass: {
    id: "brittleGlass",
    name: "Brittle Glass",
    shortDescription: "Glass has less HP, but core has more HP.",
    numericEffect: "Glass HP x0.75, core HP x1.35.",
  },
  denseMiddle: {
    id: "denseMiddle",
    name: "Dense Middle",
    shortDescription: "Middle glass is much tougher.",
    numericEffect: "Progress 35%-70% glass has +45% HP.",
  },
  armoredCore: {
    id: "armoredCore",
    name: "Armored Core",
    shortDescription: "Core reduces small hits.",
    numericEffect: "Core armor is 8, or 14 on elite/boss.",
  },
  multiplierRush: {
    id: "multiplierRush",
    name: "Multiplier Rush",
    shortDescription: "More multiplier value, tougher glass.",
    numericEffect: "x2+ multipliers gain +1 value; glass HP x1.20.",
  },
  fragileBalls: {
    id: "fragileBalls",
    name: "Fragile Balls",
    shortDescription: "Balls lose more power after breaking glass.",
    numericEffect: "Overflow power after breaks is reduced harder.",
  },
  richChamber: {
    id: "richChamber",
    name: "Rich Chamber",
    shortDescription: "More shards, stronger glass.",
    numericEffect: "Wave shards x1.35; glass HP x1.25.",
  },
  crackedStart: {
    id: "crackedStart",
    name: "Cracked Start",
    shortDescription: "First quarter is cracked, center is stronger.",
    numericEffect: "First 25% glass HP x0.50; last 25% HP x1.25.",
  },
  glassRegen: {
    id: "glassRegen",
    name: "Glass Regen",
    shortDescription: "Damaged glass repairs after each wave.",
    numericEffect: "Unbroken damaged glass restores 10% missing HP.",
  },
};

const MODIFIER_LABELS = {
  brittleGlass: "Brittle",
  denseMiddle: "Dense",
  armoredCore: "Armor",
  multiplierRush: "Rush",
  fragileBalls: "Fragile",
  richChamber: "Rich",
  crackedStart: "Crack",
  glassRegen: "Regen",
};

const MENU_ITEMS = [
  {
    id: "arcade",
    key: "1",
    title: "Arcade Run",
    body: "Current mode: shards, upgrades, rewards, act map.",
  },
  {
    id: "puzzle",
    key: "2",
    title: "Puzzle Run",
    body: "Playable MVP: place cards, manage energy, solve the chamber.",
  },
];

const PUZZLE_ROOMS = [
  {
    id: "puzzleLabI",
    name: "Puzzle Lab I",
    trackType: "snake",
    difficulty: "normal",
    slotProgress: [0.12, 0.28, 0.44, 0.62, 0.8],
    segments: 68,
    coreHp: 140,
    coreArmor: 0,
    hpCurve: { start: 8, end: 58, exponent: 1.62 },
    glassHpScale: 0.34,
    theme: { accentColor: "#84f0ff", glassTint: "#a7efff", backgroundGridStrength: 0.2 },
  },
  {
    id: "batterySpiral",
    name: "Battery Spiral",
    trackType: "spiral",
    difficulty: "risky",
    turns: 3.15,
    slotProgress: [0.1, 0.26, 0.43, 0.64, 0.82],
    segments: 74,
    coreHp: 180,
    coreArmor: 0,
    hpCurve: { start: 9, end: 70, exponent: 1.7 },
    glassHpScale: 0.34,
    theme: { accentColor: "#fff37a", glassTint: "#b7f7ff", backgroundGridStrength: 0.22 },
  },
  {
    id: "armoredKnot",
    name: "Armored Knot",
    trackType: "rings",
    difficulty: "elite",
    slotProgress: [0.09, 0.22, 0.38, 0.55, 0.72, 0.88],
    segments: 78,
    coreHp: 220,
    coreArmor: 6,
    hpCurve: { start: 11, end: 82, exponent: 1.72, midBoost: 8 },
    glassHpScale: 0.35,
    theme: { accentColor: "#cdb8ff", glassTint: "#d7f4ff", backgroundGridStrength: 0.25 },
  },
];

const PUZZLE_CARD_DEFINITIONS = [
  {
    id: "booster",
    name: "Booster",
    label: "BOOST",
    type: "trigger",
    color: "#8dfcff",
    description: "+30 energy and +25% speed for the next route section.",
  },
  {
    id: "battery",
    name: "Battery",
    label: "BAT",
    type: "trigger",
    color: "#fff37a",
    description: "+55 energy. Can exceed normal max slightly.",
  },
  {
    id: "split2",
    name: "Split x2",
    label: "x2",
    type: "trigger",
    color: "#80ffd4",
    description: "Each ball splits into 2. New balls inherit 75% energy.",
  },
  {
    id: "split3",
    name: "Split x3",
    label: "x3",
    type: "trigger",
    color: "#cdb8ff",
    description: "Each ball splits into 3. New balls inherit 55% energy.",
  },
  {
    id: "pierce",
    name: "Pierce",
    label: "PIERCE",
    type: "trigger",
    color: "#ffffff",
    description: "Next glass hit ignores 65% of segment HP.",
  },
  {
    id: "crack",
    name: "Crack",
    label: "CRACK",
    type: "prelaunch",
    color: "#ffb8b8",
    description: "Weakens glass around this slot before launch.",
  },
];

const PUZZLE_CARDS = PUZZLE_CARD_DEFINITIONS;
const PUZZLE_TOTAL_ROOMS = PUZZLE_ROOMS.length;

const TUTORIAL_LEVEL = {
  id: "glassSpiral",
  name: "Glass Spiral",
  trackType: "spiral",
  archetype: "Stable",
  shortPitch: "Balanced opening chamber",
  difficulty: "normal",
  modifiers: [],
  turns: 3.65,
  segments: 72,
  coreHp: 165,
  hpCurve: { start: 2, end: 18, exponent: 1.7 },
  multipliers: [
    { progress: 0.25, value: 2 },
    { progress: 0.5, value: 3 },
    { progress: 0.75, value: 1 },
    { progress: 0.9, value: 5 },
  ],
  theme: {
    accentColor: "#72eeff",
    glassTint: "#98eeff",
    backgroundGridStrength: 0.23,
  },
};

const LEVEL_POOL = [
  {
    ...TUTORIAL_LEVEL,
  },
  {
    id: "serpentCut",
    name: "Serpent Cut",
    trackType: "snake",
    archetype: "Stable",
    shortPitch: "Cracked opening, stronger center",
    difficulty: "normal",
    modifiers: ["crackedStart"],
    segments: 86,
    coreHp: 150,
    hpCurve: { start: 2, end: 15, exponent: 1.35 },
    multipliers: [
      { progress: 0.2, value: 2 },
      { progress: 0.45, value: 2 },
      { progress: 0.7, value: 3 },
      { progress: 0.88, value: 5 },
    ],
    theme: {
      accentColor: "#65ffd1",
      glassTint: "#7fe8dc",
      backgroundGridStrength: 0.18,
    },
  },
  {
    id: "ringChamber",
    name: "Ring Chamber",
    trackType: "rings",
    archetype: "Elite",
    shortPitch: "Dense middle, strong scaling",
    difficulty: "risky",
    modifiers: ["denseMiddle"],
    segments: 78,
    coreHp: 185,
    hpCurve: { start: 3, end: 20, exponent: 1.45, midBoost: 7 },
    multipliers: [
      { progress: 0.3, value: 3 },
      { progress: 0.55, value: 1 },
      { progress: 0.78, value: 4 },
      { progress: 0.92, value: 5 },
    ],
    theme: {
      accentColor: "#b9a7ff",
      glassTint: "#abc6ff",
      backgroundGridStrength: 0.21,
    },
  },
  {
    id: "cloverTrap",
    name: "Clover Trap",
    trackType: "clover",
    archetype: "Volatile",
    shortPitch: "Power loss matters here",
    difficulty: "risky",
    modifiers: ["fragileBalls"],
    segments: 90,
    coreHp: 305,
    hpCurve: { start: 3, end: 23, exponent: 1.45 },
    multipliers: [
      { progress: 0.18, value: 2 },
      { progress: 0.42, value: 3 },
      { progress: 0.66, value: 2 },
      { progress: 0.9, value: 5 },
    ],
    theme: {
      accentColor: "#d8ff80",
      glassTint: "#bdf4aa",
      backgroundGridStrength: 0.17,
    },
  },
  {
    id: "zigzagCoil",
    name: "Zigzag Coil",
    trackType: "zigzagCoil",
    archetype: "Rich",
    shortPitch: "Fast breaks, tougher core",
    difficulty: "normal",
    modifiers: ["brittleGlass"],
    segments: 92,
    coreHp: 260,
    hpCurve: { start: 4, end: 26, exponent: 1.5 },
    multipliers: [
      { progress: 0.22, value: 2 },
      { progress: 0.48, value: 3 },
      { progress: 0.72, value: 1 },
      { progress: 0.9, value: 5 },
    ],
    theme: {
      accentColor: "#9ee8ff",
      glassTint: "#aeefff",
      backgroundGridStrength: 0.24,
    },
  },
  {
    id: "greedySpiral",
    name: "Greedy Spiral",
    trackType: "spiral",
    archetype: "Greedy",
    shortPitch: "Multiplier-heavy, glass fights back",
    difficulty: "risky",
    modifiers: ["multiplierRush"],
    turns: 3.2,
    segments: 82,
    coreHp: 225,
    hpCurve: { start: 3, end: 24, exponent: 1.45 },
    multipliers: [
      { progress: 0.18, value: 2 },
      { progress: 0.4, value: 3 },
      { progress: 0.68, value: 5 },
      { progress: 0.9, value: 5 },
    ],
    theme: {
      accentColor: "#f2e989",
      glassTint: "#cdeec8",
      backgroundGridStrength: 0.2,
    },
  },
  {
    id: "richSerpent",
    name: "Rich Serpent",
    trackType: "snake",
    archetype: "Rich",
    shortPitch: "More shards, stronger glass",
    difficulty: "risky",
    modifiers: ["richChamber"],
    segments: 92,
    coreHp: 230,
    hpCurve: { start: 3, end: 24, exponent: 1.42 },
    multipliers: [
      { progress: 0.25, value: 2 },
      { progress: 0.5, value: 2 },
      { progress: 0.76, value: 3 },
      { progress: 0.91, value: 5 },
    ],
    theme: {
      accentColor: "#88ffc4",
      glassTint: "#9ef2d5",
      backgroundGridStrength: 0.19,
    },
  },
  {
    id: "armoredRings",
    name: "Armored Rings",
    trackType: "rings",
    archetype: "Elite",
    shortPitch: "Dense route, armored core",
    difficulty: "elite",
    modifiers: ["armoredCore", "denseMiddle"],
    segments: 84,
    coreHp: 260,
    hpCurve: { start: 4, end: 28, exponent: 1.52, midBoost: 8 },
    multipliers: [
      { progress: 0.24, value: 2 },
      { progress: 0.52, value: 3 },
      { progress: 0.75, value: 1 },
      { progress: 0.92, value: 6 },
    ],
    theme: {
      accentColor: "#9fb9ff",
      glassTint: "#c0d1ff",
      backgroundGridStrength: 0.26,
    },
  },
  {
    id: "regrowthClover",
    name: "Regrowth Clover",
    trackType: "clover",
    archetype: "Elite",
    shortPitch: "Damaged glass repairs over time",
    difficulty: "elite",
    modifiers: ["glassRegen", "richChamber"],
    segments: 88,
    coreHp: 255,
    hpCurve: { start: 4, end: 27, exponent: 1.5 },
    multipliers: [
      { progress: 0.2, value: 2 },
      { progress: 0.46, value: 3 },
      { progress: 0.72, value: 4 },
      { progress: 0.9, value: 5 },
    ],
    theme: {
      accentColor: "#ccff9c",
      glassTint: "#b9f0bb",
      backgroundGridStrength: 0.22,
    },
  },
  {
    id: "brokenPassage",
    name: "Broken Passage",
    trackType: "brokenSpiral",
    archetype: "Volatile",
    shortPitch: "Easy start, punishing finish",
    difficulty: "normal",
    modifiers: ["crackedStart"],
    turns: 3.05,
    segments: 76,
    coreHp: 205,
    hpCurve: { start: 3, end: 24, exponent: 1.48 },
    multipliers: [
      { progress: 0.25, value: 2 },
      { progress: 0.52, value: 3 },
      { progress: 0.74, value: 1 },
      { progress: 0.91, value: 5 },
    ],
    theme: {
      accentColor: "#d9efff",
      glassTint: "#caefff",
      backgroundGridStrength: 0.25,
    },
  },
];

const BOSS_LEVEL = {
  id: "brokenCoreBoss",
  name: "Broken Core",
  trackType: "brokenSpiral",
  archetype: "Core",
  shortPitch: "Boss chamber",
  difficulty: "boss",
  modifiers: ["armoredCore", "denseMiddle"],
  turns: 3.25,
  segments: 70,
  coreHp: 330,
  hpCurve: { start: 6, end: 38, exponent: 1.6 },
  multipliers: [
    { progress: 0.25, value: 2 },
    { progress: 0.52, value: 3 },
    { progress: 0.72, value: 1 },
    { progress: 0.91, value: 6 },
  ],
  theme: {
    accentColor: "#e8f8ff",
    glassTint: "#d7f4ff",
    backgroundGridStrength: 0.28,
  },
};

const audio = new AudioManager();

const state = {
  appState: "mainMenu",
  arcadeInitialized: false,
  menuSelection: 0,
  puzzle: null,
  phase: "idle",
  room: 1,
  level: TUTORIAL_LEVEL,
  previousLevelId: null,
  nextChoices: [],
  nextChoiceNodes: [],
  selectedNextLevel: null,
  selectedNextNodeId: null,
  mapOverlayOpen: false,
  actMap: [],
  mouse: { x: 0, y: 0 },
  interactiveRects: [],
  hoveredInteractive: null,
  lastHoverSoundAt: 0,
  track: [],
  segments: [],
  multipliers: [],
  balls: [],
  particles: [],
  floatingTexts: [],
  launches: 0,
  totalLaunches: 0,
  shards: 0,
  bestDepth: 0,
  core: null,
  upgrades: {
    power: 0,
    speed: 0,
    balls: 0,
  },
  rewards: [],
  rewardChoices: [],
  selectedReward: null,
  levelShardsEarned: 0,
  levelFirstHitUsed: false,
  levelMultiplierPolishUsed: false,
  levelVictoryTimer: 0,
  transitionFade: 1,
  waveStats: null,
  waveReport: null,
  coreFlash: 0,
  screenShake: 0,
  lastTime: 0,
};

function init() {
  setAppState("mainMenu");

  window.addEventListener("keydown", async (event) => {
    await audio.unlock();

    if (event.key.toLowerCase() === "m") {
      toggleMute();
      return;
    }

    if (state.appState === "mainMenu") handleMainMenuKeyDown(event);
    else if (state.appState === "puzzleRun") handlePuzzleKeyDown(event);
    else handleArcadeKeyDown(event);
  });

  canvas.addEventListener("mousemove", (event) => {
    if (state.appState === "arcadeRun") handleArcadeMouseMove(event);
    else {
      state.mouse = getMousePos(event);
      updateHoverState();
    }
  });
  canvas.addEventListener("mouseleave", () => {
    state.mouse = { x: -9999, y: -9999 };
    state.hoveredInteractive = null;
    canvas.style.cursor = "default";
  });
  canvas.addEventListener("click", async (event) => {
    await audio.unlock();
    state.mouse = getMousePos(event);
    updateHoverState();
    if (state.appState === "arcadeRun") handleArcadeClick(event);
    else handleCanvasClick(event);
  });
  canvas.addEventListener("contextmenu", async (event) => {
    event.preventDefault();
    await audio.unlock();
    state.mouse = getMousePos(event);
    updateHoverState();
    if (state.appState === "puzzleRun" && state.hoveredInteractive?.type === "puzzleSlot") {
      removePuzzleCardFromSlot(state.hoveredInteractive.payload.slotId);
    }
  });

  requestAnimationFrame(tick);
}

function setAppState(appState) {
  state.appState = appState;
  document.body.dataset.appState = appState;
  state.mapOverlayOpen = false;
  state.hoveredInteractive = null;
  canvas.style.cursor = "default";
  updateHud();
}

function startArcadeRun({ newRun = false } = {}) {
  if (newRun || !state.arcadeInitialized) {
    resetRun();
    state.arcadeInitialized = true;
  }
  setAppState("arcadeRun");
  audio.play("uiClick");
}

function openPuzzleRun() {
  startPuzzleRun();
  setAppState("puzzleRun");
  audio.play("uiClick");
}

function handleMainMenuKeyDown(event) {
  if (event.key === "1") {
    startArcadeRun({ newRun: event.shiftKey });
    return;
  }
  if (event.key.toLowerCase() === "n") {
    startArcadeRun({ newRun: true });
    return;
  }
  if (event.key === "2") {
    openPuzzleRun();
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    state.menuSelection = (state.menuSelection + direction + MENU_ITEMS.length) % MENU_ITEMS.length;
    audio.play("uiClick");
    return;
  }
  if (event.code === "Space" || event.code === "Enter") {
    event.preventDefault();
    activateMenuItem(state.menuSelection);
  }
}

function handlePuzzleKeyDown(event) {
  if (event.code === "Escape") {
    setAppState("mainMenu");
    audio.play("uiClick");
    return;
  }
  if (event.key.toLowerCase() === "a") startArcadeRun({ newRun: false });
  if (event.code === "Space") {
    event.preventDefault();
    if (state.puzzle?.puzzleState === "planning" || state.puzzle?.puzzleState === "attemptComplete") {
      startPuzzleAttempt();
    } else if (state.puzzle?.puzzleState === "nextRoomReady") {
      enterNextPuzzleRoom();
    } else if (state.puzzle?.puzzleState === "runFailed" || state.puzzle?.puzzleState === "runCleared") {
      startPuzzleRun({ newRun: true });
    }
    return;
  }
  if (event.code === "Enter" && (state.puzzle?.puzzleState === "runFailed" || state.puzzle?.puzzleState === "runCleared")) {
    startPuzzleRun({ newRun: true });
    return;
  }
  const number = Number(event.key);
  if (state.puzzle?.puzzleState === "rewardChoice" && number >= 1 && number <= 3) {
    applyPuzzleReward(state.puzzle.rewardChoices[number - 1]);
    return;
  }
  const cards = getAvailablePuzzleCards();
  if (number >= 1 && number <= cards.length) selectPuzzleCard(cards[number - 1].instanceId);
  const slotIndex = ["q", "w", "e", "r", "t"].indexOf(event.key.toLowerCase());
  if (slotIndex >= 0 && state.puzzle?.selectedCardId) {
    placePuzzleCard(state.puzzle.slots[slotIndex].id, state.puzzle.selectedCardId);
  }
  if (event.key.toLowerCase() === "c") clearPuzzlePlacements();
  if (event.code === "Backspace" || event.code === "Delete") {
    const hovered = state.hoveredInteractive;
    if (hovered?.type === "puzzleSlot") removePuzzleCardFromSlot(hovered.payload.slotId);
  }
}

function handleArcadeKeyDown(event) {
  if (event.code === "Space") {
    event.preventDefault();
    handleSpace();
    return;
  }

  if (event.code === "Tab") {
    event.preventDefault();
    toggleMapOverlay();
    return;
  }

  if (event.code === "Escape") {
    event.preventDefault();
    if (state.mapOverlayOpen) {
      state.mapOverlayOpen = false;
      audio.play("uiClick");
    } else {
      setAppState("mainMenu");
      audio.play("uiClick");
    }
    return;
  }

  if (event.key === "1") handleNumberKey(0, "power");
  if (event.key === "2") handleNumberKey(1, "speed");
  if (event.key === "3") handleNumberKey(2, "balls");
}

function handleArcadeMouseMove(event) {
  state.mouse = getMousePos(event);
  updateHoverState();
}

function handleArcadeClick(event) {
  handleCanvasClick(event);
}

function activateMenuItem(index) {
  if (index === 0) startArcadeRun({ newRun: false });
  if (index === 1) openPuzzleRun();
}

function startPuzzleRun({ newRun = false } = {}) {
  if (newRun || !state.puzzle) state.puzzle = createPuzzleRunState();
}

function createPuzzleRunState() {
  const puzzle = {
    puzzleState: "planning",
    roomIndex: 0,
    totalRooms: PUZZLE_TOTAL_ROOMS,
    integrity: 100,
    maxIntegrity: 100,
    deck: createStartingPuzzleDeck(),
    selectedCardId: null,
    rewardChoices: [],
    selectedReward: null,
    rewardResolved: false,
    roomsSolved: 0,
    totalAttempts: 0,
    particles: [],
    level: null,
    track: [],
    slots: [],
    segments: [],
    balls: [],
    core: null,
    attempts: 0,
    failedAttemptsInRoom: 0,
    bestDepth: 0,
    bestDamage: 0,
    report: null,
    coreFlash: 0,
    screenShake: 0,
    integrityPulse: 0,
  };
  enterPuzzleRoom(puzzle, 0);
  return puzzle;
}

function createPuzzleRoom(roomIndex) {
  const room = structuredClone(PUZZLE_ROOMS[roomIndex] || PUZZLE_ROOMS[PUZZLE_ROOMS.length - 1]);
  room.room = roomIndex + 1;
  room.modifiers = [];
  room.multipliers = [];
  room.coreHpScale = 1;
  room.shardMultiplier = 1;
  room.archetype = "Core";
  room.shortPitch = "Puzzle chamber";
  return room;
}

function enterPuzzleRoom(puzzle, roomIndex) {
  puzzle.roomIndex = roomIndex;
  puzzle.level = createPuzzleRoom(roomIndex);
  puzzle.track = generateTrack(puzzle.level);
  puzzle.slots = createPuzzleSlots(puzzle.level);
  puzzle.selectedCardId = null;
  puzzle.rewardChoices = [];
  puzzle.selectedReward = null;
  puzzle.rewardResolved = false;
  puzzle.attempts = 0;
  puzzle.failedAttemptsInRoom = 0;
  puzzle.bestDepth = 0;
  puzzle.bestDamage = 0;
  puzzle.report = null;
  puzzle.puzzleState = "planning";
  resetPuzzleRoomDamage(puzzle);
}

function resetPuzzleLevel() {
  state.puzzle = createPuzzleRunState();
}

function resetPuzzleRoomDamage(puzzle = state.puzzle) {
  puzzle.segments = generateGlassSegments(puzzle.level).map((segment) => ({
    ...segment,
    crackWeak: false,
    countedBroken: false,
    crackedBy: [],
  }));
  puzzle.core = {
    hp: puzzle.level.coreHp,
    maxHp: puzzle.level.coreHp,
    armor: puzzle.level.coreArmor || 0,
    broken: false,
  };
  puzzle.balls = [];
  puzzle.coreFlash = 0;
  puzzle.screenShake = 0;
  puzzle.slots.forEach((slot) => {
    slot.flash = 0;
  });
}

function createPuzzleSlots(level) {
  return level.slotProgress.map((progress, index) => ({
    id: `slot-${index + 1}`,
    index,
    progress,
    placedCardId: null,
    flash: 0,
  }));
}

function createStartingPuzzleDeck() {
  return [
    createCardInstance("booster", 1),
    createCardInstance("battery", 1),
    createCardInstance("split2", 1),
    createCardInstance("pierce", 1),
    createCardInstance("crack", 1),
  ];
}

function createCardInstance(type, level = 1) {
  return {
    instanceId: `${type}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    level,
  };
}

function addCardToPuzzleDeck(type, level = 1) {
  const card = createCardInstance(type, level);
  state.puzzle.deck.push(card);
  return card;
}

function getCardDefinition(type) {
  return PUZZLE_CARD_DEFINITIONS.find((card) => card.id === type);
}

function getCardEffectNumbers(card) {
  const level = clamp(card?.level || 1, 1, 3);
  const tables = {
    booster: [
      null,
      { energy: 30, speed: 1.25, drain: 0.75, duration: 0.16 },
      { energy: 40, speed: 1.3, drain: 0.7, duration: 0.18 },
      { energy: 50, speed: 1.35, drain: 0.65, duration: 0.2 },
    ],
    battery: [null, { energy: 55, cap: 140 }, { energy: 70, cap: 155 }, { energy: 85, cap: 170 }],
    split2: [null, { energy: 0.75, power: 0.9 }, { energy: 0.82, power: 0.95 }, { energy: 0.88, power: 1 }],
    split3: [null, { energy: 0.55, power: 0.78 }, { energy: 0.62, power: 0.84 }, { energy: 0.68, power: 0.9 }],
    pierce: [null, { ignore: 0.65 }, { ignore: 0.75 }, { ignore: 0.82 }],
    crack: [null, { radius: 0.065, reduction: 0.35 }, { radius: 0.075, reduction: 0.45 }, { radius: 0.085, reduction: 0.55 }],
  };
  return tables[card?.type]?.[level] || {};
}

function describePuzzleCard(card) {
  const effect = getCardEffectNumbers(card);
  if (!card) return "";
  if (card.type === "booster") return `+${effect.energy} energy, speed x${effect.speed}, drain x${effect.drain}, duration ${Math.round(effect.duration * 100)}%.`;
  if (card.type === "battery") return `+${effect.energy} energy, temporary cap ${effect.cap}.`;
  if (card.type === "split2") return `Split into 2. Energy ${Math.round(effect.energy * 100)}%, power ${Math.round(effect.power * 100)}%.`;
  if (card.type === "split3") return `Split into 3. Energy ${Math.round(effect.energy * 100)}%, power ${Math.round(effect.power * 100)}%.`;
  if (card.type === "pierce") return `Next hit ignores ${Math.round(effect.ignore * 100)}% segment HP.`;
  if (card.type === "crack") return `Weakens ${Math.round(effect.radius * 100)}% route radius by ${Math.round(effect.reduction * 100)}%.`;
  return getCardDefinition(card.type)?.description || "";
}

function getAvailablePuzzleCards() {
  return state.puzzle.deck;
}

function selectPuzzleCard(cardInstanceId) {
  const puzzle = state.puzzle;
  if (!puzzle || isPuzzleCardPlaced(cardInstanceId)) {
    audio.play("denied");
    return;
  }
  puzzle.selectedCardId = puzzle.selectedCardId === cardInstanceId ? null : cardInstanceId;
  audio.play("uiClick");
}

function placePuzzleCard(slotId, cardInstanceId) {
  const puzzle = state.puzzle;
  if (!puzzle || puzzle.puzzleState === "running" || ["rewardChoice", "nextRoomReady", "runFailed", "runCleared"].includes(puzzle.puzzleState)) {
    audio.play("denied");
    return;
  }
  const slot = getPuzzleSlot(slotId);
  if (!slot || slot.placedCardId || isPuzzleCardPlaced(cardInstanceId)) {
    audio.play("denied");
    return;
  }
  slot.placedCardId = cardInstanceId;
  slot.flash = 0.5;
  puzzle.selectedCardId = null;
  audio.play(getPuzzleCard(cardInstanceId)?.type === "crack" ? "break" : "upgrade");
}

function removePuzzleCardFromSlot(slotId) {
  const puzzle = state.puzzle;
  if (!puzzle || puzzle.puzzleState === "running" || ["rewardChoice", "nextRoomReady", "runFailed", "runCleared"].includes(puzzle.puzzleState)) {
    audio.play("denied");
    return;
  }
  const slot = getPuzzleSlot(slotId);
  if (!slot?.placedCardId) {
    audio.play("denied");
    return;
  }
  const removed = slot.placedCardId;
  slot.placedCardId = null;
  slot.flash = 0.35;
  puzzle.selectedCardId = removed;
  audio.play("uiClick");
}

function clearPuzzlePlacements() {
  const puzzle = state.puzzle;
  if (!puzzle || puzzle.puzzleState === "running" || ["rewardChoice", "nextRoomReady", "runFailed", "runCleared"].includes(puzzle.puzzleState)) {
    audio.play("denied");
    return;
  }
  puzzle.slots.forEach((slot) => {
    slot.placedCardId = null;
  });
  puzzle.selectedCardId = null;
  audio.play("uiClick");
}

function startPuzzleAttempt() {
  const puzzle = state.puzzle;
  if (!puzzle || !["planning", "attemptComplete"].includes(puzzle.puzzleState)) {
    audio.play("denied");
    return;
  }
  puzzle.puzzleState = "running";
  puzzle.attempts += 1;
  puzzle.totalAttempts += 1;
  puzzle.balls = [];
  puzzle.report = {
    depthReached: 0,
    glassBroken: 0,
    coreDamage: 0,
    cardsTriggered: {},
    integrityLost: 0,
    startBrokenGlass: getPuzzleBrokenGlassCount(),
  };
  puzzle.slots.forEach((slot) => {
    slot.flash = 0;
  });
  applyPuzzlePrelaunchCards();
  const placedCount = puzzle.slots.filter((slot) => slot.placedCardId).length;
  puzzle.balls = [createPuzzleBall(0, placedCount === 0 ? 58 : 100, placedCount === 0 ? 20 : 28, 0, "#eaffff")];
  audio.play("launch");
}

function applyPuzzlePrelaunchCards() {
  const puzzle = state.puzzle;
  for (const slot of puzzle.slots) {
    const card = getPuzzleCard(slot.placedCardId);
    if (card?.type !== "crack") continue;
    const effect = getCardEffectNumbers(card);
    for (const segment of puzzle.segments) {
      const mid = (segment.progressStart + segment.progressEnd) * 0.5;
      if (Math.abs(mid - slot.progress) > effect.radius || segment.crackedBy.includes(card.instanceId)) continue;
      const oldMax = segment.maxHp;
      segment.maxHp = Math.max(1, Math.round(segment.maxHp * (1 - effect.reduction)));
      segment.hp = Math.min(segment.hp, Math.max(1, Math.round(segment.hp * (segment.maxHp / oldMax))));
      segment.crackWeak = true;
      segment.crackedBy.push(card.instanceId);
    }
  }
}

function createPuzzleBall(progress, energy, power, laneOffset, color) {
  const ball = {
    progress,
    previousProgress: progress,
    baseSpeed: 0.17,
    speed: 0.17,
    power,
    initialPower: power,
    energy,
    maxEnergy: 100,
    alive: true,
    radius: 8,
    laneOffset,
    spreadOffset: 0,
    color,
    triggeredSlotIds: new Set(),
    pierceCharges: 0,
    pierceIgnore: 0,
    speedBoostUntilProgress: 0,
    boostSpeedMultiplier: 1,
    boostDrainMultiplier: 1,
    trail: [],
    x: 0,
    y: 0,
  };
  const point = getPuzzleBallRenderPosition(ball);
  ball.x = point.x;
  ball.y = point.y;
  return ball;
}

function updatePuzzleRun(dt) {
  if (!state.puzzle) return;
  updateParticles(dt);
  updateFloatingTexts(dt);
  for (const slot of state.puzzle.slots) slot.flash = Math.max(0, slot.flash - dt * 2.6);
  if (state.puzzle.coreFlash > 0) state.puzzle.coreFlash = Math.max(0, state.puzzle.coreFlash - dt);
  if (state.puzzle.screenShake > 0) state.puzzle.screenShake = Math.max(0, state.puzzle.screenShake - dt * 18);
  if (state.puzzle.integrityPulse > 0) state.puzzle.integrityPulse = Math.max(0, state.puzzle.integrityPulse - dt);
  if (state.puzzle.puzzleState === "running") updatePuzzleBalls(dt);
}

function updatePuzzleBalls(dt) {
  const puzzle = state.puzzle;
  const spawned = [];
  for (const ball of puzzle.balls) {
    if (!ball.alive) continue;
    ball.previousProgress = ball.progress;
    const boosted = ball.speedBoostUntilProgress > ball.progress;
    const speedMultiplier = boosted ? ball.boostSpeedMultiplier : 1;
    const drainMultiplier = boosted ? ball.boostDrainMultiplier : 1;
    const deltaProgress = ball.baseSpeed * speedMultiplier * dt;
    ball.progress += deltaProgress;
    ball.energy -= deltaProgress * 95 * drainMultiplier;
    ball.spreadOffset *= Math.max(0, 1 - dt * 3);
    puzzle.report.depthReached = Math.max(puzzle.report.depthReached, ball.progress);
    puzzle.bestDepth = Math.max(puzzle.bestDepth, ball.progress);

    handlePuzzleSlots(ball, spawned);
    if (ball.alive) handlePuzzleGlassCollision(ball);
    if (ball.alive && ball.progress >= 1) damagePuzzleCore(ball);
    if (ball.alive && ball.energy <= 0) killPuzzleBall(ball, "NO ENERGY");

    const point = getPuzzleBallRenderPosition(ball);
    ball.x = point.x;
    ball.y = point.y;
    ball.trail.push({ x: ball.x, y: ball.y, energy: ball.energy });
    const maxTrail = Math.round(5 + 12 * clamp(ball.energy / 100, 0, 1));
    if (ball.trail.length > maxTrail) ball.trail.shift();
  }
  puzzle.balls.push(...spawned);
  puzzle.balls = puzzle.balls.filter((ball) => ball.alive);
  if (puzzle.balls.length === 0 && puzzle.puzzleState === "running" && !puzzle.core.broken) completePuzzleAttempt();
}

function handlePuzzleSlots(ball, spawned) {
  const puzzle = state.puzzle;
  for (const slot of puzzle.slots) {
    if (!slot.placedCardId || ball.triggeredSlotIds.has(slot.id)) continue;
    if (ball.previousProgress <= slot.progress && ball.progress >= slot.progress) {
      ball.triggeredSlotIds.add(slot.id);
      const card = getPuzzleCard(slot.placedCardId);
      triggerPuzzleCard(ball, slot, card, spawned);
    }
  }
}

function triggerPuzzleCard(ball, slot, card, spawned) {
  if (!card || card.triggerType === "prelaunch") return;
  const puzzle = state.puzzle;
  const effect = getCardEffectNumbers(card);
  slot.flash = 1;
  const label = `${card.label}${card.level > 1 ? `+${card.level}` : ""}`;
  puzzle.report.cardsTriggered[label] = (puzzle.report.cardsTriggered[label] || 0) + 1;
  const point = getPuzzleTrackPoint(slot.progress);
  addFloatingText(point.x, point.y - 28, label, card.color, 0.95);
  burst(point.x, point.y, card.color, 20, 190);

  if (card.type === "booster") {
    ball.energy = Math.min(ball.maxEnergy, ball.energy + effect.energy);
    ball.speedBoostUntilProgress = Math.max(ball.speedBoostUntilProgress, ball.progress + effect.duration);
    ball.boostSpeedMultiplier = effect.speed;
    ball.boostDrainMultiplier = effect.drain;
    audio.play("upgrade");
  } else if (card.type === "battery") {
    ball.energy = Math.min(effect.cap, ball.energy + effect.energy);
    audio.play("upgrade");
  } else if (card.type === "pierce") {
    ball.pierceCharges += 1;
    ball.pierceIgnore = Math.max(ball.pierceIgnore, effect.ignore);
    audio.play("hit");
  } else if (card.type === "split2" || card.type === "split3") {
    const count = card.type === "split2" ? 2 : 3;
    const offsets = getSpreadLaneOffsets(count);
    ball.alive = false;
    for (let i = 0; i < count; i += 1) {
      const clone = createPuzzleBall(
        ball.progress,
        Math.max(8, ball.energy * effect.energy),
        Math.max(3, ball.power * effect.power),
        clamp(ball.laneOffset + offsets[i], -MAX_LANE_OFFSET, MAX_LANE_OFFSET),
        pickBallColor(count, i),
      );
      clone.triggeredSlotIds = new Set(ball.triggeredSlotIds);
      clone.pierceCharges = ball.pierceCharges;
      clone.pierceIgnore = ball.pierceIgnore;
      clone.speedBoostUntilProgress = ball.speedBoostUntilProgress;
      clone.boostSpeedMultiplier = ball.boostSpeedMultiplier;
      clone.boostDrainMultiplier = ball.boostDrainMultiplier;
      clone.spreadOffset = offsets[i] * 0.45;
      spawned.push(clone);
    }
    audio.play("multiplier");
  }
}

function handlePuzzleGlassCollision(ball) {
  let segment = findPuzzleBlockingSegment(ball.progress);
  while (segment && ball.alive) {
    const hitPoint = getPuzzleTrackPoint((segment.progressStart + segment.progressEnd) * 0.5);
    const pierce = ball.pierceCharges > 0;
    const ignore = pierce ? ball.pierceIgnore || 0.65 : 0;
    const effectiveHp = segment.hp * (1 - ignore);
    if (pierce) {
      ball.pierceCharges -= 1;
      addFloatingText(hitPoint.x, hitPoint.y - 24, "PIERCE", "#ffffff", 0.8);
      burst(hitPoint.x, hitPoint.y, "#ffffff", 12, 220);
    }
    const damage = Math.min(ball.power, effectiveHp);
    segment.hp -= ignore > 0 ? damage / Math.max(0.01, 1 - ignore) : damage;
    ball.energy -= 0.25 + damage * 0.01;
    if (segment.hp <= 0 || damage >= effectiveHp) {
      segment.hp = 0;
      segment.broken = true;
      puzzleIncrementBroken(segment);
      ball.power = Math.max(1, ball.power - effectiveHp * 0.009 - 0.03);
      ball.energy -= 0.2;
      addFloatingText(hitPoint.x, hitPoint.y - 16, "BREAK", "#baf5ff", 0.68);
      burst(hitPoint.x, hitPoint.y, "#baf5ff", segment.crackWeak ? 28 : 18, 170);
      audio.play("break");
      segment = findPuzzleBlockingSegment(ball.progress);
      continue;
    }
    addFloatingText(hitPoint.x, hitPoint.y - 14, `-${Math.ceil(damage)}`, "#ffb6b6", 0.65);
    burst(hitPoint.x, hitPoint.y, "#ffb6b6", 8, 120);
    audio.play("hit");
    ball.alive = false;
  }
}

function puzzleIncrementBroken(segment) {
  if (!segment.countedBroken) {
    segment.countedBroken = true;
    state.puzzle.report.glassBroken += 1;
  }
}

function damagePuzzleCore(ball) {
  const puzzle = state.puzzle;
  const energyRatio = clamp(ball.energy / Math.max(1, ball.maxEnergy), 0, 1.4);
  let damage = ball.power * (0.65 + energyRatio * 0.7) * 6;
  if (puzzle.core.armor > 0) {
    const before = damage;
    damage = Math.max(1, damage - puzzle.core.armor);
    addFloatingText(getPuzzleTrackPoint(1).x, getPuzzleTrackPoint(1).y - 58, `ARMOR -${Math.ceil(before - damage)}`, "#b9dbe4", 0.7);
  }
  const applied = Math.min(damage, puzzle.core.hp);
  puzzle.core.hp = Math.max(0, puzzle.core.hp - damage);
  puzzle.report.coreDamage += applied;
  puzzle.bestDamage = Math.max(puzzle.bestDamage, puzzle.level.coreHp - puzzle.core.hp);
  ball.alive = false;
  const corePoint = getPuzzleTrackPoint(1);
  addFloatingText(corePoint.x, corePoint.y - 38, `CORE -${Math.ceil(applied)}`, "#ffffff", 1);
  burst(corePoint.x, corePoint.y, "#ffffff", 36, 260);
  puzzle.coreFlash = 0.8;
  puzzle.screenShake = 5;
  audio.play("coreHit");
  if (puzzle.core.hp <= 0) solvePuzzleRoom();
}

function killPuzzleBall(ball, label) {
  ball.alive = false;
  addFloatingText(ball.x, ball.y - 18, label, "#ffb6b6", 0.7);
  burst(ball.x, ball.y, "#ffb6b6", 10, 110);
  audio.play("denied");
}

function completePuzzleAttempt() {
  const puzzle = state.puzzle;
  puzzle.report.depthReached = Math.min(1, puzzle.report.depthReached);
  puzzle.bestDepth = Math.max(puzzle.bestDepth, puzzle.report.depthReached);
  const loss = calculatePuzzleIntegrityLoss(puzzle.report);
  puzzle.report.integrityLost = loss;
  applyPuzzleIntegrityLoss(loss);
  if (puzzle.integrity <= 0) {
    failPuzzleRun();
    return;
  }
  puzzle.failedAttemptsInRoom += 1;
  puzzle.puzzleState = "attemptComplete";
  audio.play("denied");
}

function calculatePuzzleIntegrityLoss(stats) {
  const base = { safe: 5, normal: 7, risky: 10, elite: 14, boss: 18 }[state.puzzle.level.difficulty] || 7;
  let loss = base + state.puzzle.failedAttemptsInRoom;
  if (stats.depthReached >= 0.5) loss -= 2;
  if (stats.depthReached >= 0.75) loss -= 2;
  if (stats.coreDamage > 0) loss -= 3;
  if (stats.glassBroken >= 10) loss -= 1;
  return Math.max(2, Math.round(loss));
}

function applyPuzzleIntegrityLoss(amount) {
  const puzzle = state.puzzle;
  puzzle.integrity = Math.max(0, puzzle.integrity - amount);
  puzzle.integrityPulse = 0.75;
  addFloatingText(CENTER.x, 70, `Integrity -${amount}`, "#ff8c8c", 0.95);
}

function solvePuzzleRoom() {
  const puzzle = state.puzzle;
  puzzle.core.hp = 0;
  puzzle.core.broken = true;
  puzzle.balls = [];
  puzzle.roomsSolved = Math.max(puzzle.roomsSolved, puzzle.roomIndex + 1);
  const corePoint = getPuzzleTrackPoint(1);
  burst(corePoint.x, corePoint.y, "#fff37a", 100, 380);
  puzzle.screenShake = 13;
  audio.play("victory");
  if (puzzle.roomIndex >= PUZZLE_TOTAL_ROOMS - 1) {
    puzzle.puzzleState = "runCleared";
    return;
  }
  puzzle.rewardChoices = generatePuzzleRewards();
  puzzle.selectedReward = null;
  puzzle.rewardResolved = false;
  puzzle.puzzleState = "rewardChoice";
}

function failPuzzleRun() {
  state.puzzle.balls = [];
  state.puzzle.puzzleState = "runFailed";
  audio.play("denied");
}

function generatePuzzleRewards() {
  const puzzle = state.puzzle;
  const rarityPool = getPuzzleRewardRarities(puzzle.level.difficulty);
  const options = [];
  let guard = 0;
  while (options.length < 3 && guard < 80) {
    guard += 1;
    const rarity = rarityPool[Math.floor(Math.random() * rarityPool.length)];
    const reward = createPuzzleRewardOption(rarity);
    if (!reward) continue;
    const key = `${reward.type}-${reward.cardType || reward.cardInstanceId || reward.amount}`;
    if (options.some((option) => option.key === key)) continue;
    reward.key = key;
    options.push(reward);
  }
  if (options.length === 0) options.push({ type: "restoreIntegrity", title: "Restore Integrity", description: "Restore +15 Integrity.", amount: 15, rarity: "common", key: "fallback" });
  return options.slice(0, 3);
}

function getPuzzleRewardRarities(difficulty) {
  if (difficulty === "elite") return ["uncommon", "uncommon", "rare", "common"];
  if (difficulty === "risky") return ["common", "uncommon", "uncommon", "rare"];
  return ["common", "common", "common", "uncommon"];
}

function createPuzzleRewardOption(rarity) {
  const common = [
    () => createAddCardReward("booster", rarity),
    () => createAddCardReward("battery", rarity),
    () => createUpgradeReward("booster", rarity),
    () => createUpgradeReward("battery", rarity),
    () => ({ type: "restoreIntegrity", title: "Restore +15 Integrity", description: "Restore 15 Integrity.", amount: 15, rarity }),
  ];
  const uncommon = [
    () => createAddCardReward("pierce", rarity),
    () => createAddCardReward("crack", rarity),
    () => createUpgradeReward("pierce", rarity),
    () => createUpgradeReward("crack", rarity),
    () => createAddCardReward("split2", rarity),
    () => ({ type: "maxIntegrity", title: "Max Integrity +10", description: "+10 max Integrity and +10 current Integrity.", amount: 10, rarity }),
  ];
  const rare = [
    () => createAddCardReward("split3", rarity),
    () => createUpgradeReward("split2", rarity),
    () => createUpgradeReward("split3", rarity),
    () => ({ type: "restoreIntegrity", title: "Restore +25 Integrity", description: "Restore 25 Integrity.", amount: 25, rarity }),
  ];
  const pool = { common, uncommon, rare }[rarity] || common;
  for (let i = 0; i < 12; i += 1) {
    const reward = pool[Math.floor(Math.random() * pool.length)]();
    if (reward) return reward;
  }
  return null;
}

function createAddCardReward(cardType, rarity) {
  const def = getCardDefinition(cardType);
  return {
    type: "addCard",
    cardType,
    rarity,
    title: `Add ${def.name}`,
    description: `Add a Lv.1 ${def.name} card to your Puzzle deck.`,
  };
}

function createUpgradeReward(cardType, rarity) {
  const candidates = state.puzzle.deck.filter((card) => card.type === cardType && card.level < 3);
  if (candidates.length === 0) return null;
  const card = candidates[Math.floor(Math.random() * candidates.length)];
  const def = getCardDefinition(card.type);
  return {
    type: "upgradeCard",
    cardInstanceId: card.instanceId,
    rarity,
    title: `Upgrade ${def.name}`,
    description: `${def.name} Lv.${card.level} -> Lv.${card.level + 1}.`,
  };
}

function applyPuzzleReward(reward) {
  const puzzle = state.puzzle;
  if (!reward || puzzle.puzzleState !== "rewardChoice" || puzzle.rewardResolved) {
    audio.play("denied");
    return;
  }
  if (reward.type === "addCard") addCardToPuzzleDeck(reward.cardType, 1);
  if (reward.type === "upgradeCard") upgradeCardInstance(reward.cardInstanceId);
  if (reward.type === "restoreIntegrity") puzzle.integrity = Math.min(puzzle.maxIntegrity, puzzle.integrity + reward.amount);
  if (reward.type === "maxIntegrity") {
    puzzle.maxIntegrity += reward.amount;
    puzzle.integrity = Math.min(puzzle.maxIntegrity, puzzle.integrity + reward.amount);
  }
  puzzle.selectedReward = reward;
  puzzle.rewardResolved = true;
  puzzle.puzzleState = "nextRoomReady";
  addFloatingText(CENTER.x, 76, "Reward acquired", "#fff37a", 0.9);
  audio.play("upgrade");
}

function upgradeCardInstance(cardInstanceId) {
  const card = state.puzzle.deck.find((item) => item.instanceId === cardInstanceId);
  if (card) card.level = Math.min(3, card.level + 1);
}

function enterNextPuzzleRoom() {
  const puzzle = state.puzzle;
  if (puzzle.roomIndex >= PUZZLE_TOTAL_ROOMS - 1) {
    puzzle.puzzleState = "runCleared";
    return;
  }
  enterPuzzleRoom(puzzle, puzzle.roomIndex + 1);
  audio.play("uiClick");
}

function handleSpace() {
  if (state.mapOverlayOpen) return;

  if (state.phase === "nextLevelReady") {
    audio.play("uiClick");
    startLevel(state.selectedNextLevel, state.room + 1);
    return;
  }

  if (state.phase === "nextChamberChoice") {
    audio.play("denied");
    return;
  }

  if (state.phase === "actCleared") {
    audio.play("uiClick");
    resetRun();
    return;
  }

  if (state.phase === "idle" || state.phase === "waveComplete") {
    launchWave();
  }
}

function toggleMapOverlay() {
  if (state.phase === "running") {
    audio.play("denied");
    return;
  }
  state.mapOverlayOpen = !state.mapOverlayOpen;
  audio.play("uiClick");
}

function getMousePos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

function updateHoverState() {
  const hovered = [...state.interactiveRects].reverse().find((item) =>
    pointInRect(state.mouse.x, state.mouse.y, item.rect),
  );
  if (hovered?.id !== state.hoveredInteractive?.id) {
    const now = performance.now();
    if (hovered && now - state.lastHoverSoundAt > 150) {
      audio.play("uiClick");
      state.lastHoverSoundAt = now;
    }
  }
  state.hoveredInteractive = hovered || null;
  canvas.style.cursor = hovered ? "pointer" : "default";
}

function handleCanvasClick() {
  const hovered = state.hoveredInteractive;
  if (!hovered) return;

  if (state.appState === "mainMenu" && hovered.type === "menuItem") {
    state.menuSelection = hovered.payload.index;
    activateMenuItem(hovered.payload.index);
    return;
  }

  if (state.appState === "puzzleRun") {
    if (hovered.type === "puzzleCard") {
      selectPuzzleCard(hovered.payload.cardId);
      return;
    }
    if (hovered.type === "puzzleReward") {
      applyPuzzleReward(state.puzzle.rewardChoices[hovered.payload.index]);
      return;
    }
    if (hovered.type === "puzzleSlot") {
      const slot = getPuzzleSlot(hovered.payload.slotId);
      if (slot?.placedCardId) removePuzzleCardFromSlot(slot.id);
      else if (state.puzzle?.selectedCardId) placePuzzleCard(slot.id, state.puzzle.selectedCardId);
      else audio.play("denied");
      return;
    }
    if (hovered.type === "puzzleAction") {
      if (hovered.payload.action === "launch") startPuzzleAttempt();
      if (hovered.payload.action === "clear") clearPuzzlePlacements();
      return;
    }
  }

  if (state.appState !== "arcadeRun") return;

  if (hovered.type === "reward" && state.phase === "rewardChoice") {
    chooseReward(hovered.payload.index);
    return;
  }
  if (hovered.type === "chamber" && state.phase === "nextChamberChoice") {
    chooseNextChamber(hovered.payload.index);
    return;
  }
  if (hovered.type === "mapNode") {
    const index = state.nextChoiceNodes.findIndex((node) => node.id === hovered.payload.nodeId);
    if (state.phase === "nextChamberChoice" && index >= 0) {
      chooseNextChamber(index);
    } else {
      audio.play("denied");
    }
  }
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function addInteractiveRect(type, rect, payload = {}, tooltip = null) {
  const item = {
    id: `${type}-${state.interactiveRects.length}`,
    type,
    rect,
    payload,
    tooltip,
  };
  state.interactiveRects.push(item);
  return item;
}

function handleNumberKey(index, upgradeType) {
  if (state.mapOverlayOpen) return;

  if (state.phase === "rewardChoice") {
    chooseReward(index);
    return;
  }

  if (state.phase === "nextChamberChoice") {
    chooseNextChamber(index);
    return;
  }

  buyUpgrade(upgradeType);
}

function resetRun() {
  state.room = 1;
  state.shards = 0;
  state.totalLaunches = 0;
  state.upgrades = { power: 0, speed: 0, balls: 0 };
  state.rewards = [];
  state.rewardChoices = [];
  state.selectedReward = null;
  state.previousLevelId = null;
  state.nextChoices = [];
  state.nextChoiceNodes = [];
  state.selectedNextLevel = null;
  state.selectedNextNodeId = null;
  state.mapOverlayOpen = false;
  state.actMap = createInitialActMap();
  startLevel(TUTORIAL_LEVEL, 1);
}

function startLevel(levelTemplate, room) {
  state.phase = "idle";
  state.room = room;
  state.level = prepareLevel(levelTemplate, room);
  state.previousLevelId = state.level.id;
  state.track = generateTrack(state.level);
  state.segments = generateGlassSegments(state.level);
  state.multipliers = createMultipliers(state.level);
  state.balls = [];
  state.particles = [];
  state.floatingTexts = [];
  state.launches = 0;
  state.bestDepth = 0;
  state.levelShardsEarned = 0;
  state.levelFirstHitUsed = false;
  state.levelMultiplierPolishUsed = false;
  state.rewardChoices = [];
  state.selectedReward = null;
  state.nextChoices = [];
  state.nextChoiceNodes = [];
  state.selectedNextLevel = null;
  state.selectedNextNodeId = null;
  state.levelVictoryTimer = 0;
  state.transitionFade = 1;
  state.core = {
    hp: state.level.coreHp,
    maxHp: state.level.coreHp,
    broken: false,
  };
  updateActMapForEnteredLevel(state.level, room);
  state.waveStats = null;
  state.waveReport = null;
  state.coreFlash = 0;
  state.screenShake = 0;
  addFloatingText(CENTER.x, 76, state.level.name, getTheme().accentColor, 1.15);
  updateHud();
}

function prepareLevel(template, room) {
  const level = structuredClone(template);
  level.room = room;
  level.modifiers = level.modifiers || [];
  level.difficulty = level.difficulty || "normal";
  level.modifierDetails = level.modifiers.map((id) => LEVEL_MODIFIERS[id]).filter(Boolean);

  const difficulty = DIFFICULTY[level.difficulty];
  const roomIndex = Math.max(0, room - 1);
  const bossScale = level.difficulty === "boss" ? 1.12 : 1;
  level.glassHpScale = difficulty.glassHpScale * (1 + roomIndex * 0.08) * bossScale;
  level.coreHpScale = difficulty.coreHpScale * (1 + roomIndex * 0.1) * bossScale;
  level.shardMultiplier = difficulty.shardMultiplier;

  if (hasLevelModifier(level, "brittleGlass")) {
    level.glassHpScale *= 0.75;
    level.coreHpScale *= 1.35;
  }
  if (hasLevelModifier(level, "multiplierRush")) level.glassHpScale *= 1.2;
  if (hasLevelModifier(level, "richChamber")) level.glassHpScale *= 1.25;

  level.coreHp = Math.max(1, Math.round(level.coreHp * level.coreHpScale));
  level.multipliers = level.multipliers.map((multiplier) => ({
    ...multiplier,
    value:
      hasLevelModifier(level, "multiplierRush") && multiplier.value >= 2
        ? multiplier.value + 1
        : multiplier.value,
  }));
  return level;
}

function generateTrack(level) {
  const generators = {
    spiral: generateSpiralTrack,
    snake: generateSnakeTrack,
    rings: generateRingsTrack,
    clover: generateCloverTrack,
    zigzagCoil: generateZigzagCoilTrack,
    brokenSpiral: generateBrokenSpiralTrack,
  };

  const points = generators[level.trackType]?.(level) || generateSpiralTrack(level);
  return normalizeTrack(points);
}

function generateSpiralTrack(level) {
  const points = [];
  const turns = level.turns || 3.55;
  const samples = 860;
  const outerRadius = 382;
  const innerRadius = 30;
  const startAngle = -Math.PI * 0.12;

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const eased = t ** 0.93;
    const angle = startAngle + eased * turns * TAU;
    const radius = outerRadius * (1 - t) + innerRadius * t;
    points.push({
      x: CENTER.x + Math.cos(angle) * radius,
      y: CENTER.y + Math.sin(angle) * radius,
    });
  }

  return points;
}

function generateSnakeTrack() {
  const points = [];
  const samples = 820;
  const start = { x: 92, y: 190 };
  const end = { x: CENTER.x + 20, y: CENTER.y + 8 };

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const wave = Math.sin(t * Math.PI * 7.2 - Math.PI * 0.58);
    const amp = 265 * (1 - t * 0.58);
    const x = lerp(start.x, end.x, t);
    const y = lerp(start.y, end.y, t) + wave * amp * 0.74;
    points.push({ x, y });
  }

  return points;
}

function generateRingsTrack() {
  const points = [];
  const samples = 860;
  const startAngle = -Math.PI * 0.15;

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const angle = startAngle + t * TAU * 3.9;
    const ringStep = Math.floor(t * 4);
    const local = (t * 4) % 1;
    const ringRadius = 352 - ringStep * 76;
    const transition = smoothstep(local);
    const radius = Math.max(34, ringRadius - transition * 45 - t * 12);
    points.push({
      x: CENTER.x + Math.cos(angle) * radius,
      y: CENTER.y + Math.sin(angle) * radius,
    });
  }

  points.push({ x: CENTER.x, y: CENTER.y });
  return points;
}

function generateCloverTrack() {
  const points = [];
  const samples = 860;
  const turns = 2.9;
  const lobes = 4;
  const startAngle = -Math.PI * 0.48;

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const angle = startAngle + t * TAU * turns;
    const baseRadius = 360 * (1 - t) + 28 * t;
    const petal = 1 + Math.sin(angle * lobes) * 0.28 * (1 - t * 0.45);
    const radius = baseRadius * petal;
    points.push({
      x: CENTER.x + Math.cos(angle) * radius,
      y: CENTER.y + Math.sin(angle) * radius,
    });
  }

  return points;
}

function generateZigzagCoilTrack() {
  const points = [];
  const samples = 820;
  const anchors = [
    { x: 110, y: 145 },
    { x: 790, y: 235 },
    { x: 160, y: 345 },
    { x: 760, y: 465 },
    { x: 190, y: 590 },
    { x: 650, y: 690 },
    { x: CENTER.x + 40, y: CENTER.y + 24 },
  ];

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const scaled = t * (anchors.length - 1);
    const index = Math.min(Math.floor(scaled), anchors.length - 2);
    const local = smoothstep(scaled - index);
    const a = anchors[index];
    const b = anchors[index + 1];
    const wobble = Math.sin(t * Math.PI * 9) * 18 * (1 - t * 0.55);
    points.push({
      x: lerp(a.x, b.x, local),
      y: lerp(a.y, b.y, local) + wobble,
    });
  }

  return points;
}

function generateBrokenSpiralTrack(level) {
  const points = [];
  const turns = level.turns || 3.25;
  const samples = 840;
  const outerRadius = 382;
  const innerRadius = 28;
  const startAngle = -Math.PI * 0.08;

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const kink = Math.sin(t * Math.PI * 9) * 0.18 + Math.sin(t * Math.PI * 17) * 0.06;
    const angle = startAngle + t ** 0.9 * turns * TAU + kink;
    const squeeze = Math.sin(t * Math.PI * 6) * 24 * (1 - t);
    const radius = outerRadius * (1 - t) + innerRadius * t + squeeze;
    points.push({
      x: CENTER.x + Math.cos(angle) * radius,
      y: CENTER.y + Math.sin(angle) * radius,
    });
  }

  return points;
}

function normalizeTrack(points) {
  const normalized = [];
  let totalLength = 0;
  let previous = null;

  for (const rawPoint of points) {
    const point = {
      x: clamp(rawPoint.x, 48, WIDTH - 48),
      y: clamp(rawPoint.y, 48, HEIGHT - 48),
      distance: totalLength,
      progress: 0,
    };

    if (previous) {
      totalLength += distance(previous, point);
      point.distance = totalLength;
    }

    normalized.push(point);
    previous = point;
  }

  for (let i = 0; i < normalized.length; i += 1) {
    normalized[i].progress = i / (normalized.length - 1);
    normalized[i].pathProgress = totalLength > 0 ? normalized[i].distance / totalLength : 0;
  }

  return normalized;
}

function generateGlassSegments(level) {
  const segments = [];
  const count = level.segments;

  for (let i = 0; i < count; i += 1) {
    const start = i / count;
    const end = (i + 0.82) / count;
    const mid = (start + end) * 0.5;
    const curve = level.hpCurve;
    const baseHp = curve.start + (curve.end - curve.start) * mid ** curve.exponent;
    const boost = curve.midBoost ? Math.sin(Math.PI * mid) * curve.midBoost : 0;
    let hp = (baseHp + boost) * level.glassHpScale;
    if (hasLevelModifier(level, "denseMiddle") && mid >= 0.35 && mid <= 0.7) hp *= 1.45;
    if (hasLevelModifier(level, "crackedStart") && mid < 0.25) hp *= 0.5;
    if (hasLevelModifier(level, "crackedStart") && mid > 0.75) hp *= 1.25;
    const maxHp = Math.max(1, Math.round(hp));

    segments.push({
      id: i,
      progressStart: start,
      progressEnd: Math.min(end, 1),
      hp: maxHp,
      maxHp,
      broken: false,
      cracks: createCracks(i),
    });
  }

  return segments;
}

function createCracks(seed) {
  const cracks = [];
  let value = seed * 9301 + 49297;

  for (let i = 0; i < 4; i += 1) {
    value = (value * 233280 + 12345) % 99991;
    const a = (value % 1000) / 1000;
    value = (value * 233280 + 12345) % 99991;
    const b = (value % 1000) / 1000;
    cracks.push({ a, b: b * 2 - 1 });
  }

  return cracks;
}

function createMultipliers(level) {
  return level.multipliers.map((multiplier, index) => ({
    id: `m${index}-${multiplier.progress}`,
    progress: multiplier.progress,
    value: multiplier.value,
    triggered: 0,
    flash: 0,
    point: getPointAtProgress(multiplier.progress),
  }));
}

function launchWave() {
  state.phase = "running";
  state.launches += 1;
  state.totalLaunches += 1;
  state.waveReport = null;
  state.waveStats = createWaveStats();

  const startBalls = getStartBalls();
  const startPoint = getPointAtProgress(0);
  const laneOffsets = getStartLaneOffsets(startBalls);

  for (let i = 0; i < startBalls; i += 1) {
    state.balls.push(createBall(0, getBallPower(), getBallSpeed(), laneOffsets[i], "#f8fbff"));
  }

  audio.play("launch");
  burst(startPoint.x, startPoint.y, getTheme().glassTint, 12 + startBalls * 6, 120);
  updateHud();
}

function createWaveStats() {
  return {
    depthReached: 0,
    previousBestDepth: state.bestDepth,
    glassBrokenThisWave: 0,
    damageDealt: 0,
    multiplierCounts: {},
    shardsEarned: 0,
    cleanBreakBonus: 0,
    coreBroken: false,
  };
}

function createBall(progress, power, speed, laneOffset, color, spreadOffset = 0) {
  const ball = {
    progress,
    speed,
    power,
    initialPower: power,
    alive: true,
    radius: 8,
    color,
    triggeredMultipliers: new Set(),
    laneOffset: clamp(laneOffset, -MAX_LANE_OFFSET, MAX_LANE_OFFSET),
    spreadOffset: clamp(spreadOffset, -MAX_LANE_OFFSET, MAX_LANE_OFFSET),
    impactCooldown: 0,
    x: 0,
    y: 0,
    trail: [],
  };
  const renderPosition = getBallRenderPosition(ball);
  ball.x = renderPosition.x;
  ball.y = renderPosition.y;
  return ball;
}

function tick(time) {
  const dt = Math.min((time - state.lastTime) / 1000 || 0, 0.033);
  state.lastTime = time;

  if (state.appState === "arcadeRun") updateArcadeRun(dt);
  if (state.appState === "puzzleRun") updatePuzzleRun(dt);
  draw();
  requestAnimationFrame(tick);
}

function updateArcadeRun(dt) {
  updateBalls(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
  updateMultipliers(dt);

  if (state.phase === "running" && state.balls.length === 0 && !state.core.broken) {
    completeWave();
  }

  if (state.phase === "levelVictory") {
    state.levelVictoryTimer -= dt;
    if (state.levelVictoryTimer <= 0) state.phase = "rewardChoice";
  }

  if (state.coreFlash > 0) state.coreFlash = Math.max(0, state.coreFlash - dt);
  if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt * 18);
  if (state.transitionFade > 0) state.transitionFade = Math.max(0, state.transitionFade - dt * 1.35);

  updateHud();
}

function updateBalls(dt) {
  if (state.phase !== "running") return;

  const spawned = [];

  for (const ball of state.balls) {
    if (!ball.alive) continue;
    if (state.phase !== "running") break;

    ball.impactCooldown = Math.max(0, ball.impactCooldown - dt);
    ball.spreadOffset *= Math.max(0, 1 - dt * 2.8);
    ball.progress += ball.speed * dt;
    updateWaveStats(ball.progress);

    handleMultipliers(ball, spawned);
    handleGlassCollision(ball);

    if (ball.progress >= 1 && ball.alive) {
      const corePoint = getPointAtProgress(1);
      ball.x = corePoint.x;
      ball.y = corePoint.y;
      damageCore(ball.power, ball);
    }

    const renderPosition = getBallRenderPosition(ball);
    ball.x = renderPosition.x;
    ball.y = renderPosition.y;
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 12) ball.trail.shift();
  }

  if (state.phase !== "running") {
    state.balls = [];
    return;
  }

  state.balls.push(...spawned);
  state.balls = state.balls.filter((ball) => ball.alive);
}

function updateWaveStats(progress) {
  if (!state.waveStats) return;
  const depth = clamp(progress, 0, 1);
  state.waveStats.depthReached = Math.max(state.waveStats.depthReached, depth);
  state.bestDepth = Math.max(state.bestDepth, depth);
}

function handleGlassCollision(ball) {
  if (ball.impactCooldown > 0) return;

  let segment = findBlockingSegment(ball.progress);

  while (segment && ball.alive) {
    const hitPoint = getPointAtProgress(segment.progressStart);
    const damage = getGlassDamage(ball.power);
    const appliedDamage = Math.min(damage, segment.hp);
    segment.hp -= damage;
    ball.impactCooldown = 0.045;
    ball.progress = Math.max(ball.progress, segment.progressEnd + 0.001);
    updateWaveStats(ball.progress);
    state.waveStats.damageDealt += appliedDamage;

    addFloatingText(hitPoint.x, hitPoint.y, `-${Math.ceil(appliedDamage)}`, getTheme().glassTint);
    burst(hitPoint.x, hitPoint.y, segment.hp <= 0 ? "#ffffff" : getTheme().glassTint, 16, 165);
    addScreenShake(appliedDamage > 10 ? 2.4 : 1.1);

    if (segment.hp <= 0) {
      const overflow = Math.abs(segment.hp);
      segment.broken = true;
      segment.hp = 0;
      state.waveStats.glassBrokenThisWave += 1;
      if (hasReward("cleanBreak") && getBrokenGlassCount() % 10 === 0) {
        state.waveStats.cleanBreakBonus += 5;
        addFloatingText(hitPoint.x, hitPoint.y - 40, "+5 SHARDS", "#fff37a", 0.85);
      }
      const nextPower = Math.max(1, hasLevelModifier(state.level, "fragileBalls") ? overflow / 1.35 : overflow);
      if (hasLevelModifier(state.level, "fragileBalls") && ball.power - nextPower > 4) {
        burst(hitPoint.x, hitPoint.y, "#fff37a", 8, 120);
      }
      ball.power = nextPower;
      ball.speed = Math.min(ball.speed + 0.008, 0.25);
      addFloatingText(hitPoint.x, hitPoint.y - 20, "BREAK", "#ffffff", 0.9);
      burst(hitPoint.x, hitPoint.y, "#ffffff", 30, 235);
      addScreenShake(3.2);
      audio.play("break");
      segment = findBlockingSegment(ball.progress);
      continue;
    }

    audio.play("hit");
    ball.alive = false;
  }
}

function findBlockingSegment(progress) {
  return state.segments.find(
    (segment) =>
      !segment.broken &&
      progress >= segment.progressStart &&
      progress <= segment.progressEnd + 0.004,
  );
}

function handleMultipliers(ball, spawned) {
  for (const multiplier of state.multipliers) {
    if (ball.progress < multiplier.progress) continue;
    if (ball.triggeredMultipliers.has(multiplier.id)) continue;

    ball.triggeredMultipliers.add(multiplier.id);
    multiplier.triggered += 1;
    multiplier.flash = 1;

    const value = getEffectiveMultiplierValue(multiplier);
    const label = `x${value}`;
    state.waveStats.multiplierCounts[label] =
      (state.waveStats.multiplierCounts[label] || 0) + 1;

    audio.play("multiplier");
    burst(multiplier.point.x, multiplier.point.y, "#fff37a", 30, 250);
    addFloatingText(multiplier.point.x, multiplier.point.y - 24, `${label}!`, "#fff37a", 1.1);
    addScreenShake(1.6 + value * 0.3);

    if (value <= 1) {
      ball.color = "#d9fff2";
      continue;
    }

    const copies = value - 1;
    const laneOffsets = getSpreadLaneOffsets(value);

    for (let i = 0; i < copies; i += 1) {
      const clone = {
        ...ball,
        power: Math.max(2, Math.ceil(ball.power * 0.84)),
        radius: Math.max(6, ball.radius - 1),
        color: pickBallColor(value, i),
        triggeredMultipliers: new Set(ball.triggeredMultipliers),
        laneOffset: clamp(ball.laneOffset + laneOffsets[i + 1], -MAX_LANE_OFFSET, MAX_LANE_OFFSET),
        spreadOffset: laneOffsets[i + 1] * 0.5,
        impactCooldown: 0.06,
        trail: [],
      };
      spawned.push(clone);
    }

    ball.laneOffset = clamp(ball.laneOffset + laneOffsets[0], -MAX_LANE_OFFSET, MAX_LANE_OFFSET);
    ball.spreadOffset = laneOffsets[0] * 0.5;
  }
}

function completeWave() {
  const shardsEarned = earnShards(state.waveStats);
  state.shards += shardsEarned;
  state.levelShardsEarned += shardsEarned;
  state.waveStats.shardsEarned = shardsEarned;
  state.waveReport = { ...state.waveStats };
  state.phase = "waveComplete";
  state.waveStats = null;
  applyGlassRegen();
  updateHud();
}

function earnShards(stats) {
  let shards = 0;
  shards += stats.glassBrokenThisWave;
  shards += Math.floor(stats.damageDealt / 25);
  if (stats.depthReached > stats.previousBestDepth + 0.001) shards += 5;
  if (stats.coreBroken) shards += 25;
  shards += stats.cleanBreakBonus || 0;
  if (hasReward("glassTax")) shards = Math.ceil(shards * 1.2);
  shards = Math.ceil(shards * state.level.shardMultiplier);
  return shards;
}

function applyGlassRegen() {
  if (!hasLevelModifier(state.level, "glassRegen")) return;
  let shown = 0;
  for (const segment of state.segments) {
    if (segment.broken || segment.hp >= segment.maxHp) continue;
    const before = segment.hp;
    segment.hp = Math.min(segment.maxHp, segment.hp + (segment.maxHp - segment.hp) * 0.1);
    if (shown < 4 && segment.hp > before) {
      const point = getPointAtProgress((segment.progressStart + segment.progressEnd) * 0.5);
      addFloatingText(point.x, point.y, "+regen", "#80ffd4", 0.7);
      shown += 1;
    }
  }
}

function buyUpgrade(type) {
  if (state.phase !== "idle" && state.phase !== "waveComplete") {
    audio.play("denied");
    return;
  }
  if (state.core.broken) return;

  const price = getUpgradeCost(type);
  if (state.shards < price) {
    addFloatingText(CENTER.x, 82, "not enough shards", "#ffb6b6", 0.75);
    audio.play("denied");
    return;
  }

  state.shards -= price;
  state.upgrades[type] += 1;
  state.waveReport = null;
  addFloatingText(CENTER.x, 76, `${type.toUpperCase()} +`, "#fff37a", 0.9);
  audio.play("upgrade");
  updateHud();
}

function createRewardChoices() {
  const owned = new Set(state.rewards.map((reward) => reward.id));
  const available = REWARD_POOL.filter((reward) => !owned.has(reward.id));
  const choices = [];
  let seed = state.room * 17 + state.totalLaunches * 31 + state.shards;

  if (["elite"].includes(state.level.difficulty)) {
    const rare = available.find((reward) => reward.tier === "rare");
    if (rare) {
      choices.push(rare);
      available.splice(available.indexOf(rare), 1);
    }
  } else if (state.level.difficulty === "risky" && seed % 2 === 0) {
    const rare = available.find((reward) => reward.tier === "rare");
    if (rare) {
      choices.push(rare);
      available.splice(available.indexOf(rare), 1);
    }
  }

  while (choices.length < 3 && available.length > 0) {
    seed = (seed * 9301 + 49297) % 233280;
    const index = seed % available.length;
    choices.push(available.splice(index, 1)[0]);
  }

  return choices;
}

function chooseReward(index) {
  const reward = state.rewardChoices[index];
  if (!reward) {
    audio.play("denied");
    return;
  }

  state.selectedReward = reward;
  state.rewards.push(reward);
  state.nextChoices = createNextChamberChoices();
  syncAvailableMapNodes();
  if (state.nextChoices.length === 1 && state.nextChoices[0].difficulty === "boss") {
    state.selectedNextLevel = state.nextChoices[0];
    state.selectedNextNodeId = state.nextChoiceNodes[0]?.id || null;
    state.phase = "nextLevelReady";
  } else {
    state.phase = "nextChamberChoice";
  }
  audio.play("upgrade");
  addFloatingText(CENTER.x, 100, `${reward.name} acquired`, "#fff37a", 1);
  updateHud();
}

function createNextChamberChoices() {
  if (state.room >= ACT_ROOMS - 1) return [BOSS_LEVEL];

  const pool = LEVEL_POOL.filter((level) => {
    if (level.id === TUTORIAL_LEVEL.id) return false;
    if (level.id === state.previousLevelId) return false;
    if (state.room < 3 && level.difficulty === "elite") return false;
    return true;
  });
  const choices = [];
  let seed = state.room * 101 + state.totalLaunches * 17 + state.shards * 7;

  if (state.room <= 3) {
    const normal = pool.find((level) => level.difficulty === "normal" || level.difficulty === "safe");
    if (normal) choices.push(normal);
  }

  while (choices.length < 3 && pool.length > 0) {
    seed = (seed * 9301 + 49297) % 233280;
    const index = seed % pool.length;
    const [choice] = pool.splice(index, 1);
    if (!choices.some((level) => level.id === choice.id)) choices.push(choice);
  }

  return choices.slice(0, 3);
}

function chooseNextChamber(index) {
  const level = state.nextChoices[index];
  if (!level) {
    audio.play("denied");
    return;
  }

  state.selectedNextLevel = level;
  state.selectedNextNodeId = state.nextChoiceNodes[index]?.id || null;
  for (const row of state.actMap) {
    for (const node of row) node.selected = node.id === state.selectedNextNodeId;
  }
  state.phase = "nextLevelReady";
  audio.play("uiClick");
  addFloatingText(CENTER.x, 100, `${level.name} selected`, getTheme().accentColor, 0.95);
}

function createInitialActMap() {
  const rows = [];
  rows.push([createMapNode(TUTORIAL_LEVEL, 1, 0, { discovered: true, current: true })]);
  for (let room = 2; room <= ACT_ROOMS - 1; room += 1) {
    rows.push(Array.from({ length: 3 }, (_, lane) => createMapPlaceholder(room, lane)));
  }
  rows.push([createMapNode(BOSS_LEVEL, ACT_ROOMS, 1, { discovered: true, isBoss: true })]);
  return rows;
}

function createMapNode(template, room, lane, flags = {}) {
  return {
    id: `room-${room}-${lane}-${template.id}`,
    room,
    lane,
    template,
    name: template.name,
    difficulty: template.difficulty,
    archetype: template.archetype,
    trackType: template.trackType,
    isBoss: template.difficulty === "boss",
    discovered: false,
    cleared: false,
    current: false,
    available: false,
    selected: false,
    ...flags,
  };
}

function createMapPlaceholder(room, lane) {
  return {
    id: `room-${room}-${lane}-unknown`,
    room,
    lane,
    template: null,
    name: "Unknown",
    difficulty: room >= 4 ? "risky" : "normal",
    archetype: "?",
    trackType: "?",
    isBoss: false,
    discovered: false,
    cleared: false,
    current: false,
    available: false,
    selected: false,
  };
}

function updateActMapForEnteredLevel(level, room) {
  for (const row of state.actMap) {
    for (const node of row) {
      node.current = false;
      node.available = false;
      node.selected = false;
      if (node.room < room) node.cleared = true;
    }
  }

  const row = state.actMap[room - 1];
  let node = row.find((item) => item.template?.id === level.id) || row[0];
  Object.assign(node, createMapNode(level, room, node.lane, { discovered: true, current: true }));
}

function syncAvailableMapNodes() {
  for (const row of state.actMap) {
    for (const node of row) {
      node.available = false;
      node.selected = false;
    }
  }

  const nextRoom = state.room + 1;
  const row = state.actMap[nextRoom - 1];
  if (!row) return;

  state.nextChoiceNodes = state.nextChoices.map((level, index) => {
    const node = row[index] || row[0];
    Object.assign(node, createMapNode(level, nextRoom, node.lane, {
      discovered: true,
      available: true,
      isBoss: level.difficulty === "boss",
    }));
    return node;
  });
}

function toggleMute() {
  const muted = audio.toggleMute();
  addFloatingText(CENTER.x, 76, muted ? "AUDIO OFF" : "AUDIO ON", muted ? "#ffb6b6" : "#baf5ff", 0.8);
  updateHud();
}

function damageCore(amount, ball) {
  if (state.core.broken) return;

  const damage = hasReward("coreBruiser") ? amount * 1.25 : amount;
  const armor = getCoreArmor();
  const finalDamage = Math.max(1, damage - armor);
  const appliedDamage = Math.min(finalDamage, state.core.hp);
  state.core.hp = Math.max(0, state.core.hp - finalDamage);
  state.waveStats.damageDealt += appliedDamage;
  state.waveStats.depthReached = 1;
  state.bestDepth = 1;
  ball.alive = false;

  const corePoint = getPointAtProgress(1);
  if (armor > 0) {
    addFloatingText(corePoint.x, corePoint.y - 58, `ARMOR -${armor}`, "#b9dbe4", 0.85);
  }
  addFloatingText(corePoint.x, corePoint.y - 38, `CORE -${Math.ceil(appliedDamage)}`, "#ffffff", 1.1);
  burst(corePoint.x, corePoint.y, "#ffffff", 34, 245);
  addScreenShake(4 + appliedDamage * 0.08);
  state.coreFlash = Math.max(state.coreFlash, 0.45);
  audio.play("coreHit");

  if (state.core.hp <= 0) {
    state.core.hp = 0;
    state.core.broken = true;
    state.waveStats.coreBroken = true;
    state.waveStats.shardsEarned = earnShards(state.waveStats);
    state.shards += state.waveStats.shardsEarned;
    state.levelShardsEarned += state.waveStats.shardsEarned;
    winLevel();
  }
}

function winLevel() {
  const finalLevel = state.room >= ACT_ROOMS;
  state.phase = finalLevel ? "actCleared" : "levelVictory";
  state.balls.forEach((ball) => {
    ball.alive = false;
  });
  state.balls = [];
  state.coreFlash = 1.6;
  state.waveReport = null;
  state.levelVictoryTimer = 0.65;
  state.rewardChoices = finalLevel ? [] : createRewardChoices();
  state.selectedReward = null;
  const corePoint = getPointAtProgress(1);
  burst(corePoint.x, corePoint.y, "#ffffff", 125, 420);
  burst(corePoint.x, corePoint.y, "#fff37a", 72, 300);
  addScreenShake(14);
  audio.play("victory");
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
  }

  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function updateFloatingTexts(dt) {
  for (const text of state.floatingTexts) {
    text.life -= dt;
    text.y -= text.rise * dt;
  }

  state.floatingTexts = state.floatingTexts.filter((text) => text.life > 0);
}

function updateMultipliers(dt) {
  for (const multiplier of state.multipliers) {
    multiplier.flash = Math.max(0, multiplier.flash - dt * 2.6);
  }
}

function draw() {
  state.interactiveRects = [];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (state.appState === "mainMenu") drawMainMenu(ctx);
  else if (state.appState === "puzzleRun") drawPuzzleRun(ctx);
  else drawArcadeRun(ctx);

  updateHoverState();
  drawTooltip();
}

function drawArcadeRun() {
  const shake = getShakeOffset();
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawBackground();
  drawTrack();
  drawGlass();
  drawMultipliers();
  drawStartMarker();
  drawCore();
  drawBallTrails();
  drawBalls();
  drawParticles();
  drawFloatingTexts();
  ctx.restore();

  drawWaveReport();
  drawWinOverlay();
  drawActMapOverlay();
  drawTransitionFade();
}

function drawMainMenu() {
  drawMenuBackground();
  const panel = { x: 190, y: 116, w: WIDTH - 380, h: 688 };

  ctx.save();
  drawPanelRect(panel);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 28;
  ctx.shadowColor = rgba(getTheme().accentColor, 0.65);
  ctx.font = "900 64px Inter, system-ui, sans-serif";
  ctx.fillText("Rogue Glassier", CENTER.x, panel.y + 96);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#baf5ff";
  ctx.font = "800 20px Inter, system-ui, sans-serif";
  ctx.fillText("Break the core. Shape the run.", CENTER.x, panel.y + 134);

  const itemW = panel.w - 128;
  const itemH = 104;
  const itemX = panel.x + 64;
  const startY = panel.y + 192;
  MENU_ITEMS.forEach((item, index) => {
    const rect = { x: itemX, y: startY + index * 124, w: itemW, h: itemH };
    drawMenuItem(ctx, item, rect, index);
  });

  if (state.arcadeInitialized) {
    ctx.fillStyle = "#93aeb9";
    ctx.font = "800 13px Inter, system-ui, sans-serif";
    ctx.fillText("1 resumes current Arcade Run. Press N or Shift+1 for a new run.", CENTER.x, panel.y + 474);
  } else {
    ctx.fillStyle = "#93aeb9";
    ctx.font = "800 13px Inter, system-ui, sans-serif";
    ctx.fillText("1 starts Arcade Run. N starts a fresh Arcade Run later.", CENTER.x, panel.y + 474);
  }

  ctx.fillStyle = "#baf5ff";
  ctx.font = "900 14px Inter, system-ui, sans-serif";
  ctx.fillText(`M ${audio.muted ? "unmute" : "mute"} audio`, CENTER.x, panel.y + panel.h - 54);
  ctx.fillStyle = "#42656f";
  ctx.font = "900 11px Inter, system-ui, sans-serif";
  ctx.fillText("v0.10", panel.x + panel.w - 28, panel.y + panel.h - 18);
  ctx.restore();
}

function drawMenuItem(context, item, rect, index) {
  const hovered = state.hoveredInteractive?.type === "menuItem" && state.hoveredInteractive.payload.index === index;
  const selected = hovered || state.menuSelection === index;
  addInteractiveRect("menuItem", rect, { index }, { title: item.title, body: item.body });

  context.save();
  context.fillStyle = selected ? rgba(getTheme().accentColor, 0.24) : "rgba(9, 19, 27, 0.9)";
  context.strokeStyle = selected ? rgba(getTheme().accentColor, 0.86) : rgba(getTheme().accentColor, 0.34);
  context.lineWidth = selected ? 2 : 1;
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  context.fill();
  context.stroke();

  drawBadge(context, item.key, { x: rect.x + 18, y: rect.y + 18, w: 36, h: 34 }, {
    color: getTheme().accentColor,
    font: "900 17px Inter, system-ui, sans-serif",
  });
  context.textAlign = "left";
  context.fillStyle = "#ffffff";
  context.font = "900 24px Inter, system-ui, sans-serif";
  context.fillText(index === 0 && state.arcadeInitialized ? "Continue Arcade Run" : item.title, rect.x + 72, rect.y + 36);
  context.fillStyle = "#b9dbe4";
  context.font = "800 14px Inter, system-ui, sans-serif";
  wrapText(context, item.body, rect.x + 72, rect.y + 64, rect.w - 94, 17, 2);
  context.restore();
}

function drawPuzzleRun() {
  if (!state.puzzle) resetPuzzleLevel();
  const puzzle = state.puzzle;
  const shake = getPuzzleShakeOffset();
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawPuzzleBackground();
  drawPuzzleTrack();
  drawPuzzleGlass();
  drawPuzzleSlots();
  drawPuzzleCore();
  drawPuzzleBallTrails();
  drawPuzzleBalls();
  drawParticles();
  drawFloatingTexts();
  ctx.restore();

  drawPuzzleHud();
  drawPuzzleCards();
  if (puzzle.puzzleState === "attemptComplete") drawPuzzleAttemptReport();
  if (puzzle.puzzleState === "rewardChoice" || puzzle.puzzleState === "nextRoomReady") drawPuzzleRoomVictory();
  if (puzzle.puzzleState === "runFailed") drawPuzzleRunFailed();
  if (puzzle.puzzleState === "runCleared") drawPuzzleRunCleared();
  if (puzzle.integrityPulse > 0) drawPuzzleIntegrityPulse();
}

function drawMenuBackground() {
  drawBackground();
  ctx.save();
  ctx.globalAlpha = 0.32;
  const preview = generateTrack(TUTORIAL_LEVEL);
  ctx.strokeStyle = rgba(TUTORIAL_LEVEL.theme.glassTint, 0.18);
  ctx.lineWidth = 34;
  ctx.lineCap = "round";
  ctx.beginPath();
  preview.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawPuzzleBackground() {
  const theme = state.puzzle.level.theme;
  const accent = hexToRgb(theme.accentColor);
  const gradient = ctx.createRadialGradient(CENTER.x, CENTER.y, 40, CENTER.x, CENTER.y, 540);
  gradient.addColorStop(0, `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.2)`);
  gradient.addColorStop(0.45, "#071017");
  gradient.addColorStop(1, "#030509");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.1)`;
  ctx.lineWidth = 1;
  for (let x = 58; x < WIDTH; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 58; y < HEIGHT; y += 70) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawPuzzleTrack() {
  const puzzle = state.puzzle;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(puzzle.level.theme.glassTint, 0.16);
  ctx.lineWidth = TRACK_WIDTH + 20;
  ctx.beginPath();
  puzzle.track.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.strokeStyle = rgba(puzzle.level.theme.glassTint, 0.32);
  ctx.lineWidth = TRACK_WIDTH;
  ctx.stroke();
  ctx.restore();
}

function drawPuzzleGlass() {
  const puzzle = state.puzzle;
  for (const segment of puzzle.segments) {
    if (segment.broken) continue;
    const integrity = clamp(segment.hp / segment.maxHp, 0, 1);
    const cracked = segment.crackWeak || integrity < 0.72;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = segment.crackWeak
      ? `rgba(255, 184, 184, ${0.22 + integrity * 0.36})`
      : rgba(puzzle.level.theme.glassTint, 0.28 + integrity * 0.46);
    ctx.lineWidth = TRACK_WIDTH * (0.44 + integrity * 0.14);
    ctx.beginPath();
    for (let i = 0; i <= 5; i += 1) {
      const p = getPuzzleTrackPoint(lerp(segment.progressStart, segment.progressEnd, i / 5));
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    if (cracked) drawPuzzleCracks(segment);
    ctx.restore();
  }
}

function drawPuzzleCracks(segment) {
  const mid = (segment.progressStart + segment.progressEnd) * 0.5;
  const point = getPuzzleTrackPoint(mid);
  const normal = getPuzzleTrackNormal(mid);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.46)";
  ctx.lineWidth = 1.2;
  segment.cracks.slice(0, segment.crackWeak ? 4 : 2).forEach((crack) => {
    const spread = crack.b * TRACK_WIDTH * 0.2;
    ctx.beginPath();
    ctx.moveTo(point.x + normal.x * spread - 7, point.y + normal.y * spread - 4);
    ctx.lineTo(point.x + normal.x * (spread + 6), point.y + normal.y * (spread - 4));
    ctx.stroke();
  });
}

function drawPuzzleSlots() {
  const puzzle = state.puzzle;
  for (const slot of puzzle.slots) {
    const point = getPuzzleTrackPoint(slot.progress);
    const card = getPuzzleCard(slot.placedCardId);
    const selectedTarget = !slot.placedCardId && puzzle.selectedCardId;
    const hovered = state.hoveredInteractive?.type === "puzzleSlot" && state.hoveredInteractive.payload.slotId === slot.id;
    const radius = 16 + slot.flash * 6 + (hovered ? 2 : 0);
    const tooltip = card
      ? { title: card.name, body: card.description }
      : { title: `Empty slot ${slot.index + 1}`, body: "Click a selected card to place it here." };
    addInteractiveRect("puzzleSlot", { x: point.x - 22, y: point.y - 22, w: 44, h: 44 }, { slotId: slot.id }, tooltip);
    ctx.save();
    ctx.shadowBlur = slot.flash > 0 || selectedTarget || hovered ? 18 : 8;
    ctx.shadowColor = card?.color || "#baf5ff";
    ctx.fillStyle = card ? rgba(card.color, 0.24) : "rgba(6, 18, 27, 0.72)";
    ctx.strokeStyle = card ? rgba(card.color, 0.88) : "rgba(186, 245, 255, 0.58)";
    ctx.lineWidth = selectedTarget || hovered ? 3 : 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (card) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.font = fitText(ctx, card.label, 31, "900 10px Inter, system-ui, sans-serif", 7);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(card.label, point.x, point.y + 0.5);
    }
    ctx.restore();
  }
  if (puzzle.selectedCardId) drawSelectedCardConnection();
}

function drawSelectedCardConnection() {
  const puzzle = state.puzzle;
  const openSlot = puzzle.slots.find((slot) => !slot.placedCardId);
  if (!openSlot) return;
  const card = getPuzzleCard(puzzle.selectedCardId);
  const point = getPuzzleTrackPoint(openSlot.progress);
  ctx.save();
  ctx.strokeStyle = rgba(card.color, 0.34);
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(state.mouse.x, state.mouse.y);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
  ctx.restore();
}

function drawPuzzleCore() {
  const puzzle = state.puzzle;
  const point = getPuzzleTrackPoint(1);
  const damageRatio = 1 - puzzle.core.hp / puzzle.core.maxHp;
  const pulse = Math.sin(performance.now() * (0.005 + damageRatio * 0.006)) * 0.5 + 0.5;
  ctx.save();
  ctx.shadowBlur = 22 + puzzle.coreFlash * 36;
  ctx.shadowColor = "#ffffff";
  ctx.fillStyle = `rgba(255, 255, 255, ${0.78 + pulse * 0.18})`;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 22 + damageRatio * 5 + puzzle.coreFlash * 10, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#02060a";
  ctx.beginPath();
  ctx.arc(point.x, point.y, 11, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(186, 245, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 29, -Math.PI / 2, -Math.PI / 2 + TAU * (puzzle.core.hp / puzzle.core.maxHp));
  ctx.stroke();
  ctx.fillStyle = "#eaffff";
  ctx.font = "900 10px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CORE", point.x, point.y + 43);
  ctx.restore();
}

function drawPuzzleBallTrails() {
  for (const ball of state.puzzle.balls) {
    if (ball.trail.length < 2) continue;
    const energyRatio = clamp(ball.energy / 100, 0.15, 1);
    ctx.save();
    ctx.strokeStyle = rgba(ball.color, 0.24 + energyRatio * 0.24);
    ctx.lineWidth = Math.max(2, ball.radius * energyRatio);
    ctx.lineCap = "round";
    ctx.beginPath();
    ball.trail.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.restore();
  }
}

function drawPuzzleBalls() {
  for (const ball of state.puzzle.balls) {
    const energyRatio = clamp(ball.energy / 100, 0.18, 1.25);
    ctx.save();
    ctx.globalAlpha = clamp(0.45 + energyRatio * 0.55, 0.45, 1);
    ctx.shadowBlur = 14 * energyRatio;
    ctx.shadowColor = ball.color;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(2, 7, 12, 0.7)";
    ctx.fillRect(ball.x - 16, ball.y - 24, 32, 4);
    ctx.fillStyle = energyRatio < 0.3 ? "#ffb6b6" : "#80ffd4";
    ctx.fillRect(ball.x - 16, ball.y - 24, 32 * clamp(ball.energy / 100, 0, 1), 4);
    ctx.restore();
  }
}

function drawPuzzleHud() {
  const puzzle = state.puzzle;
  const panel = { x: WIDTH - 286, y: 18, w: 268, h: 414 };
  ctx.save();
  ctx.fillStyle = "rgba(4, 9, 14, 0.82)";
  ctx.strokeStyle = "rgba(132, 220, 255, 0.32)";
  roundRect(panel.x, panel.y, panel.w, panel.h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 22px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Puzzle Run", panel.x + 16, panel.y + 30);
  const rows = [
    ["Room", `${puzzle.roomIndex + 1} / ${puzzle.totalRooms}`],
    ["Room name", puzzle.level.name],
    ["Difficulty", capitalize(puzzle.level.difficulty)],
    ["State", formatPuzzleState(puzzle.puzzleState)],
    ["Integrity", `${puzzle.integrity} / ${puzzle.maxIntegrity}`],
    ["Attempts", `${puzzle.attempts} (${puzzle.totalAttempts} total)`],
    ["Active balls", puzzle.balls.length],
    ["Best depth", formatPercent(puzzle.bestDepth)],
    ["Core HP", `${Math.ceil(puzzle.core.hp)} / ${puzzle.core.maxHp}`],
    ["Broken glass", `${getPuzzleBrokenGlassCount()} / ${puzzle.segments.length}`],
    ["Cards placed", `${puzzle.slots.filter((slot) => slot.placedCardId).length} / ${puzzle.slots.length}`],
    ["Selected", getPuzzleCard(puzzle.selectedCardId)?.name || "none"],
    ["Owned cards", puzzle.deck.length],
  ];
  let y = panel.y + 64;
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  for (const [label, value] of rows) {
    ctx.fillStyle = "#93aeb9";
    ctx.fillText(label, panel.x + 16, y);
    ctx.fillStyle = "#eaffff";
    ctx.textAlign = "right";
    ctx.fillText(String(value), panel.x + panel.w - 16, y);
    ctx.textAlign = "left";
    y += 25;
  }
  ctx.fillStyle = "#baf5ff";
  ctx.font = "800 11px Inter, system-ui, sans-serif";
  wrapText(ctx, "Click card, click slot. SPACE launch. C clear. ESC menu. M mute.", panel.x + 16, panel.y + panel.h - 42, panel.w - 32, 14, 3);
  ctx.restore();
}

function drawPuzzleCards() {
  const puzzle = state.puzzle;
  const cards = getAvailablePuzzleCards();
  if (!cards.length) return;
  const cardW = Math.min(126, Math.max(96, (WIDTH - 120 - (cards.length - 1) * 10) / cards.length));
  const cardH = 96;
  const gap = 10;
  const totalW = cards.length * cardW + (cards.length - 1) * gap;
  let x = CENTER.x - totalW / 2;
  const y = HEIGHT - cardH - 18;
  cards.forEach((instance, index) => {
    const card = getPuzzleCard(instance.instanceId);
    drawPuzzleCard(ctx, card, { x, y, w: cardW, h: cardH }, index);
    x += cardW + gap;
  });
  drawPuzzleActionButtons(y - 44);
}

function drawPuzzleCard(context, card, rect, index) {
  if (!card) return;
  const puzzle = state.puzzle;
  const placed = isPuzzleCardPlaced(card.instanceId);
  const selected = puzzle.selectedCardId === card.instanceId;
  const hovered = state.hoveredInteractive?.type === "puzzleCard" && state.hoveredInteractive.payload.cardId === card.instanceId;
  addInteractiveRect("puzzleCard", rect, { cardId: card.instanceId }, { title: `${card.name} Lv.${card.level}`, body: card.description });
  context.save();
  context.globalAlpha = placed ? 0.44 : 1;
  context.fillStyle = selected || hovered ? rgba(card.color, 0.24) : "rgba(9, 19, 27, 0.9)";
  context.strokeStyle = selected ? "#ffffff" : rgba(card.color, hovered ? 0.8 : 0.36);
  context.lineWidth = selected ? 2.4 : 1.3;
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  context.fill();
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = fitText(context, `${index + 1}. ${card.name}`, rect.w - 20, "900 14px Inter, system-ui, sans-serif", 10);
  context.textAlign = "left";
  context.fillText(`${index + 1}. ${card.name}`, rect.x + 10, rect.y + 21);
  drawBadge(context, `${card.label} Lv.${card.level}`, { x: rect.x + 10, y: rect.y + 31, w: rect.w - 20, h: 24 }, {
    color: card.color,
    minFontSize: 8,
  });
  context.fillStyle = "#b9dbe4";
  context.font = "700 10px Inter, system-ui, sans-serif";
  wrapText(context, placed ? "placed" : card.description, rect.x + 10, rect.y + 68, rect.w - 20, 12, 2);
  context.restore();
}

function drawPuzzleActionButtons(y) {
  const launch = { x: WIDTH - 224, y, w: 96, h: 30 };
  const clear = { x: WIDTH - 118, y, w: 78, h: 30 };
  addInteractiveRect("puzzleAction", launch, { action: "launch" }, { title: "Launch", body: "Start or retry the current Puzzle attempt." });
  addInteractiveRect("puzzleAction", clear, { action: "clear" }, { title: "Clear", body: "Remove all placed cards." });
  drawBadge(ctx, "SPACE", launch, { color: "#84f0ff", font: "900 12px Inter, system-ui, sans-serif" });
  drawBadge(ctx, "C clear", clear, { color: "#ffb8b8", font: "900 12px Inter, system-ui, sans-serif" });
}

function drawPuzzleAttemptReport() {
  const puzzle = state.puzzle;
  const report = puzzle.report;
  if (!report) return;
  const panel = { x: 18, y: 334, w: 318, h: 304 };
  ctx.save();
  drawPanelRect(panel);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 23px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("ATTEMPT FAILED", panel.x + 18, panel.y + 34);
  const rows = [
    ["Depth reached", formatPercent(report.depthReached)],
    ["Best depth", formatPercent(puzzle.bestDepth)],
    ["Glass broken this attempt", report.glassBroken],
    ["Total broken glass", `${getPuzzleBrokenGlassCount()} / ${puzzle.segments.length}`],
    ["Core damage", Math.ceil(report.coreDamage)],
    ["Core HP remaining", `${Math.ceil(puzzle.core.hp)} / ${puzzle.core.maxHp}`],
    ["Integrity lost", report.integrityLost],
    ["Integrity remaining", `${puzzle.integrity} / ${puzzle.maxIntegrity}`],
    ["Cards triggered", formatMultiplierReport(report.cardsTriggered)],
  ];
  let y = panel.y + 66;
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  for (const [label, value] of rows) {
    ctx.fillStyle = "#93aeb9";
    ctx.fillText(label, panel.x + 18, y);
    ctx.fillStyle = "#eaffff";
    ctx.textAlign = "right";
    ctx.fillText(String(value), panel.x + panel.w - 18, y);
    ctx.textAlign = "left";
    y += 22;
  }
  ctx.fillStyle = "#fff37a";
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  wrapText(ctx, `${getPuzzleHint(report)} Damage persists. Adjust cards and press SPACE.`, panel.x + 18, panel.y + panel.h - 62, panel.w - 36, 15, 4);
  ctx.restore();
}

function drawPuzzleRoomVictory() {
  const puzzle = state.puzzle;
  const panel = { x: 84, y: 112, w: WIDTH - 168, h: puzzle.puzzleState === "rewardChoice" ? 560 : 344 };
  ctx.save();
  ctx.fillStyle = "rgba(2, 5, 9, 0.52)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawPanelRect(panel);
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 28;
  ctx.shadowColor = "#ffffff";
  ctx.font = "900 40px Inter, system-ui, sans-serif";
  ctx.fillText("ROOM SOLVED", panel.x + 26, panel.y + 62);
  ctx.shadowBlur = 0;
  const rows = [
    ["Room", `${puzzle.roomIndex + 1} / ${puzzle.totalRooms} - ${puzzle.level.name}`],
    ["Attempts", puzzle.attempts],
    ["Integrity remaining", `${puzzle.integrity} / ${puzzle.maxIntegrity}`],
    ["Broken glass", `${getPuzzleBrokenGlassCount()} / ${puzzle.segments.length}`],
    ["Core", "destroyed"],
  ];
  let y = panel.y + 100;
  ctx.font = "800 14px Inter, system-ui, sans-serif";
  for (const [label, value] of rows) {
    ctx.fillStyle = "#93aeb9";
    ctx.fillText(label, panel.x + 28, y);
    ctx.fillStyle = "#eaffff";
    ctx.textAlign = "right";
    ctx.fillText(String(value), panel.x + panel.w - 28, y);
    ctx.textAlign = "left";
    y += 26;
  }
  if (puzzle.puzzleState === "rewardChoice") {
    ctx.fillStyle = "#fff37a";
    ctx.font = "900 16px Inter, system-ui, sans-serif";
    ctx.fillText("Choose reward: 1 / 2 / 3", panel.x + 28, y + 10);
    drawPuzzleRewardChoice({ x: panel.x + 24, y: y + 28, w: panel.w - 48, h: panel.h - (y - panel.y) - 50 });
  } else {
    ctx.fillStyle = "#fff37a";
    ctx.font = "900 17px Inter, system-ui, sans-serif";
    ctx.fillText(`Reward acquired: ${puzzle.selectedReward?.title || "done"}`, panel.x + 28, y + 24);
    ctx.fillStyle = "#baf5ff";
    ctx.font = "800 15px Inter, system-ui, sans-serif";
    ctx.fillText("Press SPACE for next Puzzle room", panel.x + 28, y + 58);
  }
  ctx.restore();
}

function drawPuzzleRewardChoice(area) {
  const rewards = state.puzzle.rewardChoices || [];
  if (!rewards.length) return;
  const gap = 14;
  const cardW = (area.w - gap * 2) / 3;
  rewards.forEach((reward, index) => {
    const rect = { x: area.x + index * (cardW + gap), y: area.y, w: cardW, h: area.h };
    const hovered = state.hoveredInteractive?.type === "puzzleReward" && state.hoveredInteractive.payload.index === index;
    addInteractiveRect("puzzleReward", rect, { index }, { title: reward.title, body: reward.description });
    ctx.save();
    ctx.fillStyle = hovered ? "rgba(255, 243, 122, 0.16)" : "rgba(8, 18, 28, 0.88)";
    ctx.strokeStyle = reward.rarity === "rare" ? "rgba(205, 184, 255, 0.82)" : reward.rarity === "uncommon" ? "rgba(128, 255, 212, 0.7)" : "rgba(132, 220, 255, 0.45)";
    ctx.lineWidth = hovered ? 2.4 : 1.4;
    roundRect(rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.stroke();
    drawBadge(ctx, String(index + 1), { x: rect.x + 12, y: rect.y + 12, w: 30, h: 26 }, { color: "#fff37a" });
    ctx.fillStyle = "#ffffff";
    ctx.font = fitText(ctx, reward.title, rect.w - 28, "900 16px Inter, system-ui, sans-serif", 10);
    ctx.textAlign = "left";
    ctx.fillText(reward.title, rect.x + 14, rect.y + 58);
    drawBadge(ctx, reward.rarity || "common", { x: rect.x + 14, y: rect.y + 72, w: rect.w - 28, h: 24 }, {
      color: reward.rarity === "rare" ? "#cdb8ff" : reward.rarity === "uncommon" ? "#80ffd4" : "#84f0ff",
      minFontSize: 8,
    });
    ctx.fillStyle = "#b9dbe4";
    ctx.font = "800 12px Inter, system-ui, sans-serif";
    wrapText(ctx, reward.description, rect.x + 14, rect.y + 116, rect.w - 28, 15, 5);
    ctx.restore();
  });
}

function drawPuzzleRunFailed() {
  const puzzle = state.puzzle;
  const panel = { x: 120, y: 230, w: WIDTH - 240, h: 260 };
  ctx.save();
  ctx.fillStyle = "rgba(2, 5, 9, 0.62)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawPanelRect(panel);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffb6b6";
  ctx.font = "900 44px Inter, system-ui, sans-serif";
  ctx.fillText("RUN COLLAPSED", CENTER.x, panel.y + 70);
  ctx.fillStyle = "#eaffff";
  ctx.font = "800 16px Inter, system-ui, sans-serif";
  ctx.fillText(`Rooms solved: ${puzzle.roomsSolved} / ${puzzle.totalRooms}`, CENTER.x, panel.y + 116);
  ctx.fillText(`Best room: ${Math.max(1, puzzle.roomsSolved)}     Total attempts: ${puzzle.totalAttempts}`, CENTER.x, panel.y + 148);
  ctx.fillStyle = "#fff37a";
  ctx.fillText("SPACE / ENTER new Puzzle Run     ESC menu", CENTER.x, panel.y + 196);
  ctx.restore();
}

function drawPuzzleRunCleared() {
  const puzzle = state.puzzle;
  const panel = { x: 100, y: 216, w: WIDTH - 200, h: 300 };
  ctx.save();
  ctx.fillStyle = "rgba(2, 5, 9, 0.58)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawPanelRect(panel);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 28;
  ctx.shadowColor = "#ffffff";
  ctx.font = "900 46px Inter, system-ui, sans-serif";
  ctx.fillText("PUZZLE RUN CLEARED", CENTER.x, panel.y + 76);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#baf5ff";
  ctx.font = "800 16px Inter, system-ui, sans-serif";
  ctx.fillText(`Integrity remaining: ${puzzle.integrity} / ${puzzle.maxIntegrity}`, CENTER.x, panel.y + 124);
  ctx.fillText(`Cards owned: ${puzzle.deck.length}     Total attempts: ${puzzle.totalAttempts}`, CENTER.x, panel.y + 158);
  ctx.fillStyle = "#fff37a";
  ctx.fillText("SPACE / ENTER new Puzzle Run     ESC menu", CENTER.x, panel.y + 218);
  ctx.restore();
}

function drawPuzzleIntegrityPulse() {
  const alpha = state.puzzle.integrityPulse * 0.14;
  ctx.save();
  ctx.fillStyle = `rgba(255, 80, 80, ${alpha})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function drawBackground() {
  const theme = getTheme();
  const accent = hexToRgb(theme.accentColor);
  const gradient = ctx.createRadialGradient(CENTER.x, CENTER.y, 20, CENTER.x, CENTER.y, 520);
  gradient.addColorStop(0, `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.18)`);
  gradient.addColorStop(0.45, "#071017");
  gradient.addColorStop(1, "#030509");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = theme.backgroundGridStrength;
  ctx.strokeStyle = rgba(theme.accentColor, 0.34);
  ctx.lineWidth = 1;
  for (let x = 70; x < WIDTH; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 70; y < HEIGHT; y += 70) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrack() {
  const theme = getTheme();
  drawPathRange(0, 1, {
    lineWidth: 54,
    strokeStyle: "rgba(15, 45, 58, 0.62)",
    shadowBlur: 0,
  });
  drawPathRange(0, 1, {
    lineWidth: 34,
    strokeStyle: rgba(theme.accentColor, 0.12),
    shadowBlur: 16,
    shadowColor: rgba(theme.accentColor, 0.35),
  });
}

function drawGlass() {
  const theme = getTheme();
  for (const segment of state.segments) {
    const integrity = segment.maxHp === 0 ? 0 : segment.hp / segment.maxHp;
    const centerProgress = (segment.progressStart + segment.progressEnd) * 0.5;
    const density = 0.14 + centerProgress * 0.22;
    const flags = getModifierVisualFlags(segment, state.level);
    const glassWidth = flags.brittle ? 25 : flags.dense ? 36 : 31;
    const glassAlpha = flags.brittle ? density + integrity * 0.22 : density + integrity * 0.34;

    if (segment.broken) {
      drawPathRange(segment.progressStart, segment.progressEnd, {
        lineWidth: 30,
        strokeStyle: rgba(theme.glassTint, 0.035),
      });
      continue;
    }

    drawPathRange(segment.progressStart, segment.progressEnd, {
      lineWidth: glassWidth,
      strokeStyle: rgba(flags.brittle ? "#dff8ff" : theme.glassTint, glassAlpha),
      shadowBlur: 13,
      shadowColor: rgba(theme.glassTint, 0.18 + integrity * 0.32),
    });
    drawPathRange(segment.progressStart, segment.progressEnd, {
      lineWidth: 12,
      strokeStyle: `rgba(245, 255, 255, ${0.1 + integrity * 0.36})`,
    });

    drawSegmentModifierOverlay(ctx, segment, flags);

    if (integrity < 0.72 || flags.cracked) {
      drawCracks(segment, integrity);
    }
  }
}

function drawCracks(segment, integrity) {
  ctx.save();
  ctx.strokeStyle = `rgba(4, 13, 19, ${0.45 + (1 - integrity) * 0.42})`;
  ctx.lineWidth = 1.4;

  for (const crack of segment.cracks) {
    const p = segment.progressStart + (segment.progressEnd - segment.progressStart) * crack.a;
    const point = getPointAtProgress(p);
    const tangent = getTangentAtProgress(p);
    const normal = { x: -tangent.y, y: tangent.x };
    const length = 8 + (1 - integrity) * 18;
    const spread = crack.b * 12;

    ctx.beginPath();
    ctx.moveTo(point.x + normal.x * spread, point.y + normal.y * spread);
    ctx.lineTo(
      point.x + normal.x * spread + tangent.x * length + normal.x * length * 0.28,
      point.y + normal.y * spread + tangent.y * length + normal.y * length * 0.28,
    );
    ctx.stroke();
  }

  ctx.restore();
}

function hasModifier(level, id) {
  return hasLevelModifier(level, id);
}

function getModifierVisualFlags(segment, level) {
  const mid = (segment.progressStart + segment.progressEnd) * 0.5;
  const damaged = segment.hp < segment.maxHp && !segment.broken;
  return {
    brittle: hasModifier(level, "brittleGlass"),
    dense: hasModifier(level, "denseMiddle") && mid >= 0.35 && mid <= 0.7,
    cracked: hasModifier(level, "crackedStart") && mid < 0.25,
    regen: hasModifier(level, "glassRegen") && damaged,
    rich: hasModifier(level, "richChamber"),
  };
}

function drawSegmentModifierOverlay(context, segment, flags) {
  const mid = (segment.progressStart + segment.progressEnd) * 0.5;
  const point = getPointAtProgress(mid);
  if (flags.dense) {
    drawPathRange(segment.progressStart, segment.progressEnd, {
      lineWidth: 5,
      strokeStyle: "rgba(3, 11, 18, 0.38)",
    });
  }
  if (flags.regen) {
    const pulse = Math.sin(performance.now() * 0.008 + segment.id) * 0.5 + 0.5;
    drawPathRange(segment.progressStart, segment.progressEnd, {
      lineWidth: 39,
      strokeStyle: `rgba(128, 255, 212, ${0.05 + pulse * 0.05})`,
    });
  }
  if (flags.rich && segment.id % 9 === 0) {
    context.save();
    context.fillStyle = "rgba(255, 243, 122, 0.68)";
    context.shadowBlur = 8;
    context.shadowColor = "#fff37a";
    context.beginPath();
    context.arc(point.x, point.y, 2.2, 0, TAU);
    context.fill();
    context.restore();
  }
}

function drawMultipliers() {
  for (const multiplier of state.multipliers) {
    const { x, y } = multiplier.point;
    const pulse = Math.sin(performance.now() * 0.006 + multiplier.progress * 20) * 0.5 + 0.5;
    const flash = multiplier.flash;
    const rush = hasModifier(state.level, "multiplierRush") && multiplier.value >= 2;
    const radius = 17 + pulse * (rush ? 5 : 2.5) + flash * 12;

    ctx.save();
    ctx.shadowBlur = 22 + pulse * (rush ? 20 : 10) + flash * 34;
    ctx.shadowColor = multiplier.value === 1 ? "#80ffd4" : "#fff37a";
    ctx.fillStyle =
      multiplier.value === 1
        ? `rgba(99, 255, 208, ${0.82 + flash * 0.18})`
        : `rgba(255, 230, 84, ${0.9 + flash * 0.1})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#091016";
    ctx.font = "bold 15px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`x${multiplier.value}`, x, y + 0.5);
    if (rush) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i += 1) {
        const a = performance.now() * 0.006 + i * 2.1;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * (radius + 4), y + Math.sin(a) * (radius + 4));
        ctx.lineTo(x + Math.cos(a + 0.45) * (radius + 10), y + Math.sin(a + 0.45) * (radius + 10));
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawStartMarker() {
  const start = getPointAtProgress(0);
  const pulse = Math.sin(performance.now() * 0.006) * 0.5 + 0.5;
  ctx.save();
  ctx.strokeStyle = rgba(getTheme().accentColor, 0.72);
  ctx.lineWidth = 2;
  ctx.shadowBlur = 18;
  ctx.shadowColor = getTheme().accentColor;
  ctx.beginPath();
  ctx.arc(start.x, start.y, 18 + pulse * 4, 0, TAU);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#baf5ff";
  ctx.font = "800 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("START", start.x, start.y - 30);
  ctx.restore();
}

function drawCore() {
  const corePoint = getPointAtProgress(1);
  const damageRatio = 1 - state.core.hp / state.core.maxHp;
  const pulseSpeed = 0.005 + damageRatio * 0.007;
  const pulse = Math.sin(performance.now() * pulseSpeed) * 0.5 + 0.5;
  const flash = state.coreFlash;
  const radius = 29 + pulse * (5 + damageRatio * 12) + flash * 50;
  const alpha = state.core.broken ? 0.78 : 0.72 + damageRatio * 0.22;

  ctx.save();
  ctx.shadowBlur = 28 + damageRatio * 32 + flash * 70;
  ctx.shadowColor = flash > 0 ? "#ffffff" : getTheme().accentColor;
  ctx.fillStyle =
    flash > 0 ? `rgba(255, 255, 255, ${0.45 + flash * 0.35})` : rgba(getTheme().accentColor, alpha);
  ctx.beginPath();
  ctx.arc(corePoint.x, corePoint.y, radius, 0, TAU);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(4, 12, 18, ${0.28 + damageRatio * 0.5})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * TAU + damageRatio * 0.8;
    const inner = 7 + damageRatio * 2;
    const outer = 18 + damageRatio * 22;
    ctx.beginPath();
    ctx.moveTo(corePoint.x + Math.cos(angle) * inner, corePoint.y + Math.sin(angle) * inner);
    ctx.lineTo(
      corePoint.x + Math.cos(angle + 0.24) * outer,
      corePoint.y + Math.sin(angle + 0.24) * outer,
    );
    ctx.stroke();
  }

  ctx.fillStyle = state.core.broken ? "#ffffff" : "#061019";
  ctx.beginPath();
  ctx.arc(corePoint.x, corePoint.y, 14 + pulse * 2, 0, TAU);
  ctx.fill();
  drawCoreModifierOverlay(ctx, state.core, state.level);
  ctx.fillStyle = "#baf5ff";
  ctx.font = "800 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CORE", corePoint.x, corePoint.y + radius + 18);
  ctx.restore();
}

function drawCoreModifierOverlay(context, core, level) {
  const corePoint = getPointAtProgress(1);
  context.save();
  if (hasModifier(level, "armoredCore")) {
    context.strokeStyle = "rgba(255, 255, 255, 0.78)";
    context.lineWidth = 4;
    context.shadowBlur = 16;
    context.shadowColor = "#ffffff";
    context.beginPath();
    context.arc(corePoint.x, corePoint.y, 42, 0, TAU);
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = rgba(level.theme.accentColor, 0.45);
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(corePoint.x, corePoint.y, 50, 0, TAU);
    context.stroke();
  }
  if (hasModifier(level, "brittleGlass")) {
    context.fillStyle = "rgba(255, 255, 255, 0.12)";
    context.beginPath();
    context.arc(corePoint.x, corePoint.y, 56, 0, TAU);
    context.fill();
  }
  context.restore();
}

function drawBallTrails() {
  for (const ball of state.balls) {
    if (ball.trail.length < 2) continue;
    const ratio = clamp(ball.power / Math.max(1, ball.initialPower), 0.28, 1);
    const start = hasModifier(state.level, "fragileBalls") ? Math.max(1, ball.trail.length - Math.ceil(12 * ratio)) : 1;
    ctx.save();
    ctx.lineWidth = Math.max(2, ball.radius * 0.7 * ratio);
    ctx.lineCap = "round";
    ctx.strokeStyle = ball.color;
    for (let i = start; i < ball.trail.length; i += 1) {
      const a = ball.trail[i - 1];
      const b = ball.trail[i];
      ctx.globalAlpha = (i / ball.trail.length) * 0.22;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawBalls() {
  for (const ball of state.balls) {
    const ratio = clamp(ball.power / Math.max(1, ball.initialPower), 0.35, 1);
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = ball.color;
    ctx.globalAlpha = hasModifier(state.level, "fragileBalls") ? 0.65 + ratio * 0.35 : 1;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, TAU);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.28, ball.y - ball.radius * 0.32, ball.radius * 0.32, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  ctx.save();
  for (const particle of state.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloatingTexts() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 17px Inter, system-ui, sans-serif";

  for (const text of state.floatingTexts) {
    const alpha = Math.max(0, text.life / text.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = text.color;
    ctx.fillText(text.value, text.x, text.y);
  }
  ctx.restore();
}

function drawWaveReport() {
  if (state.phase !== "waveComplete" || !state.waveReport) return;

  const report = state.waveReport;
  const x = WIDTH - 308;
  const y = HEIGHT - 282;
  const w = 268;
  const h = 240;

  ctx.save();
  ctx.fillStyle = "rgba(4, 9, 14, 0.76)";
  ctx.strokeStyle = rgba(getTheme().accentColor, 0.4);
  ctx.lineWidth = 1;
  roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 24px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Wave complete", x + 18, y + 16);

  ctx.font = "600 14px Inter, system-ui, sans-serif";
  const lines = [
    ["Depth reached", `${formatPercent(report.depthReached)}`],
    ["Best depth", `${formatPercent(state.bestDepth)}`],
    ["Glass broken this wave", report.glassBrokenThisWave],
    ["Total broken glass", `${getBrokenGlassCount()} / ${state.segments.length}`],
    ["Damage dealt this wave", Math.ceil(report.damageDealt)],
    ["Multipliers triggered", formatMultiplierReport(report.multiplierCounts)],
    ["Shards earned", `+${report.shardsEarned}`],
  ];

  let rowY = y + 60;
  for (const [label, value] of lines) {
    ctx.fillStyle = "#93aeb9";
    ctx.fillText(label, x + 18, rowY);
    ctx.fillStyle = "#eaffff";
    ctx.textAlign = "right";
    ctx.fillText(String(value), x + w - 18, rowY);
    ctx.textAlign = "left";
    rowY += 22;
  }

  ctx.fillStyle = "#baf5ff";
  ctx.font = "800 14px Inter, system-ui, sans-serif";
  ctx.fillText("Press SPACE to launch again", x + 18, y + h - 30);
  ctx.restore();
}

function drawWinOverlay() {
  if (!["levelVictory", "rewardChoice", "nextChamberChoice", "nextLevelReady", "actCleared"].includes(state.phase)) return;

  const isFinal = state.phase === "actCleared";
  const panel = getPanelRect();

  ctx.save();
  ctx.fillStyle = "rgba(2, 5, 9, 0.42)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawPanelRect(panel);

  ctx.shadowBlur = 36;
  ctx.shadowColor = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 54px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isFinal ? "ACT 1 CLEARED" : "LEVEL COMPLETE", CENTER.x, panel.y + 46);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#b9f8ff";
  ctx.font = "800 22px Inter, system-ui, sans-serif";
  ctx.fillText(state.level.name, CENTER.x, panel.y + 88);

  if (isFinal) {
    drawActClearedStats();
    ctx.fillStyle = "#baf5ff";
    ctx.font = "800 18px Inter, system-ui, sans-serif";
    ctx.fillText("Press SPACE to start new run", CENTER.x, panel.y + panel.h - 38);
    ctx.restore();
    return;
  }

  drawLevelCompleteStats(panel);
  if (state.phase === "nextChamberChoice" || state.phase === "nextLevelReady") {
    drawNextChamberChoices(panel);
  } else {
    drawRewardChoices(panel);
  }
  ctx.restore();
}

function drawLevelCompleteStats(panel) {
  ctx.font = "700 15px Inter, system-ui, sans-serif";
  const lines = [
    ["Launches this level", state.launches],
    ["Total launches", state.totalLaunches],
    ["Shards earned this level", state.levelShardsEarned],
    ["Best depth", "100%"],
    ["Core", "destroyed"],
  ];
  let y = panel.y + 118;
  for (const [label, value] of lines) {
    ctx.fillStyle = "#93aeb9";
    ctx.textAlign = "left";
    ctx.fillText(label, panel.x + 34, y);
    ctx.fillStyle = "#eaffff";
    ctx.textAlign = "right";
    ctx.fillText(String(value), panel.x + panel.w - 34, y);
    y += 24;
  }
}

function drawRewardChoices(panel) {
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 18px Inter, system-ui, sans-serif";
  ctx.fillText(
    state.phase === "levelVictory"
      ? "Core destroyed"
      : state.phase === "nextLevelReady"
        ? "Reward acquired"
        : "Choose reward: 1 / 2 / 3",
    CENTER.x,
    panel.y + 252,
  );
  const cards = getCardRects(panel, 3, panel.y + 274, 96);
  state.rewardChoices.forEach((reward, index) =>
    drawRewardCard(ctx, reward, cards[index], index, state.selectedReward?.id === reward.id),
  );

  if (state.phase === "nextLevelReady") {
    ctx.fillStyle = "#baf5ff";
    ctx.font = "900 15px Inter, system-ui, sans-serif";
    ctx.fillText("Press SPACE to enter chamber", CENTER.x, panel.y + panel.h - 28);
  }
}

function drawActClearedStats() {
  ctx.font = "700 16px Inter, system-ui, sans-serif";
  const lines = [
    ["Total launches", state.totalLaunches],
    ["Final shards", state.shards],
    ["Power level", state.upgrades.power],
    ["Speed level", state.upgrades.speed],
    ["Start balls level", state.upgrades.balls],
    ["Rewards collected", state.rewards.length],
  ];
  let y = CENTER.y - 72;
  for (const [label, value] of lines) {
    ctx.fillStyle = "#93aeb9";
    ctx.textAlign = "left";
    ctx.fillText(label, CENTER.x - 210, y);
    ctx.fillStyle = "#eaffff";
    ctx.textAlign = "right";
    ctx.fillText(String(value), CENTER.x + 210, y);
    y += 28;
  }
}

function drawNextChamberChoices(panel) {
  const bossNext = state.nextChoices.length === 1 && state.nextChoices[0].difficulty === "boss";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 18px Inter, system-ui, sans-serif";
  ctx.fillText(
    state.phase === "nextLevelReady"
      ? `${state.selectedNextLevel.name} selected`
      : bossNext
        ? "Boss chamber ahead"
        : "Choose next chamber: 1 / 2 / 3",
    CENTER.x,
    panel.y + 252,
  );

  const cards = getCardRects(panel, state.nextChoices.length, panel.y + 274, 170);
  state.nextChoices.forEach((level, index) => {
    drawChamberCard(ctx, level, cards[index], index, state.selectedNextLevel?.id === level.id);
  });

  if (state.phase === "nextLevelReady") {
    ctx.fillStyle = "#baf5ff";
    ctx.font = "900 15px Inter, system-ui, sans-serif";
    ctx.fillText("Press SPACE to enter chamber", CENTER.x, panel.y + panel.h - 28);
  }
}

function getPanelRect() {
  const margin = 34;
  return {
    x: margin,
    y: 40,
    w: WIDTH - margin * 2,
    h: HEIGHT - 80,
  };
}

function drawPanelRect(rect) {
  ctx.fillStyle = "rgba(4, 9, 14, 0.82)";
  ctx.strokeStyle = rgba(getTheme().accentColor, 0.52);
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.stroke();
}

function getCardRects(panel, count, top, cardH) {
  const gap = 14;
  const side = 34;
  const available = panel.w - side * 2;
  if (available < 560) {
    const h = Math.min(cardH, 92);
    return Array.from({ length: count }, (_, index) => ({
      x: panel.x + side,
      y: top + index * (h + gap),
      w: available,
      h,
    }));
  }
  const w = (available - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, index) => ({
    x: panel.x + side + index * (w + gap),
    y: top,
    w,
    h: cardH,
  }));
}

function drawRewardCard(context, reward, rect, index, selected) {
  const hovered = state.hoveredInteractive?.type === "reward" && state.hoveredInteractive.payload.index === index;
  addInteractiveRect("reward", rect, { index }, { title: reward.name, body: reward.description });
  context.fillStyle = selected || hovered ? rgba(getTheme().accentColor, 0.24) : "rgba(9, 19, 27, 0.88)";
  context.strokeStyle = selected ? "#ffffff" : rgba(getTheme().accentColor, 0.34);
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  context.fill();
  context.stroke();

  context.fillStyle = "#ffffff";
  context.font = "900 14px Inter, system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText(`${index + 1}. ${reward.name}`, rect.x + 14, rect.y + 22);
  context.fillStyle = "#b9dbe4";
  context.font = "700 12px Inter, system-ui, sans-serif";
  wrapText(context, reward.description, rect.x + 14, rect.y + 44, rect.w - 28, 15, 3);
}

function drawTrackPreview(context, rect, levelTemplate) {
  const level = { ...levelTemplate, turns: levelTemplate.turns };
  const points = generateTrack(level);
  const fitted = fitPointsToRect(points, rect, 10);
  const rush = hasModifier(level, "multiplierRush");
  const brittle = hasModifier(level, "brittleGlass");

  context.save();
  context.fillStyle = "rgba(1, 7, 11, 0.62)";
  roundRect(rect.x, rect.y, rect.w, rect.h, 6);
  context.fill();

  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = rgba(level.theme.glassTint, 0.28);
  context.lineWidth = brittle ? 4.6 : 7;
  context.beginPath();
  fitted.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.stroke();

  drawPreviewModifierOverlay(context, rect, level, fitted);

  context.strokeStyle = rgba(level.theme.glassTint, 0.92);
  context.lineWidth = 2.4;
  context.beginPath();
  fitted.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.stroke();

  for (const multiplier of level.multipliers) {
    const point = fitted[Math.min(fitted.length - 1, Math.max(0, Math.round(multiplier.progress * (fitted.length - 1))))];
    const displayValue = rush && multiplier.value >= 2 ? multiplier.value + 1 : multiplier.value;
    drawMiniMultiplier(context, point.x, point.y, displayValue, rush);
  }

  const start = fitted[0];
  const core = fitted[fitted.length - 1];
  drawMiniStartAndCore(context, start.x, start.y, core.x, core.y, hasModifier(level, "armoredCore"));
  drawTrackIcon(context, level.trackType, rect.x + rect.w - 27, rect.y + 18, 14, level.theme.accentColor);
  context.restore();
}

function getTrackPreviewBounds(points) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
}

function fitPointsToRect(points, rect, padding) {
  const bounds = getTrackPreviewBounds(points);
  const sourceW = Math.max(1, bounds.maxX - bounds.minX);
  const sourceH = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min((rect.w - padding * 2) / sourceW, (rect.h - padding * 2) / sourceH);
  const offsetX = rect.x + rect.w / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
  const offsetY = rect.y + rect.h / 2 - ((bounds.minY + bounds.maxY) / 2) * scale;
  return points.map((point) => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  }));
}

function drawPreviewModifierOverlay(context, rect, levelTemplate, previewPoints) {
  context.save();
  if (hasModifier(levelTemplate, "denseMiddle")) {
    drawPreviewRange(context, previewPoints, 0.35, 0.7, "rgba(4, 12, 18, 0.75)", 5);
  }
  if (hasModifier(levelTemplate, "crackedStart")) {
    drawPreviewRange(context, previewPoints, 0, 0.25, "rgba(255, 255, 255, 0.55)", 3);
  }
  if (hasModifier(levelTemplate, "glassRegen")) {
    drawPreviewRange(context, previewPoints, 0.1, 0.9, "rgba(128, 255, 212, 0.25)", 9);
  }
  if (hasModifier(levelTemplate, "richChamber")) {
    context.fillStyle = "rgba(255, 243, 122, 0.8)";
    for (let i = 0; i < 8; i += 1) {
      const p = previewPoints[Math.floor((i / 8) * (previewPoints.length - 1))];
      context.beginPath();
      context.arc(p.x + ((i % 2) * 2 - 1) * 5, p.y, 1.8, 0, TAU);
      context.fill();
    }
  }
  if (hasModifier(levelTemplate, "fragileBalls")) {
    context.fillStyle = "rgba(255, 182, 182, 0.9)";
    context.font = "900 12px Inter, system-ui, sans-serif";
    context.fillText("!", rect.x + 12, rect.y + 17);
  }
  context.restore();
}

function drawPreviewRange(context, points, start, end, color, width) {
  const a = Math.floor(start * (points.length - 1));
  const b = Math.floor(end * (points.length - 1));
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.beginPath();
  for (let i = a; i <= b; i += 1) {
    const p = points[i];
    if (i === a) context.moveTo(p.x, p.y);
    else context.lineTo(p.x, p.y);
  }
  context.stroke();
}

function drawMiniMultiplier(context, x, y, value, overloaded = false) {
  context.save();
  context.fillStyle = value === 1 ? "#80ffd4" : "#fff37a";
  context.shadowBlur = 6 + (value > 3 ? 5 : 0) + (overloaded ? 5 : 0);
  context.shadowColor = context.fillStyle;
  context.beginPath();
  context.arc(x, y, overloaded ? 5.2 : 4.3, 0, TAU);
  context.fill();
  if (overloaded && value > 1) {
    context.strokeStyle = "rgba(255, 255, 255, 0.78)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x - 6, y - 1);
    context.lineTo(x - 1, y - 5);
    context.lineTo(x + 4, y - 2);
    context.stroke();
  }
  context.shadowBlur = 0;
  context.fillStyle = "#071016";
  context.font = "800 7px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(value), x, y + 0.2);
  context.restore();
}

function drawMiniStartAndCore(context, startX, startY, coreX, coreY, armored = false) {
  context.save();
  context.strokeStyle = "#baf5ff";
  context.lineWidth = 1.6;
  context.beginPath();
  context.arc(startX, startY, 5.8, 0, TAU);
  context.stroke();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(coreX, coreY, 6.2, 0, TAU);
  context.fill();
  if (armored) {
    context.strokeStyle = "rgba(255, 255, 255, 0.88)";
    context.lineWidth = 1.4;
    context.beginPath();
    context.arc(coreX, coreY, 9.2, 0, TAU);
    context.stroke();
  }
  context.fillStyle = "#071016";
  context.beginPath();
  context.arc(coreX, coreY, 2.7, 0, TAU);
  context.fill();
  context.restore();
}

function drawBadge(context, text, rect, options = {}) {
  const color = options.color || getTheme().accentColor;
  context.save();
  context.fillStyle = options.fill || rgba(color, 0.22);
  context.strokeStyle = options.stroke || rgba(color, 0.5);
  roundRect(rect.x, rect.y, rect.w, rect.h, options.radius ?? 6);
  context.fill();
  context.stroke();
  context.beginPath();
  roundRect(rect.x, rect.y, rect.w, rect.h, options.radius ?? 6);
  context.clip();
  context.fillStyle = options.textColor || "#eaffff";
  context.font = fitText(context, text, rect.w - 10, options.font || "900 10px Inter, system-ui, sans-serif", options.minFontSize || 8);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2 + 0.5);
  context.restore();
}

function drawModifierBadges(context, level, x, y, maxWidth) {
  const mods = (level.modifiers || []).map((id) => LEVEL_MODIFIERS[id]).filter(Boolean);
  if (mods.length === 0) {
    context.fillStyle = "#93aeb9";
    context.font = "800 10px Inter, system-ui, sans-serif";
    context.textAlign = "left";
    context.fillText("No modifiers", x, y + 13);
    return;
  }

  let cursor = x;
  const shown = mods.slice(0, 2);
  shown.forEach((modifier) => {
    const label = shortModifierName(modifier.id);
    const w = Math.min(68, Math.max(48, label.length * 7 + 18));
    if (cursor + w > x + maxWidth) return;
    const rect = { x: cursor, y, w, h: 20 };
    drawModifierBadge(context, modifier, rect);
    cursor += w + 7;
  });
  if (mods.length > shown.length) {
    const hidden = mods.slice(shown.length);
    const rect = { x: cursor, y, w: 34, h: 20 };
    drawBadge(context, `+${hidden.length}`, rect, { color: getTheme().accentColor });
    addInteractiveRect("modifierBadge", rect, { id: "more" }, {
      title: "More modifiers",
      body: hidden.map((modifier) => `${modifier.name}: ${modifier.shortDescription}`).join(" "),
    });
  }
}

function drawModifierBadge(context, modifier, rect) {
  drawBadge(context, shortModifierName(modifier.id), rect, {
    fill: "rgba(12, 29, 38, 0.92)",
    stroke: "rgba(186, 245, 255, 0.34)",
    textColor: "#dffbff",
    minFontSize: 8,
  });
  addInteractiveRect("modifierBadge", rect, { id: modifier.id }, {
    title: modifier.name,
    body: `${modifier.shortDescription} ${modifier.numericEffect || ""}`,
  });
}

function shortModifierName(id) {
  return MODIFIER_LABELS[id] || id;
}

function drawRiskRewardBars(context, x, y, level) {
  context.font = "900 10px Inter, system-ui, sans-serif";
  context.textAlign = "left";
  context.fillStyle = "#ffb8b8";
  context.fillText(`Risk ${scoreDots(getRiskScore(level))}`, x, y);
  context.fillStyle = "#fff37a";
  context.fillText(`Reward ${scoreDots(getRewardScore(level))}`, x + 96, y);
}

function scoreDots(score) {
  return `${"●".repeat(score)}${"○".repeat(5 - score)}`;
}

function getRiskScore(level) {
  const base = { safe: 1, normal: 2, risky: 3, elite: 4, boss: 5 }[level.difficulty] || 2;
  const extra = ["glassRegen", "armoredCore", "fragileBalls"].filter((id) => hasModifier(level, id)).length;
  return clamp(Math.round(base + extra), 1, 5);
}

function getRewardScore(level) {
  const base = { safe: 1, normal: 2, risky: 3, elite: 4, boss: 5 }[level.difficulty] || 2;
  const extra = ["richChamber", "multiplierRush"].filter((id) => hasModifier(level, id)).length;
  return clamp(Math.round(base + extra), 1, 5);
}

function getDifficultyColor(difficulty) {
  return {
    safe: "#9fffd5",
    normal: "#baf5ff",
    risky: "#fff37a",
    elite: "#ffb8f2",
    boss: "#ffffff",
  }[difficulty] || "#baf5ff";
}

function drawChamberCard(context, level, rect, index, selected) {
  const difficulty = DIFFICULTY[level.difficulty];
  const hovered = state.hoveredInteractive?.type === "chamber" && state.hoveredInteractive.payload.index === index;
  addInteractiveRect("chamber", rect, { index }, {
    title: level.name,
    body: `${DIFFICULTY[level.difficulty].label} ${level.archetype}. ${level.shortPitch}`,
  });
  context.fillStyle = selected || hovered ? rgba(level.theme.accentColor, 0.24) : "rgba(9, 19, 27, 0.88)";
  context.strokeStyle = selected ? "#ffffff" : rgba(level.theme.accentColor, 0.36);
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  context.fill();
  context.stroke();

  context.textAlign = "left";
  context.fillStyle = "#ffffff";
  context.font = "900 15px Inter, system-ui, sans-serif";
  context.fillText(`${index + 1}. ${level.name}`, rect.x + 14, rect.y + 20);

  drawBadge(context, level.archetype, { x: rect.x + rect.w - 78, y: rect.y + 10, w: 64, h: 20 }, {
    color: level.theme.accentColor,
    minFontSize: 8,
  });
  const previewRect = {
    x: rect.x + 14,
    y: rect.y + 38,
    w: rect.w - 28,
    h: Math.max(48, rect.h * 0.34),
  };
  drawTrackPreview(context, previewRect, level);

  context.fillStyle = getDifficultyColor(level.difficulty);
  context.font = "900 12px Inter, system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText(`${difficulty.label} chamber`, rect.x + 14, previewRect.y + previewRect.h + 18);

  context.fillStyle = "#b9dbe4";
  context.font = "700 11px Inter, system-ui, sans-serif";
  const reward = Math.round((difficulty.shardMultiplier - 1) * 100);
  drawRiskRewardBars(context, rect.x + 14, previewRect.y + previewRect.h + 35, level);
  drawModifierBadges(context, level, rect.x + 14, previewRect.y + previewRect.h + 55, rect.w - 28);
  wrapText(
    context,
    `${level.shortPitch}. Track: ${level.trackType}. Reward: ${reward >= 0 ? "+" : ""}${reward}% shards.`,
    rect.x + 14,
    previewRect.y + previewRect.h + 80,
    rect.w - 28,
    13,
    2,
  );
}

function drawTransitionFade() {
  if (state.transitionFade <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(2, 5, 9, ${state.transitionFade * 0.76})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function drawTooltip() {
  const tooltip = state.hoveredInteractive?.tooltip;
  if (!tooltip) return;

  const maxWidth = 270;
  const pad = 12;
  const title = tooltip.title || "";
  const body = tooltip.body || "";

  ctx.save();
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  const bodyLines = getWrappedLines(ctx, body, maxWidth - pad * 2, 5);
  const titleHeight = title ? 18 : 0;
  const h = pad * 2 + titleHeight + bodyLines.length * 15;
  const w = maxWidth;
  const x = clamp(state.mouse.x + 18, 8, WIDTH - w - 8);
  const y = clamp(state.mouse.y + 18, 8, HEIGHT - h - 8);

  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.fillStyle = "rgba(4, 13, 20, 0.96)";
  ctx.strokeStyle = "rgba(186, 245, 255, 0.36)";
  ctx.lineWidth = 1;
  roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  let textY = y + pad;
  if (title) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(title, x + pad, textY);
    textY += titleHeight;
  }

  ctx.fillStyle = "#b9dbe4";
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  bodyLines.forEach((line) => {
    ctx.fillText(line, x + pad, textY);
    textY += 15;
  });
  ctx.restore();
}

function drawActMapOverlay() {
  if (!state.mapOverlayOpen) return;

  ctx.save();
  ctx.fillStyle = "rgba(2, 5, 9, 0.72)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const panel = { x: 90, y: 70, w: WIDTH - 180, h: HEIGHT - 140 };
  drawPanelRect(panel);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 42px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ACT MAP", CENTER.x, panel.y + 44);

  const mapRect = { x: panel.x + 42, y: panel.y + 92, w: panel.w - 84, h: panel.h - 145 };
  const positions = getMapNodePositions(mapRect);
  drawMapConnections(positions);

  for (const row of state.actMap) {
    for (const node of row) {
      drawMapNode(node, positions.get(node.id));
    }
  }

  ctx.fillStyle = "#baf5ff";
  ctx.font = "800 14px Inter, system-ui, sans-serif";
  ctx.fillText("TAB / ESC close", CENTER.x, panel.y + panel.h - 28);
  ctx.restore();
}

function getMapNodePositions(rect) {
  const positions = new Map();
  const rowGap = rect.w / (ACT_ROOMS - 1);
  for (const row of state.actMap) {
    const x = rect.x + (row[0].room - 1) * rowGap;
    row.forEach((node, index) => {
      const spread = row.length === 1 ? 0 : (index - (row.length - 1) / 2) * 92;
      positions.set(node.id, {
        x,
        y: rect.y + rect.h / 2 + spread,
      });
    });
  }
  return positions;
}

function drawMapConnections(positions) {
  ctx.save();
  ctx.lineWidth = 2;
  for (let r = 0; r < state.actMap.length - 1; r += 1) {
    for (const a of state.actMap[r]) {
      for (const b of state.actMap[r + 1]) {
        const pa = positions.get(a.id);
        const pb = positions.get(b.id);
        if (!pa || !pb) continue;
        const active = a.cleared && (b.available || b.current || b.selected);
        ctx.strokeStyle = active ? rgba(getTheme().accentColor, 0.75) : "rgba(132, 220, 255, 0.13)";
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawMapNode(node, position) {
  if (!position) return;
  const hovered = state.hoveredInteractive?.type === "mapNode" && state.hoveredInteractive.payload.nodeId === node.id;
  const pulse = node.current ? Math.sin(performance.now() * 0.006) * 2.5 : 0;
  const radius = (node.isBoss ? 26 : 21) * (hovered ? 1.08 : 1) + pulse;
  const color = node.template?.theme?.accentColor || getTheme().accentColor;
  const alpha = node.discovered ? 0.95 : 0.28;

  ctx.save();
  ctx.globalAlpha = alpha;
  if (node.available || node.current || node.selected || hovered) {
    ctx.shadowBlur = node.selected || node.current ? 22 : 15;
    ctx.shadowColor = rgba(color, hovered ? 0.95 : 0.62);
  }
  ctx.fillStyle = node.selected
    ? rgba(color, 0.42)
    : node.available
      ? rgba(color, 0.28)
      : node.current
        ? rgba(color, 0.34)
        : node.cleared
          ? "rgba(185, 248, 255, 0.2)"
          : "rgba(80, 105, 118, 0.16)";
  ctx.strokeStyle = node.selected || node.current ? "#ffffff" : rgba(color, node.available ? 0.72 : 0.34);
  ctx.lineWidth = node.selected || node.current ? 3 : 1.5;
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (node.template) {
    drawTrackIcon(ctx, node.trackType, position.x, position.y, 12, color);
  } else {
    ctx.fillStyle = "#93aeb9";
    ctx.font = "900 16px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", position.x, position.y + 1);
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = node.available || node.current || node.selected ? "#ffffff" : "#93aeb9";
  ctx.font = "800 10px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(node.archetype || "?", position.x, position.y + radius + 7);
  ctx.font = "700 9px Inter, system-ui, sans-serif";
  ctx.fillText(node.difficulty, position.x, position.y + radius + 20);
  if (node.template?.modifiers?.length) {
    ctx.fillStyle = "#fff37a";
    node.template.modifiers.slice(0, 3).forEach((_, index) => {
      ctx.beginPath();
      ctx.arc(position.x - 8 + index * 8, position.y - radius - 8, 2.2, 0, TAU);
      ctx.fill();
    });
  }
  addInteractiveRect("mapNode", { x: position.x - radius, y: position.y - radius, w: radius * 2, h: radius * 2 }, { nodeId: node.id }, {
    title: node.template?.name || "Unknown chamber",
    body: node.template
      ? `${DIFFICULTY[node.difficulty]?.label || node.difficulty} ${node.archetype}. Track: ${node.trackType}. Mods: ${getModifierNames(node.template).join(", ") || "None"}`
      : `${node.difficulty} future chamber`,
  });
  ctx.restore();
}

function drawTrackIcon(context, trackType, x, y, size, color) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  if (trackType === "spiral" || trackType === "brokenSpiral") {
    for (let i = 0; i < 34; i += 1) {
      const t = i / 33;
      const angle = t * TAU * 1.8;
      const r = size * (1 - t * 0.78);
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
  } else if (trackType === "snake") {
    for (let i = 0; i < 20; i += 1) {
      const t = i / 19;
      const px = x - size + t * size * 2;
      const py = y + Math.sin(t * Math.PI * 3) * size * 0.55;
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
  } else if (trackType === "rings") {
    context.arc(x, y, size * 0.9, 0, TAU);
    context.moveTo(x + size * 0.45, y);
    context.arc(x, y, size * 0.45, 0, TAU);
  } else if (trackType === "clover") {
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * TAU;
      context.moveTo(x, y);
      context.quadraticCurveTo(
        x + Math.cos(angle - 0.5) * size,
        y + Math.sin(angle - 0.5) * size,
        x + Math.cos(angle) * size * 0.35,
        y + Math.sin(angle) * size * 0.35,
      );
    }
  } else if (trackType === "zigzagCoil") {
    context.moveTo(x - size, y - size * 0.6);
    context.lineTo(x + size * 0.55, y - size * 0.25);
    context.lineTo(x - size * 0.45, y + size * 0.2);
    context.lineTo(x + size, y + size * 0.62);
  } else {
    context.moveTo(x - size, y);
    context.lineTo(x + size, y);
  }
  context.stroke();
  context.restore();
}

function drawPathRange(start, end, options) {
  const samples = Math.max(6, Math.ceil((end - start) * 180));

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = options.lineWidth;
  ctx.strokeStyle = options.strokeStyle;
  ctx.shadowBlur = options.shadowBlur || 0;
  ctx.shadowColor = options.shadowColor || "transparent";
  ctx.beginPath();

  for (let i = 0; i <= samples; i += 1) {
    const progress = start + (end - start) * (i / samples);
    const point = getPointAtProgress(progress);
    if (i === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }

  ctx.stroke();
  ctx.restore();
}

function burst(x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TAU;
    const velocity = speed * (0.35 + Math.random() * 0.85);
    const maxLife = 0.32 + Math.random() * 0.46;

    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      color,
      size: 1.7 + Math.random() * 3.8,
      life: maxLife,
      maxLife,
    });
  }
}

function addFloatingText(x, y, value, color, scale = 1) {
  state.floatingTexts.push({
    x,
    y,
    value,
    color,
    rise: 42 * scale,
    life: 0.78 * scale,
    maxLife: 0.78 * scale,
  });
}

function addScreenShake(amount) {
  state.screenShake = Math.min(18, Math.max(state.screenShake, amount));
}

function getShakeOffset() {
  if (state.screenShake <= 0) return { x: 0, y: 0 };
  return {
    x: (Math.random() * 2 - 1) * state.screenShake,
    y: (Math.random() * 2 - 1) * state.screenShake,
  };
}

function getPuzzleShakeOffset() {
  if (!state.puzzle || state.puzzle.screenShake <= 0) return { x: 0, y: 0 };
  return {
    x: (Math.random() * 2 - 1) * state.puzzle.screenShake,
    y: (Math.random() * 2 - 1) * state.puzzle.screenShake,
  };
}

function getPuzzleCard(cardId) {
  if (!cardId) return null;
  const instance = state.puzzle?.deck.find((card) => card.instanceId === cardId);
  if (!instance) {
    const definition = getCardDefinition(cardId);
    return definition ? { ...definition, instanceId: cardId, cardType: definition.id, triggerType: definition.type, level: 1 } : null;
  }
  const definition = getCardDefinition(instance.type);
  if (!definition) return null;
  return {
    ...definition,
    instanceId: instance.instanceId,
    cardType: instance.type,
    type: instance.type,
    triggerType: definition.type,
    level: instance.level,
    description: describePuzzleCard(instance),
  };
}

function getPuzzleSlot(slotId) {
  return state.puzzle?.slots.find((slot) => slot.id === slotId) || null;
}

function isPuzzleCardPlaced(cardId) {
  return Boolean(state.puzzle?.slots.some((slot) => slot.placedCardId === cardId));
}

function getPuzzleBrokenGlassCount() {
  return state.puzzle?.segments.filter((segment) => segment.broken).length || 0;
}

function findPuzzleBlockingSegment(progress) {
  return state.puzzle.segments.find(
    (segment) => !segment.broken && progress >= segment.progressStart && progress <= segment.progressEnd,
  );
}

function formatPuzzleState(puzzleState) {
  return {
    planning: "Planning",
    running: "Running",
    attemptComplete: "Attempt Complete",
    roomVictory: "Room Solved",
    rewardChoice: "Reward Choice",
    nextRoomReady: "Next Room Ready",
    runFailed: "Run Collapsed",
    runCleared: "Run Cleared",
  }[puzzleState] || puzzleState;
}

function getPuzzleHint(report) {
  if (report.depthReached < 0.35) return "You need early power or energy.";
  const splitTriggers = Object.entries(report.cardsTriggered || {}).filter(([key]) => key.startsWith("x2") || key.startsWith("x3")).reduce((sum, [, value]) => sum + value, 0);
  if (splitTriggers > 0 && report.depthReached < 0.75) {
    return "Splits reduce energy. Add Battery or Booster after splitting.";
  }
  if (report.depthReached >= 1 && report.coreDamage > 0) return "Try Pierce or conserve energy before core.";
  return "Adjust cards and press SPACE to retry.";
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

function getTrackPoint(progress) {
  const t = clamp(progress, 0, 1);
  return getPointOnTrack(state.track, t);
}

function getPointOnTrack(track, progress) {
  const t = clamp(progress, 0, 1);
  const scaled = t * (track.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, track.length - 1);
  const local = scaled - index;
  const a = track[index];
  const b = track[nextIndex];

  return {
    x: lerp(a.x, b.x, local),
    y: lerp(a.y, b.y, local),
  };
}

function getPointAtProgress(progress) {
  return getTrackPoint(progress);
}

function getTrackTangent(progress) {
  const before = getTrackPoint(progress - 0.002);
  const after = getTrackPoint(progress + 0.002);
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function getTangentAtProgress(progress) {
  return getTrackTangent(progress);
}

function getTrackNormal(progress) {
  const tangent = getTrackTangent(progress);
  return { x: -tangent.y, y: tangent.x };
}

function getPuzzleTrackPoint(progress) {
  return getPointOnTrack(state.puzzle.track, progress);
}

function getPuzzleTrackTangent(progress) {
  const before = getPuzzleTrackPoint(progress - 0.002);
  const after = getPuzzleTrackPoint(progress + 0.002);
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function getPuzzleTrackNormal(progress) {
  const tangent = getPuzzleTrackTangent(progress);
  return { x: -tangent.y, y: tangent.x };
}

function getBallRenderPosition(ball) {
  const point = getTrackPoint(Math.min(ball.progress, 1));
  const normal = getTrackNormal(ball.progress);
  const fade = smoothstep(clamp(ball.progress / 0.045, 0, 1));
  const offset = clamp(ball.laneOffset * fade + ball.spreadOffset, -MAX_LANE_OFFSET, MAX_LANE_OFFSET);
  return {
    x: point.x + normal.x * offset,
    y: point.y + normal.y * offset,
  };
}

function getPuzzleBallRenderPosition(ball) {
  const point = getPuzzleTrackPoint(Math.min(ball.progress, 1));
  const normal = getPuzzleTrackNormal(ball.progress);
  const fade = smoothstep(clamp(ball.progress / 0.045, 0, 1));
  const offset = clamp(ball.laneOffset * fade + ball.spreadOffset, -MAX_LANE_OFFSET, MAX_LANE_OFFSET);
  return {
    x: point.x + normal.x * offset,
    y: point.y + normal.y * offset,
  };
}

function getStartLaneOffsets(count) {
  if (count <= 1) return [0];
  if (count === 2) return [-0.18, 0.18].map((value) => value * TRACK_WIDTH);
  if (count === 3) return [-0.25, 0, 0.25].map((value) => value * TRACK_WIDTH);

  const offsets = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    offsets.push(lerp(-0.3, 0.3, t) * TRACK_WIDTH);
  }
  return offsets.map((value) => clamp(value, -MAX_LANE_OFFSET, MAX_LANE_OFFSET));
}

function getSpreadLaneOffsets(count) {
  return getStartLaneOffsets(count).map((value) => value * 0.72);
}

function pickBallColor(multiplier, index) {
  const colors = {
    2: ["#fff5a8", "#f8fbff"],
    3: ["#8ff5ff", "#fff5a8", "#ffb8f2"],
    4: ["#8ff5ff", "#fff5a8", "#ffb8f2", "#b7ff9c"],
    5: ["#ffffff", "#8ff5ff", "#fff37a", "#b7ff9c", "#ffb8f2"],
    6: ["#ffffff", "#8ff5ff", "#fff37a", "#b7ff9c", "#ffb8f2", "#d7f4ff"],
  };
  return colors[multiplier]?.[index % colors[multiplier].length] || "#ffffff";
}

function getBallPower() {
  const rewardMultiplier = hasReward("temperedCore") ? 1.15 : 1;
  return Math.round(BASE_BALL_POWER * rewardMultiplier * (1 + state.upgrades.power * 0.1));
}

function getBallSpeed() {
  const rewardMultiplier = hasReward("quickLaunch") ? 1.08 : 1;
  return BASE_BALL_SPEED * rewardMultiplier * (1 + state.upgrades.speed * 0.05);
}

function getStartBalls() {
  return 1 + state.upgrades.balls + (hasReward("extraMarble") ? 1 : 0);
}

function getGlassDamage(power) {
  if (!hasReward("deepCrack") || state.levelFirstHitUsed) return power;
  state.levelFirstHitUsed = true;
  return power * 1.5;
}

function getCoreArmor() {
  if (!hasLevelModifier(state.level, "armoredCore")) return 0;
  return state.level.difficulty === "elite" || state.level.difficulty === "boss" ? 14 : 8;
}

function getEffectiveMultiplierValue(multiplier) {
  if (!hasReward("multiplierPolish") || state.levelMultiplierPolishUsed) return multiplier.value;
  state.levelMultiplierPolishUsed = true;
  return multiplier.value + 1;
}

function hasReward(id) {
  return state.rewards.some((reward) => reward.id === id);
}

function hasLevelModifier(level, id) {
  return level.modifiers?.includes(id);
}

function getUpgradeCost(type) {
  const level = state.upgrades[type];
  const costs = UPGRADE_COSTS[type];
  if (level < costs.length) return costs[level];
  return Math.round(costs[costs.length - 1] * 1.55 ** (level - costs.length + 1));
}

function getBrokenGlassCount() {
  return state.segments.filter((segment) => segment.broken).length;
}

function updateHud() {
  if (state.appState !== "arcadeRun" || !state.core) {
    hud.audioStatus.textContent = audio.muted ? "muted" : "on";
    return;
  }
  const broken = getBrokenGlassCount();
  hud.levelIndex.textContent = `${state.room} / ${ACT_ROOMS}`;
  hud.levelName.textContent = state.level.name;
  hud.difficulty.textContent = DIFFICULTY[state.level.difficulty].label;
  hud.trackType.textContent = state.level.trackType;
  hud.modifiers.textContent = getModifierNames().join(", ") || "none";
  hud.launches.textContent = state.launches;
  hud.totalLaunches.textContent = state.totalLaunches;
  hud.activeBalls.textContent = state.balls.length;
  hud.shards.textContent = state.shards;
  hud.powerUpgrade.textContent = `${state.upgrades.power} / ${getUpgradeCost("power")}`;
  hud.speedUpgrade.textContent = `${state.upgrades.speed} / ${getUpgradeCost("speed")}`;
  hud.ballsUpgrade.textContent = `${state.upgrades.balls} / ${getUpgradeCost("balls")}`;
  hud.rewardCount.textContent = state.rewards.length;
  hud.brokenGlass.textContent = `${broken} / ${state.segments.length}`;
  hud.coreHp.textContent = `${Math.ceil(state.core.hp)} / ${state.core.maxHp}`;
  hud.coreDistance.textContent = `${formatPercent(state.bestDepth)}`;
  hud.audioStatus.textContent = audio.muted ? "muted" : "on";
}

function getTheme() {
  return state.level.theme;
}

function getModifierNames(level = state.level) {
  return (level.modifiers || []).map((id) => LEVEL_MODIFIERS[id]?.name || id);
}

function getDangerText(level) {
  const names = getModifierNames(level);
  if (names.length === 0) return "Stable chamber.";
  return level.modifierDetails?.[0]?.shortDescription || LEVEL_MODIFIERS[level.modifiers[0]]?.shortDescription || "";
}

function formatPercent(value) {
  return `${Math.min(100, Math.floor(value * 100))}%`;
}

function formatMultiplierReport(counts) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return "none";
  return entries.map(([label, count]) => `${label} x${count}`).join(", ");
}

function roundRect(x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  let lineY = y;
  const lines = getWrappedLines(context, text, maxWidth, maxLines);
  for (const line of lines) {
    context.textAlign = "left";
    context.fillText(line, x, lineY);
    lineY += lineHeight;
  }
}

function getWrappedLines(context, text, maxWidth, maxLines = 99) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(lines.length + 1 >= maxLines ? `${line}...` : line);
      if (lines.length >= maxLines) return lines;
      line = word;
    } else {
      line = test;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function fitText(context, text, maxWidth, baseFont, minFontSize = 8) {
  const match = baseFont.match(/(\d+)px/);
  const baseSize = match ? Number(match[1]) : 10;
  const prefix = match ? baseFont.slice(0, match.index) : "900 ";
  const suffix = match ? baseFont.slice(match.index + match[0].length) : " Inter, system-ui, sans-serif";
  for (let size = baseSize; size >= minFontSize; size -= 1) {
    const font = `${prefix}${size}px${suffix}`;
    context.font = font;
    if (context.measureText(text).width <= maxWidth) return font;
  }
  return `${prefix}${minFontSize}px${suffix}`;
}

function rgba(hex, alpha) {
  const color = hexToRgb(hex);
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

init();
