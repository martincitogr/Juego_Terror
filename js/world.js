// world.js — Generación procedural del pabellón: laberinto, texturas, objetos y luces.
import * as THREE from 'three';

export const CELL = 4;       // tamaño de celda en metros
export const WALL_H = 3.4;   // altura de techo
export const GRID = 31;      // tamaño de la rejilla (impar)

const HALF = (GRID * CELL) / 2;

export function gridToWorld(g) { return (g + 0.5) * CELL - HALF; }
export function worldToGrid(w) { return Math.floor((w + HALF) / CELL); }

// ---------------------------------------------------------------- Texturas procedurales

function rand(seedObj) {
  // PRNG mulberry32 para texturas reproducibles dentro de la sesión
  seedObj.s |= 0; seedObj.s = (seedObj.s + 0x6D2B79F5) | 0;
  let t = Math.imul(seedObj.s ^ (seedObj.s >>> 15), 1 | seedObj.s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function noisify(ctx, size, strength, seed) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const s = { s: seed };
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand(s) - 0.5) * strength;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function makeTexture(size, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawWall(ctx, size) {
  // Pared de hospital: pintura superior verdosa, zócalo inferior oscuro
  ctx.fillStyle = '#5d6354';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#3a3d33';
  ctx.fillRect(0, size * 0.62, size, size * 0.38);
  ctx.fillStyle = '#2a2c25';
  ctx.fillRect(0, size * 0.60, size, size * 0.025);

  const s = { s: 1234 };
  // Manchas de humedad que gotean
  for (let i = 0; i < 14; i++) {
    const x = rand(s) * size, y = rand(s) * size * 0.6, w = 4 + rand(s) * 22;
    const h = 30 + rand(s) * 140;
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(28,30,22,0.45)');
    g.addColorStop(1, 'rgba(28,30,22,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y, w, h);
  }
  // Desconchones de pintura
  for (let i = 0; i < 20; i++) {
    const x = rand(s) * size, y = rand(s) * size;
    ctx.fillStyle = `rgba(20,18,14,${0.15 + rand(s) * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + rand(s) * 14, 2 + rand(s) * 8, rand(s) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Grietas
  ctx.strokeStyle = 'rgba(15,15,12,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    let x = rand(s) * size, y = rand(s) * size * 0.5;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 8; j++) {
      x += (rand(s) - 0.5) * 30; y += rand(s) * 25;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  noisify(ctx, size, 26, 99);
}

function drawFloor(ctx, size) {
  // Baldosas viejas con lechada sucia
  const tile = size / 4;
  const s = { s: 777 };
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const v = 60 + rand(s) * 25;
      ctx.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
      ctx.fillRect(tx * tile, ty * tile, tile, tile);
    }
  }
  ctx.strokeStyle = '#1e1d18';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * tile, 0); ctx.lineTo(i * tile, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * tile); ctx.lineTo(size, i * tile); ctx.stroke();
  }
  // Mugre acumulada
  for (let i = 0; i < 30; i++) {
    const x = rand(s) * size, y = rand(s) * size;
    ctx.fillStyle = `rgba(25,22,16,${0.1 + rand(s) * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 5 + rand(s) * 30, 4 + rand(s) * 20, rand(s) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  noisify(ctx, size, 22, 55);
}

function drawCeiling(ctx, size) {
  ctx.fillStyle = '#3b3a36';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#26251f';
  ctx.lineWidth = 2;
  const panel = size / 2;
  for (let i = 0; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(i * panel, 0); ctx.lineTo(i * panel, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * panel); ctx.lineTo(size, i * panel); ctx.stroke();
  }
  const s = { s: 313 };
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(18,16,12,${0.15 + rand(s) * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(rand(s) * size, rand(s) * size, 8 + rand(s) * 40, 6 + rand(s) * 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  noisify(ctx, size, 18, 21);
}

function drawBlood(ctx, size) {
  ctx.clearRect(0, 0, size, size);
  const s = { s: 666 };
  const cx = size / 2, cy = size / 2;
  for (let i = 0; i < 9; i++) {
    const a = rand(s) * Math.PI * 2, d = rand(s) * size * 0.22;
    ctx.fillStyle = `rgba(${70 + rand(s) * 30},${8 + rand(s) * 8},${8},${0.5 + rand(s) * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d,
      10 + rand(s) * 55, 8 + rand(s) * 45, rand(s) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Salpicaduras
  for (let i = 0; i < 50; i++) {
    const a = rand(s) * Math.PI * 2, d = size * 0.2 + rand(s) * size * 0.28;
    ctx.fillStyle = `rgba(80,10,8,${0.4 + rand(s) * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + rand(s) * 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- Generación del laberinto

function generateGrid() {
  // 1 = pared, 0 = suelo. Backtracker recursivo sobre celdas impares.
  const g = Array.from({ length: GRID }, () => new Array(GRID).fill(1));
  const stack = [[1, 1]];
  g[1][1] = 0;
  const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options = dirs
      .map(([dx, dy]) => [cx + dx, cy + dy, cx + dx / 2, cy + dy / 2])
      .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < GRID - 1 && ny < GRID - 1 && g[ny][nx] === 1);
    if (!options.length) { stack.pop(); continue; }
    const [nx, ny, wx, wy] = options[Math.floor(Math.random() * options.length)];
    g[wy][wx] = 0; g[ny][nx] = 0;
    stack.push([nx, ny]);
  }
  // Salas abiertas (habitaciones del pabellón)
  for (let r = 0; r < 7; r++) {
    const w = 3 + Math.floor(Math.random() * 2) * 2;
    const h = 3 + Math.floor(Math.random() * 2) * 2;
    const x = 1 + 2 * Math.floor(Math.random() * ((GRID - w - 2) / 2));
    const y = 1 + 2 * Math.floor(Math.random() * ((GRID - h - 2) / 2));
    for (let j = y; j < y + h && j < GRID - 1; j++)
      for (let i = x; i < x + w && i < GRID - 1; i++)
        g[j][i] = 0;
  }
  // Algunos atajos para crear bucles
  let loops = 26;
  while (loops > 0) {
    const x = 1 + Math.floor(Math.random() * (GRID - 2));
    const y = 1 + Math.floor(Math.random() * (GRID - 2));
    if (g[y][x] === 1) {
      const open = (g[y][x - 1] === 0) + (g[y][x + 1] === 0) + (g[y - 1][x] === 0) + (g[y + 1][x] === 0);
      if (open >= 2) { g[y][x] = 0; loops--; }
    }
  }
  return g;
}

function bfsDistances(grid, sx, sy) {
  const dist = Array.from({ length: GRID }, () => new Array(GRID).fill(-1));
  const q = [[sx, sy]];
  dist[sy][sx] = 0;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < GRID && ny < GRID && grid[ny][nx] === 0 && dist[ny][nx] === -1) {
        dist[ny][nx] = dist[y][x] + 1;
        q.push([nx, ny]);
      }
    }
  }
  return dist;
}

// ---------------------------------------------------------------- Construcción de la escena

export function buildWorld(scene, renderer) {
  const grid = generateGrid();
  const aniso = renderer.capabilities.getMaxAnisotropy();

  const wallTex = makeTexture(256, drawWall, 1.2, 1);
  const floorTex = makeTexture(256, drawFloor, GRID, GRID);
  const ceilTex = makeTexture(256, drawCeiling, GRID, GRID);
  [wallTex, floorTex, ceilTex].forEach(t => (t.anisotropy = aniso));

  // Suelo y techo
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.05 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(GRID * CELL, GRID * CELL), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 1 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(GRID * CELL, GRID * CELL), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = WALL_H;
  scene.add(ceil);

  // Paredes instanciadas
  const wallCells = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      if (grid[y][x] === 1) wallCells.push([x, y]);

  const wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0.02 });
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, wallCells.length);
  const m = new THREE.Matrix4();
  wallCells.forEach(([x, y], i) => {
    m.setPosition(gridToWorld(x), WALL_H / 2, gridToWorld(y));
    walls.setMatrixAt(i, m);
  });
  walls.castShadow = true;
  walls.receiveShadow = true;
  scene.add(walls);

  // Celdas de suelo y callejones sin salida
  const floorCells = [], deadEnds = [];
  for (let y = 1; y < GRID - 1; y++)
    for (let x = 1; x < GRID - 1; x++)
      if (grid[y][x] === 0) {
        floorCells.push([x, y]);
        const open = (grid[y][x - 1] === 0) + (grid[y][x + 1] === 0) + (grid[y - 1][x] === 0) + (grid[y + 1][x] === 0);
        if (open === 1) deadEnds.push([x, y]);
      }

  // Aparición del jugador y salida lo más alejadas posible
  const spawn = { gx: 1, gy: 1 };
  const dists = bfsDistances(grid, spawn.gx, spawn.gy);
  let exit = { gx: GRID - 2, gy: GRID - 2 }, best = -1;
  for (const [x, y] of floorCells) {
    if (dists[y][x] > best) { best = dists[y][x]; exit = { gx: x, gy: y }; }
  }

  // Puerta de salida: panel metálico sobre la pared más cercana a la celda de salida
  const doorGeo = new THREE.BoxGeometry(2.2, 2.9, 0.18);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3b28, roughness: 0.6, metalness: 0.5 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.castShadow = true;
  let placed = false;
  for (const [dx, dy, ry] of [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]]) {
    if (grid[exit.gy + dy]?.[exit.gx + dx] === 1) {
      door.position.set(
        gridToWorld(exit.gx) + dx * (CELL / 2 - 0.12),
        1.45,
        gridToWorld(exit.gy) + dy * (CELL / 2 - 0.12)
      );
      door.rotation.y = ry;
      placed = true;
      break;
    }
  }
  if (!placed) door.position.set(gridToWorld(exit.gx), 1.45, gridToWorld(exit.gy));
  scene.add(door);

  // Letrero verde de SALIDA sobre la puerta
  const exitSign = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.34, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x113311, emissive: 0x1d7a2d, emissiveIntensity: 1.6 })
  );
  exitSign.position.copy(door.position).y = 3.05;
  exitSign.rotation.copy(door.rotation);
  scene.add(exitSign);
  const exitLight = new THREE.PointLight(0x2fae4a, 4, 7, 1.8);
  exitLight.position.copy(door.position).y = 2.9;
  scene.add(exitLight);

  // ---- Objetos: fusibles y pilas ----
  const items = [];
  const usedCells = new Set([`${spawn.gx},${spawn.gy}`, `${exit.gx},${exit.gy}`]);
  const pickCell = (pool, minDist) => {
    const candidates = pool.filter(([x, y]) =>
      !usedCells.has(`${x},${y}`) && dists[y][x] >= minDist);
    const list = candidates.length ? candidates : pool.filter(([x, y]) => !usedCells.has(`${x},${y}`));
    const c = list[Math.floor(Math.random() * list.length)];
    usedCells.add(`${c[0]},${c[1]}`);
    return c;
  };

  const fuseGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.34, 10);
  const fuseMat = new THREE.MeshStandardMaterial({
    color: 0x442200, emissive: 0xd07818, emissiveIntensity: 1.4, roughness: 0.4, metalness: 0.6
  });
  for (let i = 0; i < 6; i++) {
    const [gx, gy] = pickCell(deadEnds.length >= 6 ? deadEnds : floorCells, 6);
    const mesh = new THREE.Mesh(fuseGeo, fuseMat.clone());
    mesh.position.set(gridToWorld(gx), 0.55, gridToWorld(gy));
    const glow = new THREE.PointLight(0xd07818, 1.6, 5, 2);
    glow.position.copy(mesh.position);
    scene.add(mesh, glow);
    items.push({ type: 'fuse', mesh, glow, gx, gy, taken: false, baseY: 0.55 });
  }

  const battGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10);
  const battMat = new THREE.MeshStandardMaterial({
    color: 0x0a2a0a, emissive: 0x2a8a2a, emissiveIntensity: 0.9, roughness: 0.5, metalness: 0.4
  });
  for (let i = 0; i < 5; i++) {
    const [gx, gy] = pickCell(floorCells, 4);
    const mesh = new THREE.Mesh(battGeo, battMat.clone());
    mesh.position.set(gridToWorld(gx), 0.5, gridToWorld(gy));
    scene.add(mesh);
    items.push({ type: 'battery', mesh, glow: null, gx, gy, taken: false, baseY: 0.5 });
  }

  // ---- Atrezo: cajas, bidones y manchas de sangre ----
  const propMat = new THREE.MeshStandardMaterial({ color: 0x4d3f2c, roughness: 0.9 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x39402f, roughness: 0.7, metalness: 0.4 });
  for (let i = 0; i < 16; i++) {
    const [gx, gy] = floorCells[Math.floor(Math.random() * floorCells.length)];
    if (usedCells.has(`${gx},${gy}`)) continue;
    const off = () => (Math.random() - 0.5) * (CELL - 2.2);
    let prop;
    if (Math.random() < 0.5) {
      const s = 0.5 + Math.random() * 0.5;
      prop = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), propMat);
      prop.position.set(gridToWorld(gx) + off(), s / 2, gridToWorld(gy) + off());
      prop.rotation.y = Math.random() * Math.PI;
    } else {
      prop = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), barrelMat);
      prop.position.set(gridToWorld(gx) + off(), 0.45, gridToWorld(gy) + off());
    }
    prop.castShadow = true;
    prop.receiveShadow = true;
    scene.add(prop);
  }

  const bloodTex = makeTexture(256, drawBlood);
  const bloodMat = new THREE.MeshStandardMaterial({
    map: bloodTex, transparent: true, roughness: 0.55, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1
  });
  for (let i = 0; i < 8; i++) {
    const [gx, gy] = floorCells[Math.floor(Math.random() * floorCells.length)];
    const blood = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), bloodMat);
    blood.rotation.x = -Math.PI / 2;
    blood.rotation.z = Math.random() * Math.PI * 2;
    blood.position.set(gridToWorld(gx), 0.012, gridToWorld(gy));
    scene.add(blood);
  }

  // ---- Fluorescentes moribundos ----
  const flickerLights = [];
  const lampGeo = new THREE.BoxGeometry(1.4, 0.08, 0.3);
  for (let i = 0; i < 9; i++) {
    const [gx, gy] = floorCells[Math.floor(Math.random() * floorCells.length)];
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x222222, emissive: 0xbfd4c8, emissiveIntensity: 0.8
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(gridToWorld(gx), WALL_H - 0.06, gridToWorld(gy));
    lamp.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;
    const light = new THREE.PointLight(0xb8d0c0, 6, 11, 1.9);
    light.position.set(gridToWorld(gx), WALL_H - 0.4, gridToWorld(gy));
    scene.add(lamp, light);
    flickerLights.push({ light, lampMat, base: 6, phase: Math.random() * 100 });
  }

  // ---- Polvo en suspensión ----
  const dustCount = 600;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * GRID * CELL;
    dustPos[i * 3 + 1] = Math.random() * WALL_H;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * GRID * CELL;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0x887f6e, size: 0.025, transparent: true, opacity: 0.5, sizeAttenuation: true
  }));
  scene.add(dust);

  const isWall = (gx, gy) =>
    gx < 0 || gy < 0 || gx >= GRID || gy >= GRID || grid[gy][gx] === 1;

  return { grid, spawn, exit, door, items, flickerLights, dust, isWall, dists };
}
