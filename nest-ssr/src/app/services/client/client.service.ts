import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { IClientBrowser } from 'types/global';

@Injectable({
    providedIn: 'root'
})
export class ClientService {
    constructor (
        private readonly http: HttpClient
    ) { }

    public getActiveClient (): Observable<IClientBrowser> {
        return this.http.get('/api/sign/getActiveClient', { withCredentials: true }
        ).pipe(activeClient => activeClient as Observable<IClientBrowser>);
    }
}