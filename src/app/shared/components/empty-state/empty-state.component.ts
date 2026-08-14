import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  imports: [MatIcon, MatButton, RouterLink],
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  readonly icon = input<string>('movie');
  readonly title = input<string>('Niets gevonden');
  readonly description = input<string>('Er is hier nog niets te zien.');
  readonly actionLabel = input<string>('');
  readonly actionRoute = input<string>('');
}
