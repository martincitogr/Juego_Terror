// main.js — EL PABELLÓN: juego de terror en primera persona.
import * as THREE from 'three';
import { buildWorld, CELL, GRID, WALL_H, gridToWorld, worldToGrid } from './world.js';
import { Enemy } from './enemy.js';
import { HorrorAudio } from './audio.js';

// ---------------------------------------------------------------- Renderer y escena

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.075);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 80);

// Soporte yaw/pitch para la vista en primera persona
const pitchObj = new THREE.Object3D();
pitchObj.add(camera);
const yawObj = new THREE.Object3D();
yawObj.add(pitchObj);
scene.add(yawObj);

// Luz ambiental mínima: oscuridad casi total sin linterna
scene.add(new THREE.AmbientLight(0x2a2733, 1.1));

// Linterna del jugador
const flashlight = new THREE.SpotLight(0xffe6c0, 65, 28, 0.58, 0.7, 1.45);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(1024, 1024);
flashlight.shadow.camera.near = 0.2;
flashlight.shadow.camera.far = 26;
camera.add(flashlight);
flashlight.position.set(0.18, -0.22, 0.1);
const flashTarget = new THREE.Object3D();
flashTarget.position.set(0, -0.08, -10);
camera.add(flashTarget);
flashlight.target = flashTarget;

// ---------------------------------------------------------------- Mundo, enemigo y audio

const world = buildWorld(scene, renderer);
const enemy = new Enemy(scene, world);
const audio = new HorrorAudio();

// ---------------------------------------------------------------- Estado del juego

const EYE_HEIGHT = 1.62;
const state = {
  mode: 'menu',              // menu | playing | dead | win
  pos: new THREE.Vector3(gridToWorld(world.spawn.gx), EYE_HEIGHT, gridToWorld(world.spawn.gy)),
  yaw: Math.PI * 0.75,
  pitch: 0,
  battery: 100,
  stamina: 100,
  fuses: 0,
  flashlightOn: true,
  bobPhase: 0,
  flickerTimer: 0,
  elapsed: 0,
};

const keys = new Set();
const ui = {
  hud: document.getElementById('hud'),
  menu: document.getElementById('menu'),
  death: document.getElementById('death'),
  win: document.getElementById('win'),
  jumpscare: document.getElementById('jumpscare'),
  prompt: document.getElementById('prompt'),
  fuseCount: document.getElementById('fuse-count'),
  batteryBar: document.getElementById('battery-bar'),
  staminaBar: document.getElementById('stamina-bar'),
  btnStart: document.getElementById('btn-start'),
  btnRetry: document.getElementById('btn-retry'),
  btnAgain: document.getElementById('btn-again'),
  deathStats: document.getElementById('death-stats'),
  winStats: document.getElementById('win-stats'),
};

// ---------------------------------------------------------------- Entrada

document.addEventListener('keydown', e => {
  keys.add(e.code);
  if (state.mode !== 'playing') return;
  if (e.code === 'KeyF') {
    state.flashlightOn = !state.flashlightOn;
    audio._noiseBurst?.({ freq: 1500, gain: 0.06, dur: 0.05, type: 'highpass' });
  }
  if (e.code === 'KeyE') tryInteract();
});
document.addEventListener('keyup', e => keys.delete(e.code));

document.addEventListener('mousemove', e => {
  if (state.mode !== 'playing' || document.pointerLockElement !== canvas) return;
  state.yaw -= e.movementX * 0.0022;
  state.pitch -= e.movementY * 0.0022;
  state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch));
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && state.mode === 'playing') {
    // Esc → pausa: volvemos al menú como pantalla de pausa
    state.mode = 'paused';
    ui.menu.classList.remove('hidden');
    ui.btnStart.textContent = 'REANUDAR';
  }
});

ui.btnStart.addEventListener('click', () => {
  audio.init();
  ui.menu.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  state.mode = 'playing';
  canvas.requestPointerLock();
});
ui.btnRetry.addEventListener('click', () => location.reload());
ui.btnAgain.addEventListener('click', () => location.reload());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------- Colisiones

const PLAYER_RADIUS = 0.42;

