import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import * as bcryptjs from 'bcryptjs';

import { AppService } from '../../app.service';

import { IClientBrowser } from 'types/global';
import { IClientSignData } from 'types/sign';

@Injectable({
    providedIn: 'root'
})
export class ClientService {
    constructor (
        private readonly http: HttpClient,
        private readonly appService: AppService,
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
        this._getBcrypt_hash_saltrounds().subscribe(async bcrypt_hash_saltrounds => {
            const { clientLogin, clientPassword, clientFullName, clientEmail } = signFormValue;

            const clientPasswordHash: string = await bcryptjs.hash(clientPassword, parseInt(bcrypt_hash_saltrounds, 10));

            const clientData: IClientSignData = {
                login: clientLogin,
                password: clientPasswordHash
            }

            if ( signOp === 'up') {
                clientData.fullName = clientFullName;
                clientData.email = clientEmail;

                this.http.post('/api/sign/up', { 
                    sign: { clientData }
                }, { withCredentials: true }).subscribe(() => this.appService.reloadComponent(false, '/signIn'));
            } else this.http.put('/api/sign/in', { 
                sign: { clientData }
            }).subscribe(() => this.appService.reloadComponent(false, ''));
        });
    }

    private _getBcrypt_hash_saltrounds (): Observable<string> {
        return this.http.get('/api/sign/getBcryptHashSaltrounds', { responseType: 'text', withCredentials: true });
    }
}