# EL PABELLÓN 🩸

Juego de **terror en primera persona en 3D** ambientado en un hospital psiquiátrico abandonado.
Funciona en **Windows, macOS y Linux** (corre en el navegador con WebGL, sin instalación).

> 🎧 Juega con auriculares y a oscuras.

## Historia

Te despiertas dentro del pabellón del hospital San Bartolomé, clausurado en 1974.
La única puerta de salida está sellada por un sistema eléctrico antiguo: necesitas
encontrar **6 fusibles** repartidos por los pasillos y habitaciones para devolverle
la corriente y escapar. Pero no estás solo: **algo** recorre los pasillos, te oye
y te busca. Cuanto más progresas, más rápido se mueve.

## Cómo jugar

### Windows
Doble clic en **`Jugar-Windows.bat`** (requiere [Python](https://www.python.org/downloads/), normalmente ya instalado).

### macOS
Doble clic en **`Jugar-Mac.command`**.
La primera vez puede que necesites: clic derecho → *Abrir*, o darle permisos con
`chmod +x Jugar-Mac.command` en Terminal.

### Linux
```bash
./jugar-linux.sh
```

### Manualmente (cualquier sistema)
Cualquier servidor estático sirve:
```bash
python3 -m http.server 8666     # luego abre http://localhost:8666
# o bien
npx serve .
```

> Se necesita conexión a internet la primera vez (el motor Three.js se carga
> desde CDN). **Modo offline:** descarga
> [three.module.js](https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js)
> en una carpeta `libs/` y cambia la ruta del `importmap` en `index.html`
> a `"./libs/three.module.js"`.

## Controles

| Tecla | Acción |
|---|---|
| **W A S D** / Flechas | Moverse |
| **Ratón** | Mirar |
| **Shift** | Correr (gasta resistencia) |
| **F** | Encender/apagar la linterna |
| **E** | Coger objetos / abrir la puerta |
| **Esc** | Pausa |

## Mecánicas

- 🔦 **Linterna con batería**: dura ~2 minutos. Busca **pilas** para recargarla.
  Parpadea cuando *Él* está cerca…
- 🏃 **Resistencia**: correr cansa; administra el sprint para las huidas.
- 🧩 **Mapa procedural**: el pabellón (laberinto, salas, objetos y luces) se
  genera distinto en cada partida.
- 👁 **Enemigo con IA**: te persigue por el laberinto con búsqueda de rutas,
  acelera si te ve y se vuelve más rápido con cada fusible que recoges.
- ❤️ **Audio reactivo**: latidos, susurros, zumbidos y drones generados
  proceduralmente que se intensifican según la amenaza.

## Tecnología

- [Three.js](https://threejs.org/) (WebGL) — render 3D con sombras dinámicas,
  niebla volumétrica y tone mapping cinematográfico (ACES).
- **Texturas 100 % procedurales** (canvas): paredes con humedades y grietas,
  baldosas sucias, sangre…
- **Audio 100 % procedural** (WebAudio): sin un solo archivo de sonido.
- Sin dependencias de build: HTML + ES Modules.

## Estructura

```
index.html         Página, HUD y pantallas (menú, muerte, victoria)
css/style.css      Estilos, viñeta, grano de película, jumpscare
js/main.js         Bucle del juego, jugador, colisiones, linterna, HUD
js/world.js        Generación procedural del mapa, texturas y atrezo
js/enemy.js        IA del enemigo (BFS, acecho, persecución)
js/audio.js        Motor de audio procedural
```
