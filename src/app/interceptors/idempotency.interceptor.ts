import { HttpInterceptorFn } from '@angular/common/http';

export const idempotencyInterceptor: HttpInterceptorFn = (req, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const idempotencyKey = crypto.randomUUID();
    const cloned = req.clone({
      setHeaders: {
        'X-Idempotency-Key': idempotencyKey
      }
    });
    return next(cloned);
  }
  return next(req);
};