function collideWalls(pos) {
  const gx = worldToGrid(pos.x), gz = worldToGrid(pos.z);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = gx + dx, cz = gz + dy;
      if (!world.isWall(cx, cz)) continue;
      const minX = gridToWorld(cx) - CELL / 2, maxX = gridToWorld(cx) + CELL / 2;
      const minZ = gridToWorld(cz) - CELL / 2, maxZ = gridToWorld(cz) + CELL / 2;
      const nx = Math.max(minX, Math.min(pos.x, maxX));
      const nz = Math.max(minZ, Math.min(pos.z, maxZ));
      const ddx = pos.x - nx, ddz = pos.z - nz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < PLAYER_RADIUS * PLAYER_RADIUS && d2 > 1e-9) {
        const d = Math.sqrt(d2);
        const push = PLAYER_RADIUS - d;
        pos.x += (ddx / d) * push;
        pos.z += (ddz / d) * push;
      }
    }
  }
}

// ---------------------------------------------------------------- Interacción

function nearestInteractable() {
  let best = null, bestD = 1.9;
  for (const item of world.items) {
    if (item.taken) continue;
    const d = state.pos.distanceTo(item.mesh.position);
    if (d < bestD) { bestD = d; best = { kind: 'item', item }; }
  }
  const exitPos = new THREE.Vector3(gridToWorld(world.exit.gx), EYE_HEIGHT, gridToWorld(world.exit.gy));
  if (state.pos.distanceTo(exitPos) < 2.6) {
    best = { kind: 'exit' };
  }
  return best;
}

function tryInteract() {
  const target = nearestInteractable();
  if (!target) return;
  if (target.kind === 'item') {
    const item = target.item;
    item.taken = true;
    item.mesh.visible = false;
    if (item.glow) item.glow.visible = false;
    if (item.type === 'fuse') {
      state.fuses++;
      ui.fuseCount.textContent = state.fuses;
      audio.pickup(true);
    } else {
      state.battery = Math.min(100, state.battery + 55);
      audio.pickup(false);
    }
  } else if (target.kind === 'exit') {
    if (state.fuses >= 6) winGame();
    else audio.doorCreak(); // está cerrada: solo cruje
  }
}

// ---------------------------------------------------------------- Jumpscare y finales

