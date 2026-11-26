import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MascotComponent } from '../../shared/components/mascot/mascot.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButton, MatIcon, MascotComponent],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
})
export class NotFoundComponent {}
