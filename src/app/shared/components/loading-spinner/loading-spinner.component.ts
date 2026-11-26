import { Component, input } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  imports: [MatProgressSpinner],
  templateUrl: './loading-spinner.component.html',
  styles: `
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .loading-message {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-meta);
    }
  `,
})
export class LoadingSpinnerComponent {
  readonly message = input<string>('');
  readonly diameter = input<number>(36);
  readonly minHeight = input<string>('200px');
}
