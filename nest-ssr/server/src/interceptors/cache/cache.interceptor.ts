import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Response } from 'express';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    intercept (context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            tap(() => {
                const response: Response = context.switchToHttp().getResponse();

                response.setHeader('Cache-Control', 'no-cache');
                response.removeHeader('ETag');
            })
        );
    }
}