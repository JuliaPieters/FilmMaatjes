import { Component } from '@angular/core';

const COLORS = ['var(--color-accent-light)', 'var(--color-blush)', 'var(--color-gold)', 'var(--color-success)', 'var(--color-info)'];

/**
 * Eenmalige confetti-burst (alleen CSS, geen library). Render hem met een @if op het
 * moment dat er iets te vieren valt; hij verdwijnt vanzelf en blokkeert geen kliks.
 */
@Component({
  selector: 'app-confetti',
  template: `
    @for (piece of pieces; track $index) {
      <span
        class="piece"
        [style.--x.px]="piece.x"
        [style.--y.px]="piece.y"
        [style.--r.deg]="piece.r"
        [style.background]="piece.color"
        [style.animation-delay.ms]="piece.delay"
        [style.width.px]="piece.w"
        [style.height.px]="piece.h"
      ></span>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      overflow: hidden;
    }

    .piece {
      position: absolute;
      top: 40%;
      left: 50%;
      border-radius: 2px;
      opacity: 0;
      animation: burst 1.4s cubic-bezier(0.15, 0.7, 0.3, 1) forwards;
    }

    @keyframes burst {
      0% { opacity: 1; transform: translate(0, 0) rotate(0); }
      70% { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--x), var(--y)) rotate(var(--r)); }
    }

    @media (prefers-reduced-motion: reduce) {
      :host { display: none; }
    }
  `,
})
export class ConfettiComponent {
  protected readonly pieces = Array.from({ length: 42 }, (_, i) => {
    const angle = (i / 42) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 140 + Math.random() * 180;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance + 160,
      r: Math.random() * 720 - 360,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 120,
      w: 6 + Math.random() * 5,
      h: 8 + Math.random() * 8,
    };
  });
}
