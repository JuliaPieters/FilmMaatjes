import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomTabBarComponent } from '../bottom-tab-bar/bottom-tab-bar.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, BottomTabBarComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-surface">
      <app-navbar />
      <main class="flex-1">
        <router-outlet />
      </main>
      <app-footer />
      <app-bottom-tab-bar />
    </div>
  `,
})
export class MainLayoutComponent {}
