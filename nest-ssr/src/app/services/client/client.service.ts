import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import * as bcryptjs from 'bcryptjs';

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

    public sign (signFormValue: Partial<{
        clientLogin: string;
        clientPassword: string;
        clientFullName: string;
        clientEmail?: string;
    }>, signOp: 'up' | 'in'): void {
        if ( signOp === 'up') this._getBcrypt_hash_saltrounds().subscribe(async bcrypt_hash_saltrounds => {
            const { clientLogin, clientPassword, clientFullName, clientEmail } = signFormValue;

            const clientPasswordHash: string = await bcryptjs.hash(clientPassword, parseInt(bcrypt_hash_saltrounds, 10));

            this.http.post('/api/sign/up', { 
                sign: { 
                    clientData: {
                        login: clientLogin,
                        password: clientPasswordHash,
                        fullName: clientFullName,
                        email: clientEmail
                    }
                }
            }, { withCredentials: true }).subscribe();
        });
    }

    private _getBcrypt_hash_saltrounds (): Observable<string> {
        return this.http.get('/api/sign/getBcryptHashSaltrounds', { responseType: 'text', withCredentials: true });
    }
}