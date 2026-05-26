import "./style.css";

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const hud = {
  launches: document.querySelector("#launches"),
  activeBalls: document.querySelector("#activeBalls"),
  brokenGlass: document.querySelector("#brokenGlass"),
  coreDistance: document.querySelector("#coreDistance"),
};

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const TAU = Math.PI * 2;

const state = {
  spiral: [],
  segments: [],
  multipliers: [],
  balls: [],
  particles: [],
  launches: 0,
  maxProgress: 0,
  won: false,
  coreFlash: 0,
  lastTime: 0,
};

function init() {
  resetLevel();
  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space") return;
    event.preventDefault();

    if (state.won) {
      resetLevel();
      return;
    }

    if (state.balls.length === 0) {
      launchBall();
    }
  });

  requestAnimationFrame(tick);
}

function resetLevel() {
  state.spiral = generateSpiral();
  state.segments = generateGlassSegments();
  state.multipliers = createMultipliers();
  state.balls = [];
  state.particles = [];
  state.launches = 0;
  state.maxProgress = 0;
  state.won = false;
  state.coreFlash = 0;
  updateHud();
}

function generateSpiral() {
  const points = [];
  const turns = 3.65;
  const samples = 860;
  const outerRadius = 382;
  const innerRadius = 30;
  const startAngle = -Math.PI * 0.12;

  let totalLength = 0;
  let previous = null;

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const eased = t ** 0.93;
    const angle = startAngle + eased * turns * TAU;
    const radius = outerRadius * (1 - t) + innerRadius * t;
    const point = {
      x: CENTER.x + Math.cos(angle) * radius,
      y: CENTER.y + Math.sin(angle) * radius,
      progress: t,
      distance: totalLength,
    };

    if (previous) {
      totalLength += distance(previous, point);
      point.distance = totalLength;
    }

    points.push(point);
    previous = point;
  }

  for (const point of points) {
    point.pathProgress = point.distance / totalLength;
  }

  return points;
}

