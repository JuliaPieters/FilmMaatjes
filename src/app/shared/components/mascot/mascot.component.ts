import { Component, computed, input } from '@angular/core';

export type MascotPose = 'zwaai' | 'knipoog' | 'action';

/** Klappie, de filmklapper-mascotte uit het merkpakket (versie voor donkere achtergrond). */
@Component({
  selector: 'app-mascot',
  template: `
    <img
      [src]="src()"
      [alt]="alt()"
      [attr.aria-hidden]="alt() ? null : true"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [class.float]="float()"
      class="mascot"
      draggable="false"
      decoding="async"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }

    .mascot {
      display: block;
      max-width: none;
      user-select: none;
      filter: drop-shadow(0 10px 24px rgba(var(--color-accent-rgb), 0.35));
    }

    .float {
      animation: float 3.2s ease-in-out infinite;
    }
  `,
})
export class MascotComponent {
  readonly pose = input<MascotPose>('zwaai');
  readonly size = input<number>(120);
  readonly float = input<boolean>(false);
  readonly alt = input<string>('');

  protected readonly src = computed(() => `/assets/brand/mascotte/svg/klappie-${this.pose()}-op-donker.svg`);
}
