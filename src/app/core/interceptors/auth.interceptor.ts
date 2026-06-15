import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../../features/auth/services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isOwnApi = req.url.startsWith(environment.apiUrl);
  if (!isOwnApi) {
    return next(req);
  }

  const token = inject(AuthService).token();
  if (!token) {
    return next(req);
  }

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
};
