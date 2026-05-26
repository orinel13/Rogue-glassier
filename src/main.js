import "./style.css";
import { AudioManager } from "./audio.js";

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const hud = {
  levelIndex: document.querySelector("#levelIndex"),
  levelName: document.querySelector("#levelName"),
  trackType: document.querySelector("#trackType"),
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
    description: "+15% base power until run end.",
  },
  {
    id: "quickLaunch",
    name: "Quick Launch",
    description: "+8% base speed until run end.",
  },
  {
    id: "extraMarble",
    name: "Extra Marble",
    description: "+1 start ball until run end.",
  },
  {
    id: "glassTax",
    name: "Glass Tax",
    description: "+20% shards from wave rewards.",
  },
  {
    id: "multiplierPolish",
    name: "Multiplier Polish",
    description: "First multiplier each level gets +1 value.",
  },
  {
    id: "deepCrack",
    name: "Deep Crack",
    description: "First hit each level deals +50% damage.",
  },
  {
    id: "coreBruiser",
    name: "Core Bruiser",
    description: "+25% damage to core.",
  },
  {
    id: "cleanBreak",
    name: "Clean Break",
    description: "+5 shards for each 10th broken segment in a level.",
  },
];

const LEVELS = [
  {
    name: "Glass Spiral",
    trackType: "spiral",
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
  },
  {
    name: "Serpent Cut",
    trackType: "snake",
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
    name: "Ring Chamber",
    trackType: "rings",
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
    name: "Clover Trap",
    trackType: "clover",
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
    name: "Zigzag Coil",
    trackType: "zigzagCoil",
    segments: 92,
    coreHp: 260,
    hpCurve: { start: 4, end: 26, exponent: 1.5 },
    multipliers: [
      { progress: 0.16, value: 2 },
      { progress: 0.38, value: 3 },
      { progress: 0.64, value: 2 },
      { progress: 0.86, value: 5 },
    ],
    theme: {
      accentColor: "#9ee8ff",
      glassTint: "#aeefff",
      backgroundGridStrength: 0.24,
    },
  },
  {
    name: "Broken Core",
    trackType: "brokenSpiral",
    turns: 3.25,
    segments: 68,
    coreHp: 390,
    hpCurve: { start: 6, end: 42, exponent: 1.6 },
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
  },
];

const audio = new AudioManager();

const state = {
  phase: "idle",
  levelIndex: 0,
  level: LEVELS[0],
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
  resetRun();

  window.addEventListener("keydown", async (event) => {
    await audio.unlock();

    if (event.code === "Space") {
      event.preventDefault();
      handleSpace();
      return;
    }

    if (event.key === "1") handleNumberKey(0, "power");
    if (event.key === "2") handleNumberKey(1, "speed");
    if (event.key === "3") handleNumberKey(2, "balls");
    if (event.key.toLowerCase() === "m") toggleMute();
  });

  requestAnimationFrame(tick);
}

