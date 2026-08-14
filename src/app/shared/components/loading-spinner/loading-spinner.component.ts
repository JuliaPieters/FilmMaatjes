import { Component, input } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  imports: [MatProgressSpinner],
  templateUrl: './loading-spinner.component.html',
})
export class LoadingSpinnerComponent {
  readonly message = input<string>('');
  readonly diameter = input<number>(48);
  readonly minHeight = input<string>('200px');
}
