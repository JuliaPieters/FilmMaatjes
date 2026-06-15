import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeNl from '@angular/common/locales/nl';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

registerLocaleData(localeNl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'nl' },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch(),
    ),
    provideAnimationsAsync(),
  ],
};
