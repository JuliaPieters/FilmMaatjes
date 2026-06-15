import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  imports: [MatIcon, MatButton, RouterLink],
  template: `
    <div class="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div class="w-20 h-20 rounded-full bg-surface-50 flex items-center justify-center mb-6">
        <mat-icon class="text-text-muted" style="font-size: 2.5rem; width: 2.5rem; height: 2.5rem;">
          {{ icon() }}
        </mat-icon>
      </div>
      <h3 class="text-xl font-semibold text-text-primary mb-2">{{ title() }}</h3>
      <p class="text-text-secondary max-w-sm mb-6">{{ description() }}</p>
      @if (actionLabel() && actionRoute()) {
        <a mat-flat-button color="primary" [routerLink]="actionRoute()">
          {{ actionLabel() }}
        </a>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input<string>('movie');
  readonly title = input<string>('Niets gevonden');
  readonly description = input<string>('Er is hier nog niets te zien.');
  readonly actionLabel = input<string>('');
  readonly actionRoute = input<string>('');
}
