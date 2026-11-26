import { Injectable } from '@angular/core';

/**
 * Bepaalt de sfeerkleur van een poster (als "r, g, b" voor rgba(var(...))) door een
 * piepkleine versie op een canvas te samplen. Levendige, middelhelle pixels wegen
 * zwaarder dan grijs/zwart/wit, zodat Dune oranje en Interstellar blauw oplevert.
 */
@Injectable({ providedIn: 'root' })
export class PosterColorService {
  private readonly cache = new Map<string, Promise<string | null>>();

  getColor(posterPath: string | null | undefined): Promise<string | null> {
    if (!posterPath) return Promise.resolve(null);
    let result = this.cache.get(posterPath);
    if (!result) {
      result = this.sample(`https://image.tmdb.org/t/p/w92${posterPath}`).catch(() => null);
      this.cache.set(posterPath, result);
    }
    return result;
  }

  private sample(url: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onerror = reject;
      img.onload = () => {
        const w = 24;
        const h = 36;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        let r = 0, g = 0, b = 0, total = 0;
        for (let i = 0; i < data.length; i += 4) {
          const [pr, pg, pb] = [data[i], data[i + 1], data[i + 2]];
          const max = Math.max(pr, pg, pb);
          const min = Math.min(pr, pg, pb);
          const lightness = (max + min) / 510;
          const saturation = max === 0 ? 0 : (max - min) / max;
          // Voorkeur voor verzadigde kleuren die niet bijna zwart of wit zijn.
          const weight = saturation * saturation * (1 - Math.abs(lightness - 0.5) * 1.6);
          if (weight <= 0) continue;
          r += pr * weight;
          g += pg * weight;
          b += pb * weight;
          total += weight;
        }
        if (total < 1) return resolve(null);
        resolve(this.toGlow(r / total, g / total, b / total));
      };
      img.src = url;
    });
  }

  /** Trekt de kleur op naar een heldere, verzadigde tint die mooi gloeit op donker. */
  private toGlow(r: number, g: number, b: number): string {
    const max = Math.max(r, g, b, 1);
    const scale = 220 / max;
    const boost = (v: number) => Math.round(Math.min(255, v * scale));
    return `${boost(r)}, ${boost(g)}, ${boost(b)}`;
  }
}
