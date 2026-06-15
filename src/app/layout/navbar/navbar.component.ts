import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatMenu, MatMenuTrigger, MatMenuItem } from '@angular/material/menu';
import { MatDivider } from '@angular/material/divider';
import { MatTooltip } from '@angular/material/tooltip';
import { AuthService } from '../../features/auth/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatIcon,
    MatIconButton,
    MatButton,
    MatMenu,
    MatMenuTrigger,
    MatMenuItem,
    MatDivider,
    MatTooltip,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  protected readonly authService = inject(AuthService);
  protected readonly mobileMenuOpen = signal(false);

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected logout(): void {
    this.authService.logout();
    this.closeMobileMenu();
  }

  protected readonly navLinks = [
    { label: 'Films', route: '/movies', icon: 'movie' },
    { label: 'Roulette', route: '/roulette', icon: 'casino' },
    { label: 'Matcher', route: '/matcher', icon: 'favorite' },
    { label: 'Vrienden', route: '/friends', icon: 'people' },
  ];
}
