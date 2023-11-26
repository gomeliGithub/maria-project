import { Inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpResponse
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { isPlatformServer } from '@angular/common';

@Injectable()
export class BrowserStateInterceptor implements HttpInterceptor {
    constructor (
        @Inject(PLATFORM_ID) private platformId: any,
        private readonly transferState: TransferState
    ) { }

    intercept (req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if ( req.method === 'POST' || req.method === 'GET' ) {
            let postKey: string = "";
            let storedResponse: string = null;

            if ( req.url !== null ) {
                postKey = req.url as string;
            }

            switch ( req.url ) {
                /*case '/assets/locale/ru.json': {
                    const key = makeStateKey<string>(postKey);

                    storedResponse = this.transferState.get<string>(key, null);

                    break;
                }*/
                case '/api/client/getDiscountsData': {
                    const key = makeStateKey<string>(postKey);

                    storedResponse = this.transferState.get<string>(key, null);

                    break;
                }
            }
            
            if ( storedResponse ) {
                // const response = new HttpResponse({ body: storedResponse, status: 200 });

                // return of(response);

                console.log(storedResponse);
            }
        }

        return next.handle(req);
    }
}