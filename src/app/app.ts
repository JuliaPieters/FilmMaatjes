import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    // Eén iconfont voor de hele app (Material Symbols, met FILL-as voor actieve staten).
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
    inject(PwaUpdateService).init();
  }
}