function generateGlassSegments() {
  const segments = [];
  const count = 72;

  for (let i = 0; i < count; i += 1) {
    const start = i / count;
    const end = (i + 0.82) / count;
    const mid = (start + end) * 0.5;
    const maxHp = Math.max(1, Math.round(1 + mid * 4 + mid ** 2 * 12));

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

function createMultipliers() {
  return [
    { id: "m25", progress: 0.25, value: 2, triggered: 0 },
    { id: "m50", progress: 0.5, value: 3, triggered: 0 },
    { id: "m75", progress: 0.75, value: 1, triggered: 0 },
    { id: "m90", progress: 0.9, value: 5, triggered: 0 },
  ].map((multiplier) => ({
    ...multiplier,
    point: getPointAtProgress(multiplier.progress),
  }));
}

function launchBall() {
  state.launches += 1;
  const startPoint = getPointAtProgress(0);

  state.balls.push({
    progress: 0,
    speed: 0.155,
    power: 9,
    alive: true,
    radius: 8,
    color: "#f8fbff",
    triggeredMultipliers: new Set(),
    smallOffset: randomOffset(5),
    impactCooldown: 0,
    x: startPoint.x,
    y: startPoint.y,
  });

  burst(startPoint.x, startPoint.y, "#dffbff", 14, 110);
  updateHud();
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

  if (state.coreFlash > 0) {
    state.coreFlash = Math.max(0, state.coreFlash - dt);
  }

  updateHud();
}

function updateBalls(dt) {
  const spawned = [];

  for (const ball of state.balls) {
    if (!ball.alive) continue;

    ball.impactCooldown = Math.max(0, ball.impactCooldown - dt);
    ball.progress += ball.speed * dt;
    state.maxProgress = Math.max(state.maxProgress, ball.progress);

    handleMultipliers(ball, spawned);
    handleGlassCollision(ball);

    if (ball.progress >= 1 && ball.alive) {
      ball.alive = false;
      winLevel(ball);
    }

    const point = getPointAtProgress(Math.min(ball.progress, 1));
    ball.x = point.x + ball.smallOffset.x;
    ball.y = point.y + ball.smallOffset.y;
  }

  state.balls.push(...spawned);
  state.balls = state.balls.filter((ball) => ball.alive);
}

function handleGlassCollision(ball) {
  if (ball.impactCooldown > 0) return;

  let segment = findBlockingSegment(ball.progress);

  while (segment && ball.alive) {
    const hitPoint = getPointAtProgress(segment.progressStart);
    const damage = ball.power;
    segment.hp -= damage;
    ball.impactCooldown = 0.045;
    ball.progress = Math.max(ball.progress, segment.progressEnd + 0.001);
    state.maxProgress = Math.max(state.maxProgress, ball.progress);
    burst(hitPoint.x, hitPoint.y, segment.hp <= 0 ? "#c7fbff" : "#7ce6ff", 16, 160);

    if (segment.hp <= 0) {
      const overflow = Math.abs(segment.hp);
      segment.broken = true;
      segment.hp = 0;
      ball.power = Math.max(1, overflow);
      ball.speed = Math.min(ball.speed + 0.008, 0.23);
      segment = findBlockingSegment(ball.progress);
      continue;
    }

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
    burst(multiplier.point.x, multiplier.point.y, "#fff37a", 28, 230);

    if (multiplier.value <= 1) {
      ball.color = "#d9fff2";
      continue;
    }

    const copies = multiplier.value - 1;
    for (let i = 0; i < copies; i += 1) {
      spawned.push({
        ...ball,
        power: Math.max(2, Math.ceil(ball.power * 0.82)),
        radius: Math.max(6, ball.radius - 1),
        color: pickBallColor(multiplier.value, i),
        triggeredMultipliers: new Set(ball.triggeredMultipliers),
        smallOffset: randomOffset(10 + multiplier.value * 2),
        impactCooldown: 0.06,
      });
    }

    ball.smallOffset = randomOffset(8);
  }
}

function winLevel(ball) {
  state.won = true;
  state.coreFlash = 1.35;
  burst(ball.x, ball.y, "#ffffff", 90, 360);
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

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawSpiral();
  drawGlass();
  drawMultipliers();
  drawCore();
  drawBalls();
  drawParticles();
  drawWinOverlay();
}

function drawBackground() {
  const gradient = ctx.createRadialGradient(CENTER.x, CENTER.y, 20, CENTER.x, CENTER.y, 520);
  gradient.addColorStop(0, "#10202a");
  gradient.addColorStop(0.45, "#071017");
  gradient.addColorStop(1, "#030509");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.23;
  ctx.strokeStyle = "#1d3f4e";
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

function drawSpiral() {
  drawPathRange(0, 1, {
    lineWidth: 54,
    strokeStyle: "rgba(15, 45, 58, 0.62)",
    shadowBlur: 0,
  });
  drawPathRange(0, 1, {
    lineWidth: 34,
    strokeStyle: "rgba(92, 211, 236, 0.11)",
    shadowBlur: 16,
    shadowColor: "rgba(80, 225, 255, 0.34)",
  });
}

function drawGlass() {
  for (const segment of state.segments) {
    const integrity = segment.maxHp === 0 ? 0 : segment.hp / segment.maxHp;
    const centerProgress = (segment.progressStart + segment.progressEnd) * 0.5;
    const density = 0.14 + centerProgress * 0.22;

    if (segment.broken) {
      drawPathRange(segment.progressStart, segment.progressEnd, {
        lineWidth: 30,
        strokeStyle: "rgba(122, 223, 255, 0.035)",
      });
      continue;
    }

    drawPathRange(segment.progressStart, segment.progressEnd, {
      lineWidth: 31,
      strokeStyle: `rgba(152, 238, 255, ${density + integrity * 0.34})`,
      shadowBlur: 13,
      shadowColor: `rgba(115, 232, 255, ${0.18 + integrity * 0.32})`,
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
    const radius = 17 + pulse * 2.5;

    ctx.save();
    ctx.shadowBlur = 22 + pulse * 10;
    ctx.shadowColor = multiplier.value === 1 ? "#80ffd4" : "#fff37a";
    ctx.fillStyle = multiplier.value === 1 ? "rgba(99, 255, 208, 0.9)" : "rgba(255, 230, 84, 0.95)";
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

function drawCore() {
  const pulse = Math.sin(performance.now() * 0.005) * 0.5 + 0.5;
  const flash = state.coreFlash;
  const radius = 29 + pulse * 5 + flash * 50;

  ctx.save();
  ctx.shadowBlur = 28 + flash * 70;
  ctx.shadowColor = flash > 0 ? "#ffffff" : "#72eeff";
  ctx.fillStyle = flash > 0 ? `rgba(255, 255, 255, ${0.45 + flash * 0.35})` : "rgba(87, 229, 255, 0.78)";
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, radius, 0, TAU);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#061019";
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, 14 + pulse * 2, 0, TAU);
  ctx.fill();
  ctx.restore();
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

function drawWinOverlay() {
  if (!state.won) return;

  ctx.save();
  ctx.fillStyle = "rgba(2, 5, 9, 0.32)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.shadowBlur = 36;
  ctx.shadowColor = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 76px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CORE BROKEN", CENTER.x, CENTER.y - 82);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#b9f8ff";
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  ctx.fillText("Press SPACE to restart", CENTER.x, CENTER.y - 22);
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

function getPointAtProgress(progress) {
  const t = clamp(progress, 0, 1);
  const scaled = t * (state.spiral.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, state.spiral.length - 1);
  const local = scaled - index;
  const a = state.spiral[index];
  const b = state.spiral[nextIndex];

  return {
    x: lerp(a.x, b.x, local),
    y: lerp(a.y, b.y, local),
  };
}

function getTangentAtProgress(progress) {
  const before = getPointAtProgress(progress - 0.002);
  const after = getPointAtProgress(progress + 0.002);
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function randomOffset(radius) {
  const angle = Math.random() * TAU;
  const amount = Math.random() * radius;
  return {
    x: Math.cos(angle) * amount,
    y: Math.sin(angle) * amount,
  };
}

function pickBallColor(multiplier, index) {
  const colors = {
    2: ["#fff5a8", "#f8fbff"],
    3: ["#8ff5ff", "#fff5a8", "#ffb8f2"],
    5: ["#ffffff", "#8ff5ff", "#fff37a", "#b7ff9c", "#ffb8f2"],
  };
  return colors[multiplier]?.[index % colors[multiplier].length] || "#ffffff";
}

function updateHud() {
  const broken = state.segments.filter((segment) => segment.broken).length;
  hud.launches.textContent = state.launches;
  hud.activeBalls.textContent = state.balls.length;
  hud.brokenGlass.textContent = `${broken} / ${state.segments.length}`;
  hud.coreDistance.textContent = `${Math.min(100, Math.floor(state.maxProgress * 100))}%`;
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