function drawScareFace() {
  const c = document.getElementById('scare-face');
  const ctx = c.getContext('2d');
  const S = 512;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  // Rostro pálido y alargado
  const g = ctx.createRadialGradient(256, 270, 40, 256, 270, 220);
  g.addColorStop(0, '#cfc4b4');
  g.addColorStop(0.7, '#8f8474');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(256, 270, 150, 215, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cuencas vacías
  for (const ex of [190, 322]) {
    const eg = ctx.createRadialGradient(ex, 215, 4, ex, 215, 48);
    eg.addColorStop(0, '#000');
    eg.addColorStop(0.75, '#0a0505');
    eg.addColorStop(1, 'rgba(20,8,8,0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.ellipse(ex, 215, 46, 56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2418';
    ctx.beginPath();
    ctx.arc(ex + 4, 220, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Boca abierta desencajada
  ctx.fillStyle = '#050202';
  ctx.beginPath();
  ctx.ellipse(256, 372, 55, 92, 0, 0, Math.PI * 2);
  ctx.fill();
  // Grietas en la piel
  ctx.strokeStyle = 'rgba(40,30,25,0.8)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    let x = 130 + Math.random() * 250, y = 90 + Math.random() * 330;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Ruido
  const img = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 38;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function killPlayer() {
  if (state.mode !== 'playing') return;
  state.mode = 'dead';
  document.exitPointerLock();
  audio.jumpscare();
  drawScareFace();
  ui.hud.classList.add('hidden');
  ui.jumpscare.classList.remove('hidden');
  setTimeout(() => {
    ui.jumpscare.classList.add('hidden');
    ui.deathStats.textContent =
      `Sobreviviste ${formatTime(state.elapsed)} y reuniste ${state.fuses}/6 fusibles.`;
    ui.death.classList.remove('hidden');
  }, 1600);
}

function winGame() {
  state.mode = 'win';
  document.exitPointerLock();
  audio.doorCreak();
  ui.hud.classList.add('hidden');
  setTimeout(() => {
    ui.winStats.textContent = `Tiempo: ${formatTime(state.elapsed)}.`;
    ui.win.classList.remove('hidden');
  }, 1200);
}

function formatTime(s) {
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- Bucle principal

const clock = new THREE.Clock();
let stepAccum = 0;
let threatLevel = 0;

function update(dt) {
  state.elapsed += dt;

  // ---- Movimiento ----
  const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
                  (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
                 (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const moving = forward !== 0 || strafe !== 0;
  const wantRun = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const running = wantRun && moving && state.stamina > 2;

  const speed = running ? 5.2 : 3.1;
  if (moving) {
    const sin = Math.sin(state.yaw), cos = Math.cos(state.yaw);
    const dx = (sin * -forward + cos * strafe);
    const dz = (cos * -forward - sin * strafe);
    const len = Math.hypot(dx, dz) || 1;
    state.pos.x += (dx / len) * speed * dt;
    state.pos.z += (dz / len) * speed * dt;
    collideWalls(state.pos);

    // Pasos sincronizados con el balanceo
    stepAccum += speed * dt;
    if (stepAccum > (running ? 2.4 : 2.0)) {
      stepAccum = 0;
      audio.footstep(running);
    }
    state.bobPhase += dt * (running ? 11 : 7.5);
  }

  // Resistencia
  if (running) state.stamina = Math.max(0, state.stamina - 20 * dt);
  else state.stamina = Math.min(100, state.stamina + 13 * dt);

  // ---- Cámara ----
  const bob = Math.sin(state.bobPhase) * (moving ? 0.045 : 0);
  const sway = Math.sin(state.bobPhase * 0.5) * (moving ? 0.02 : 0);
  yawObj.position.set(state.pos.x + sway, EYE_HEIGHT + bob, state.pos.z);
  yawObj.rotation.y = state.yaw;
  pitchObj.rotation.x = state.pitch;

  // ---- Linterna ----
  if (state.flashlightOn && state.battery > 0) {
    state.battery = Math.max(0, state.battery - dt * (100 / 110)); // ~110 s de batería
    let intensity = 65;
    if (state.battery < 22) intensity *= 0.4 + 0.6 * (state.battery / 22); // se va apagando
    // Parpadeo cuando el enemigo anda cerca
    if (threatLevel > 0.55) {
      state.flickerTimer -= dt;
      if (state.flickerTimer <= 0) {
        state.flickerTimer = 0.04 + Math.random() * 0.12;
        if (Math.random() < threatLevel * 0.45) intensity *= 0.15;
      }
    }
    flashlight.intensity += (intensity - flashlight.intensity) * Math.min(1, dt * 30);
  } else {
    flashlight.intensity += (0 - flashlight.intensity) * Math.min(1, dt * 20);
  }

  // ---- Enemigo ----
  const dist = enemy.update(dt, state.pos, state.fuses);
  threatLevel = Math.max(0, Math.min(1, 1 - dist / 22));
  if (dist < 1.15) killPlayer();

  // ---- Mundo vivo ----
  const t = state.elapsed;
  for (const fl of world.flickerLights) {
    // Fluorescentes que zumban y fallan
    const flicker =
      Math.random() < 0.015 ? 0.05 :
      0.7 + 0.3 * Math.sin(t * 17 + fl.phase) * Math.sin(t * 3.1 + fl.phase);
    fl.light.intensity = fl.base * Math.max(0.05, flicker);
    fl.lampMat.emissiveIntensity = 0.15 + flicker;
  }
  for (const item of world.items) {
    if (item.taken) continue;
    item.mesh.position.y = item.baseY + Math.sin(t * 2 + item.gx) * 0.06;
    item.mesh.rotation.y += dt * 1.2;
  }
  world.dust.rotation.y += dt * 0.004;

  // ---- Interacción / HUD ----
  const target = nearestInteractable();
  if (target) {
    ui.prompt.classList.remove('hidden');
    if (target.kind === 'item') {
      ui.prompt.textContent = target.item.type === 'fuse'
        ? 'E — COGER FUSIBLE' : 'E — COGER PILAS';
    } else {
      ui.prompt.textContent = state.fuses >= 6
        ? 'E — ABRIR LA PUERTA Y ESCAPAR'
        : `LA PUERTA NO TIENE CORRIENTE (${state.fuses}/6 FUSIBLES)`;
    }
  } else {
    ui.prompt.classList.add('hidden');
  }
  ui.batteryBar.style.width = `${state.battery}%`;
  ui.staminaBar.style.width = `${state.stamina}%`;

  // ---- Audio dinámico ----
  audio.update(dt, threatLevel);
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.mode === 'playing') update(dt);
  renderer.render(scene, camera);
}

// Posición inicial de cámara para el fondo del menú
yawObj.position.copy(state.pos);
yawObj.rotation.y = state.yaw;
loop();
