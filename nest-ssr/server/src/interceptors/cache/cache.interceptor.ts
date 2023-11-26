import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    intercept (context: ExecutionContext, next: CallHandler): Observable<any> {
        const response: Response = context.switchToHttp().getResponse();

        response.setHeader('Cache-Control', 'no-cache');
        response.removeHeader('ETag');

        return next.handle();
    }
}