function handleSpace() {
  if (state.phase === "nextLevelReady") {
    audio.play("uiClick");
    startLevel(state.levelIndex + 1);
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

function handleNumberKey(index, upgradeType) {
  if (state.phase === "rewardChoice") {
    chooseReward(index);
    return;
  }

  buyUpgrade(upgradeType);
}

function resetRun() {
  state.levelIndex = 0;
  state.shards = 0;
  state.totalLaunches = 0;
  state.upgrades = { power: 0, speed: 0, balls: 0 };
  state.rewards = [];
  state.rewardChoices = [];
  state.selectedReward = null;
  startLevel(0);
}

function startLevel(levelIndex) {
  state.phase = "idle";
  state.levelIndex = levelIndex;
  state.level = LEVELS[levelIndex];
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
  state.levelVictoryTimer = 0;
  state.transitionFade = 1;
  state.core = {
    hp: state.level.coreHp,
    maxHp: state.level.coreHp,
    broken: false,
  };
  state.waveStats = null;
  state.waveReport = null;
  state.coreFlash = 0;
  state.screenShake = 0;
  addFloatingText(CENTER.x, 76, state.level.name, getTheme().accentColor, 1.15);
  updateHud();
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
    const maxHp = Math.max(1, Math.round(baseHp + boost));

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

  update(dt);
  draw();
  requestAnimationFrame(tick);
}

function update(dt) {
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
      ball.power = Math.max(1, overflow);
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
  return shards;
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
  let seed = state.levelIndex * 17 + state.totalLaunches * 31 + state.shards;

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
  state.phase = "nextLevelReady";
  audio.play("upgrade");
  addFloatingText(CENTER.x, 100, `${reward.name} acquired`, "#fff37a", 1);
  updateHud();
}

function toggleMute() {
  const muted = audio.toggleMute();
  addFloatingText(CENTER.x, 76, muted ? "AUDIO OFF" : "AUDIO ON", muted ? "#ffb6b6" : "#baf5ff", 0.8);
  updateHud();
}

function damageCore(amount, ball) {
  if (state.core.broken) return;

  const damage = hasReward("coreBruiser") ? amount * 1.25 : amount;
  const appliedDamage = Math.min(damage, state.core.hp);
  state.core.hp = Math.max(0, state.core.hp - damage);
  state.waveStats.damageDealt += appliedDamage;
  state.waveStats.depthReached = 1;
  state.bestDepth = 1;
  ball.alive = false;

  const corePoint = getPointAtProgress(1);
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
  const finalLevel = state.levelIndex === LEVELS.length - 1;
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
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

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
  drawTransitionFade();
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

    if (segment.broken) {
      drawPathRange(segment.progressStart, segment.progressEnd, {
        lineWidth: 30,
        strokeStyle: rgba(theme.glassTint, 0.035),
      });
      continue;
    }

    drawPathRange(segment.progressStart, segment.progressEnd, {
      lineWidth: 31,
      strokeStyle: rgba(theme.glassTint, density + integrity * 0.34),
      shadowBlur: 13,
      shadowColor: rgba(theme.glassTint, 0.18 + integrity * 0.32),
    });
    drawPathRange(segment.progressStart, segment.progressEnd, {
      lineWidth: 12,
      strokeStyle: `rgba(245, 255, 255, ${0.1 + integrity * 0.36})`,
    });

    if (integrity < 0.72) {
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

function drawMultipliers() {
  for (const multiplier of state.multipliers) {
    const { x, y } = multiplier.point;
    const pulse = Math.sin(performance.now() * 0.006 + multiplier.progress * 20) * 0.5 + 0.5;
    const flash = multiplier.flash;
    const radius = 17 + pulse * 2.5 + flash * 12;

    ctx.save();
    ctx.shadowBlur = 22 + pulse * 10 + flash * 34;
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
  ctx.fillStyle = "#baf5ff";
  ctx.font = "800 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CORE", corePoint.x, corePoint.y + radius + 18);
  ctx.restore();
}

function drawBallTrails() {
  for (const ball of state.balls) {
    if (ball.trail.length < 2) continue;
    ctx.save();
    ctx.lineWidth = Math.max(2, ball.radius * 0.7);
    ctx.lineCap = "round";
    ctx.strokeStyle = ball.color;
    for (let i = 1; i < ball.trail.length; i += 1) {
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
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = ball.color;
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
  if (!["levelVictory", "rewardChoice", "nextLevelReady", "actCleared"].includes(state.phase)) return;

  const isFinal = state.levelIndex === LEVELS.length - 1;
  const nextLevel = LEVELS[state.levelIndex + 1];

  ctx.save();
  ctx.fillStyle = "rgba(2, 5, 9, 0.42)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "rgba(4, 9, 14, 0.78)";
  ctx.strokeStyle = rgba(getTheme().accentColor, 0.52);
  roundRect(CENTER.x - 300, CENTER.y - 230, 600, 430, 8);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 36;
  ctx.shadowColor = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 54px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isFinal ? "ACT 1 CLEARED" : "LEVEL COMPLETE", CENTER.x, CENTER.y - 170);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#b9f8ff";
  ctx.font = "800 22px Inter, system-ui, sans-serif";
  ctx.fillText(state.level.name, CENTER.x, CENTER.y - 122);

  if (isFinal) {
    drawActClearedStats();
    ctx.fillStyle = "#baf5ff";
    ctx.font = "800 18px Inter, system-ui, sans-serif";
    ctx.fillText("Press SPACE to start new run", CENTER.x, CENTER.y + 160);
    ctx.restore();
    return;
  }

  drawLevelCompleteStats(nextLevel);
  drawRewardChoices();
  ctx.restore();
}

function drawLevelCompleteStats(nextLevel) {
  ctx.font = "700 15px Inter, system-ui, sans-serif";
  const lines = [
    ["Launches this level", state.launches],
    ["Total launches", state.totalLaunches],
    ["Shards earned this level", state.levelShardsEarned],
    ["Best depth", "100%"],
    ["Core", "destroyed"],
    ["Next level", nextLevel.name],
  ];
  let y = CENTER.y - 86;
  for (const [label, value] of lines) {
    ctx.fillStyle = "#93aeb9";
    ctx.textAlign = "left";
    ctx.fillText(label, CENTER.x - 250, y);
    ctx.fillStyle = "#eaffff";
    ctx.textAlign = "right";
    ctx.fillText(String(value), CENTER.x + 250, y);
    y += 24;
  }
}

function drawRewardChoices() {
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
    CENTER.y + 70,
  );

  const cardY = CENTER.y + 100;
  const cardW = 176;
  const cardH = 86;
  const gap = 14;
  const startX = CENTER.x - cardW - gap;

  state.rewardChoices.forEach((reward, index) => {
    const x = startX + index * (cardW + gap);
    const selected = state.selectedReward?.id === reward.id;
    ctx.fillStyle = selected ? rgba(getTheme().accentColor, 0.22) : "rgba(9, 19, 27, 0.84)";
    ctx.strokeStyle = selected ? "#ffffff" : rgba(getTheme().accentColor, 0.34);
    roundRect(x, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 14px Inter, system-ui, sans-serif";
    ctx.fillText(`${index + 1}. ${reward.name}`, x + cardW / 2, cardY + 18);
    ctx.fillStyle = "#b9dbe4";
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    wrapText(reward.description, x + 14, cardY + 38, cardW - 28, 14);
  });

  if (state.phase === "nextLevelReady") {
    ctx.fillStyle = "#baf5ff";
    ctx.font = "900 15px Inter, system-ui, sans-serif";
    ctx.fillText("Press SPACE for next level", CENTER.x, CENTER.y + 208);
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

function drawTransitionFade() {
  if (state.transitionFade <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(2, 5, 9, ${state.transitionFade * 0.76})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
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

function getTrackPoint(progress) {
  const t = clamp(progress, 0, 1);
  const scaled = t * (state.track.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, state.track.length - 1);
  const local = scaled - index;
  const a = state.track[index];
  const b = state.track[nextIndex];

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

function getEffectiveMultiplierValue(multiplier) {
  if (!hasReward("multiplierPolish") || state.levelMultiplierPolishUsed) return multiplier.value;
  state.levelMultiplierPolishUsed = true;
  return multiplier.value + 1;
}

function hasReward(id) {
  return state.rewards.some((reward) => reward.id === id);
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
  const broken = getBrokenGlassCount();
  hud.levelIndex.textContent = `${state.levelIndex + 1} / ${LEVELS.length}`;
  hud.levelName.textContent = state.level.name;
  hud.trackType.textContent = state.level.trackType;
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

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.textAlign = "left";
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }

  if (line) {
    ctx.textAlign = "left";
    ctx.fillText(line, x, lineY);
  }
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
