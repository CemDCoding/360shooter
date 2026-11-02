// Textures made at run time for the finisher (AP-160): one-colour silhouettes and the 50 % dither.
// Drawn with a 2D canvas, so they look the same with the WebGL and the Canvas renderer
// (tint and setTintFill do nothing in Canvas mode). Removed again by destroy().
import type Phaser from 'phaser';

let serial = 0;

export class TextureBank {
  private readonly keys: string[] = [];
  private readonly cache = new Map<string, string | null>();

  constructor(private readonly scene: Phaser.Scene) {}

  private newKey(kind: string): string {
    serial += 1;
    return `finisher-rt-${kind}-${serial}`;
  }

  /** Key of a silhouette of `texture`/`frame` filled with `css`; null if the texture is missing. */
  silhouette(texture: string, frame: string | number | undefined, css: string): string | null {
    const id = `sil|${texture}|${String(frame ?? 0)}|${css}`;
    const known = this.cache.get(id);
    if (known !== undefined) return known;
    let key: string | null = null;
    const textures = this.scene.textures;
    if (textures.exists(texture)) {
      const f = textures.getFrame(texture, frame ?? 0);
      const img = f?.source?.image as CanvasImageSource | undefined;
      if (f && img && f.cutWidth > 0 && f.cutHeight > 0) {
        const k = this.newKey('sil');
        const ct = textures.createCanvas(k, f.cutWidth, f.cutHeight);
        if (ct) {
          const ctx = ct.context;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            img,
            f.cutX,
            f.cutY,
            f.cutWidth,
            f.cutHeight,
            0,
            0,
            f.cutWidth,
            f.cutHeight,
          );
          ctx.globalCompositeOperation = 'source-in';
          ctx.fillStyle = css;
          ctx.fillRect(0, 0, f.cutWidth, f.cutHeight);
          ctx.globalCompositeOperation = 'source-over';
          ct.refresh();
          this.keys.push(k);
          key = k;
        }
      }
    }
    this.cache.set(id, key);
    return key;
  }

  /** 2 x 2 ordered dither (50 %): two diagonal pixels in `css`, two transparent. */
  dither(css: string): string | null {
    const id = `dither|${css}`;
    const known = this.cache.get(id);
    if (known !== undefined) return known;
    const k = this.newKey('dither');
    const ct = this.scene.textures.createCanvas(k, 2, 2);
    let key: string | null = null;
    if (ct) {
      ct.context.fillStyle = css;
      ct.context.fillRect(0, 0, 1, 1);
      ct.context.fillRect(1, 1, 1, 1);
      ct.refresh();
      this.keys.push(k);
      key = k;
    }
    this.cache.set(id, key);
    return key;
  }

  /** Removes every texture made by this bank. */
  destroy(): void {
    for (const k of this.keys) {
      if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    }
    this.keys.length = 0;
    this.cache.clear();
  }
}
