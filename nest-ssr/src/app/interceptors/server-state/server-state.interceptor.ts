import { Injectable, makeStateKey, TransferState } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpResponse
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable()
export class ServerStateInterceptor implements HttpInterceptor {
    constructor (
        private readonly transferState: TransferState
    ) {}

    intercept (req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if ( req.url === '/api/client/getDiscountsData' ) {
            this.transferState.set(makeStateKey(req.url), req.body);
        }

        return next.handle(req).pipe(
            tap(event => {
                if ( req.method === 'POST' || req.method === 'GET' ) {
                    if ( ( event instanceof HttpResponse && ( event.status === 200 || event.status === 202 ) ) ) {
                        let key: any = "";
                        
                        if ( req.url !== null ) {
                            key = req.url;
                        }

                        switch ( req.url ) {
                            // case '/assets/locale/ru.json': { this.transferState.set(makeStateKey(key), event.body); break; }
                             case '/api/client/getDiscountsData': { this.transferState.set(makeStateKey(key), event.body); break; }
                        }
                    }
                }
            })
        );
    }
}