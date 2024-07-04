import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(map((data) => this._convertBigIntToString(data)));
    }

    private _convertBigIntToString (data: any): any {
        if ( Array.isArray(data) ) {
            return data.map((item) => this._convertBigIntToString(item));
        } else if ( data !== null && typeof data === 'object' ) {
            Object.keys(data).forEach((key) => {
                if ( typeof data[key] === 'bigint' ) {
                    data[key] = data[key].toString();
                } else if ( typeof data[key] === 'object' ) {
                    this._convertBigIntToString(data[key]);
                }
            });
        }

        return data;
    }
}