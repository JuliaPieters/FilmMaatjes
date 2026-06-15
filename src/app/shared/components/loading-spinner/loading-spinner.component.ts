import { Component, input } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  imports: [MatProgressSpinner],
  template: `
    <div class="flex flex-col items-center justify-center gap-4" [style.min-height]="minHeight()">
      <mat-progress-spinner
        mode="indeterminate"
        [diameter]="diameter()"
        color="accent"
      />
      @if (message()) {
        <p class="text-text-secondary text-sm animate-pulse">{{ message() }}</p>
      }
    </div>
  `,
})
export class LoadingSpinnerComponent {
  readonly message = input<string>('');
  readonly diameter = input<number>(48);
  readonly minHeight = input<string>('200px');
}
