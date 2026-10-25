import Phaser from 'phaser';
import type { BatchId } from '../contracts';
import { getMap, MAX_MAP_PARTICLES, type MapDef } from '../config/maps';
import { themeColor } from '../config/theme';
import { createRng, type Rng } from '../logic/rng';

const TILE_PX = 32;
const DEPTH = -100;
const DOT_KEY = 'map-dot';

type Depthable = Phaser.GameObjects.GameObject & { setDepth(d: number): unknown };

/** Optics only: tiled ground, light particles and a vignette. No physics, no obstacles. */
export class MapBackground {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    batch: BatchId,
    seed: number,
  ) {
    const def = getMap(batch);
    const rng = createRng(seed);
    const { width, height } = scene.scale;
    this.add(scene.add.rectangle(0, 0, width, height, def.baseColor).setOrigin(0, 0));
    this.addTiles(def, rng, width, height);
    this.addParticles(def, rng, width, height);
    this.addVignette(def, width, height);
  }

  private add<T extends Depthable>(o: T): T {
    o.setDepth(DEPTH);
    this.objects.push(o);
    return o;
  }

  private addTiles(def: MapDef, rng: Rng, width: number, height: number): void {
    const tex = this.scene.textures;
    if (!tex.exists(def.tilesetKey)) return;
    const frames = Math.max(1, tex.get(def.tilesetKey).frameTotal - 1); // minus __BASE
    const cols = Math.ceil(width / TILE_PX);
    const rows = Math.ceil(height / TILE_PX);
    // One render texture: the whole floor is drawn once, not per frame.
    const rt = this.scene.add.renderTexture(0, 0, width, height).setOrigin(0, 0);
    rt.beginDraw();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const deco = frames > 1 && rng.next() < def.decoDensity;
        const frame = deco ? 1 + Math.floor(rng.next() * (frames - 1)) : 0;
        rt.batchDrawFrame(def.tilesetKey, frame, c * TILE_PX, r * TILE_PX, 1, def.tint);
      }
    }
    rt.endDraw();
    this.add(rt);
  }

  private addParticles(def: MapDef, rng: Rng, width: number, height: number): void {
    if (def.effect === 'none') return;
    if (!this.scene.textures.exists(DOT_KEY)) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(themeColor('game.hit-flash').num, 1).fillCircle(2, 2, 2);
      g.generateTexture(DOT_KEY, 4, 4);
      g.destroy();
    }
    const count = Math.min(def.effectCount, MAX_MAP_PARTICLES);
    const fireflies = def.effect === 'fireflies';
    for (let i = 0; i < count; i++) {
      const x = rng.next() * width;
      const y = rng.next() * height;
      const dot = this.scene.add.image(x, y, DOT_KEY).setTint(def.effectColor).setAlpha(0.15);
      this.add(dot);
      this.scene.tweens.add({
        targets: dot,
        x: x + (rng.next() - 0.5) * 60,
        y: y + (fireflies ? (rng.next() - 0.5) * 40 : -30 - rng.next() * 30),
        alpha: fireflies ? 0.8 : 0.55,
        duration: 1500 + rng.next() * 2000,
        delay: rng.next() * 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private addVignette(def: MapDef, width: number, height: number): void {
    const key = `map-vignette-${width}x${height}-${Math.round(def.vignette * 100)}`;
    const tex = this.scene.textures;
    if (!tex.exists(key)) {
      const canvas = tex.createCanvas(key, width, height);
      const ctx = canvas?.getContext();
      if (!canvas || !ctx) return;
      const r = Math.hypot(width, height) / 2;
      const grad = ctx.createRadialGradient(width / 2, height / 2, r * 0.45, width / 2, height / 2, r);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${def.vignette})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      canvas.refresh();
    }
    this.add(this.scene.add.image(0, 0, key).setOrigin(0, 0));
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
  }
}
