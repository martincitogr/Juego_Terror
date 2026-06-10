// enemy.js — "Él": criatura que recorre el pabellón buscando al jugador.
import * as THREE from 'three';
import { GRID, CELL, gridToWorld, worldToGrid } from './world.js';

export class Enemy {
  constructor(scene, world) {
    this.world = world;
    this.group = new THREE.Group();

    // Cuerpo demacrado, casi negro: solo la linterna revela su silueta
    const skin = new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.95 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.15, 6, 12), skin);
    torso.position.y = 1.35;
    torso.scale.set(1, 1, 0.7);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), skin);
    head.position.y = 2.28;
    head.scale.set(0.85, 1.25, 0.9);
    this.head = head;

    const armGeo = new THREE.CapsuleGeometry(0.06, 1.05, 4, 8);
    this.armL = new THREE.Mesh(armGeo, skin);
    this.armL.position.set(-0.38, 1.5, 0);
    this.armR = new THREE.Mesh(armGeo, skin);
    this.armR.position.set(0.38, 1.5, 0);

    const legGeo = new THREE.CapsuleGeometry(0.08, 0.85, 4, 8);
    const legL = new THREE.Mesh(legGeo, skin);
    legL.position.set(-0.14, 0.55, 0);
    const legR = new THREE.Mesh(legGeo, skin);
    legR.position.set(0.14, 0.55, 0);

    // Ojos: dos brasas que se ven en la oscuridad
    const eyeGeo = new THREE.SphereGeometry(0.026, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a16 });
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeL.position.set(-0.065, 2.32, 0.15);
    this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeR.position.set(0.065, 2.32, 0.15);

    this.group.add(torso, head, this.armL, this.armR, legL, legR, this.eyeL, this.eyeR);
    this.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(this.group);

    this.path = [];
    this.repathTimer = 0;
    this.time = 0;
    this.hunting = false;

    this.respawnFar();
  }

  respawnFar() {
    // Aparece en una celda transitable lejos del inicio del jugador
    const { dists } = this.world;
    let best = null, bestD = -1;
    for (let y = 1; y < GRID - 1; y++)
      for (let x = 1; x < GRID - 1; x++)
        if (dists[y][x] > bestD) { bestD = dists[y][x]; best = [x, y]; }
    // No exactamente en la salida: retrocede un poco eligiendo una celda al 70 % de distancia
    const target = Math.floor(bestD * 0.7);
    outer:
    for (let y = 1; y < GRID - 1; y++)
      for (let x = 1; x < GRID - 1; x++)
        if (dists[y][x] === target) { best = [x, y]; break outer; }
    this.group.position.set(gridToWorld(best[0]), 0, gridToWorld(best[1]));
  }

  bfsPath(sx, sy, tx, ty) {
    if (sx === tx && sy === ty) return [];
    const prev = new Map();
    const key = (x, y) => x + y * GRID;
    const q = [[sx, sy]];
    const seen = new Set([key(sx, sy)]);
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) {
        const path = [];
        let k = key(x, y);
        while (prev.has(k)) {
          const [px, py] = prev.get(k);
          path.unshift([k % GRID, Math.floor(k / GRID)]);
          k = key(px, py);
        }
        return path;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, nk = key(nx, ny);
        if (!this.world.isWall(nx, ny) && !seen.has(nk)) {
          seen.add(nk);
          prev.set(nk, [x, y]);
          q.push([nx, ny]);
        }
      }
    }
    return [];
  }

  hasLineOfSight(playerPos) {
    const from = this.group.position, to = playerPos;
    const dist = from.distanceTo(to);
    const steps = Math.ceil(dist / 0.5);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const z = from.z + (to.z - from.z) * t;
      if (this.world.isWall(worldToGrid(x), worldToGrid(z))) return false;
    }
    return true;
  }

  update(dt, playerPos, fusesCollected) {
    this.time += dt;
    const pos = this.group.position;
    // Distancia en el plano del suelo (la cámara del jugador está a la altura de los ojos)
    const dist = Math.hypot(playerPos.x - pos.x, playerPos.z - pos.z);

    // ¿Caza activa? Con línea de visión y cerca, acelera.
    this.hunting = dist < 16 && this.hasLineOfSight(playerPos);

    // Más rápido a medida que el jugador progresa
    let speed = 1.9 + fusesCollected * 0.28;
    if (this.hunting) speed += 1.5;

    // Recalcular ruta periódicamente
    this.repathTimer -= dt;
    if (this.repathTimer <= 0) {
      this.repathTimer = this.hunting ? 0.3 : 0.7;
      const path = this.bfsPath(
        worldToGrid(pos.x), worldToGrid(pos.z),
        worldToGrid(playerPos.x), worldToGrid(playerPos.z)
      );
      if (path.length) this.path = path;
    }

    // Seguir la ruta de celda en celda
    if (this.path.length) {
      const [gx, gy] = this.path[0];
      const target = new THREE.Vector3(gridToWorld(gx), 0, gridToWorld(gy));
      // Último tramo: ir directo al jugador si hay visión
      if (this.path.length <= 1 && this.hunting) target.set(playerPos.x, 0, playerPos.z);
      const dir = target.clone().sub(pos);
      dir.y = 0;
      const d = dir.length();
      if (d < 0.35) {
        this.path.shift();
      } else {
        dir.normalize();
        pos.addScaledVector(dir, speed * dt);
        const targetYaw = Math.atan2(dir.x, dir.z);
        let dy = targetYaw - this.group.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        this.group.rotation.y += dy * Math.min(1, dt * 8);
      }
    }

    // Animación: balanceo espasmódico, brazos colgando que se agitan al cazar
    const sway = this.hunting ? 14 : 6;
    const amp = this.hunting ? 0.32 : 0.12;
    this.armL.rotation.x = Math.sin(this.time * sway) * amp;
    this.armR.rotation.x = -Math.sin(this.time * sway) * amp;
    this.group.position.y = Math.abs(Math.sin(this.time * sway * 0.5)) * 0.05;
    this.head.rotation.z = Math.sin(this.time * 2.7) * 0.14;

    // La cabeza gira hacia el jugador cuando está cerca (efecto inquietante)
    if (dist < 10) {
      const look = Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z) - this.group.rotation.y;
      this.head.rotation.y += (look - this.head.rotation.y) * Math.min(1, dt * 4);
    } else {
      this.head.rotation.y *= 1 - Math.min(1, dt * 2);
    }

    return dist;
  }
}
