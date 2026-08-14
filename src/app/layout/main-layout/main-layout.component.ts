import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomTabBarComponent } from '../bottom-tab-bar/bottom-tab-bar.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, BottomTabBarComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {}
