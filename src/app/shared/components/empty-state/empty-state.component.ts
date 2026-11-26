import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MascotComponent, MascotPose } from '../mascot/mascot.component';

@Component({
  selector: 'app-empty-state',
  imports: [MatIcon, MatButton, RouterLink, MascotComponent],
  templateUrl: './empty-state.component.html',
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3.5rem 1.5rem;
      text-align: center;

      &.compact {
        padding: 2rem 1rem;
      }
    }

    .empty-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      margin-bottom: 1.25rem;
      border-radius: 22px;
      background: rgba(var(--color-accent-rgb), 0.1);
      border: 1px solid rgba(var(--color-accent-rgb), 0.2);
      color: var(--color-accent-light);

      .mat-icon {
        font-size: 34px;
      }
    }

    .compact .empty-icon {
      width: 56px;
      height: 56px;
      margin-bottom: 1rem;
      border-radius: 16px;

      .mat-icon {
        font-size: 26px;
      }
    }

    .empty-mascot {
      margin-bottom: 1rem;
    }

    .empty-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .empty-description {
      max-width: 22rem;
      margin: 0.5rem 0 0;
      font-size: 0.9375rem;
      line-height: 1.55;
      color: var(--color-text-secondary);
    }

    .empty-action {
      margin-top: 1.5rem;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input<string>('movie');
  readonly title = input<string>('Niets gevonden');
  readonly description = input<string>('');
  readonly actionLabel = input<string>('');
  readonly actionRoute = input<string>('');
  readonly compact = input<boolean>(false);
  /** Toon Klappie in plaats van het icoon. */
  readonly mascot = input<MascotPose | null>(null);
}
