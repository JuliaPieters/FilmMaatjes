import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomTabBarComponent } from '../bottom-tab-bar/bottom-tab-bar.component';
import { AuthService } from '../../features/auth/services/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, BottomTabBarComponent],
  templateUrl: './main-layout.component.html',
  styles: `
    .app-shell {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }

    /* Geen onderbalk voor gasten, dus ook geen ruimte ervoor reserveren */
    .app-shell.no-tabbar {
      --tabbar-h: 0px;
    }

    .app-main {
      flex: 1;
      width: 100%;
      min-width: 0;
    }
  `,
})
export class MainLayoutComponent {
  protected readonly authService = inject(AuthService);
}
