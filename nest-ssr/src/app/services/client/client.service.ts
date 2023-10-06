import { ComponentRef, Injectable, ViewContainerRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs';

import * as bcryptjs from 'bcryptjs';

import { ModalComponent } from '../../components/modal/modal.component';

import { AppService } from '../../app.service';

import { IClientBrowser, ICompressedImage } from 'types/global';
import { IClientAccessData, IClientSignData } from 'types/sign';

@Injectable({
    providedIn: 'root'
})
export class ClientService {
    constructor (
        private readonly http: HttpClient,
        private readonly appService: AppService,
    ) { }

    public getActiveClient (): Observable<IClientBrowser> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        return this.http.get('/api/sign/getActiveClient', { headers, withCredentials: true }
        ).pipe(activeClient => activeClient as Observable<IClientBrowser>);
    }

    public sign (modalViewRef: ViewContainerRef, modalComponentRef: ComponentRef<ModalComponent>, signFormValue: Partial<{
        clientLogin: string;
        clientPassword: string;
        clientFullName: string;
        clientEmail?: string;
    }>, signOp: 'up' | 'in'): void {
        this._getBcrypt_hash_saltrounds().subscribe(async bcrypt_hash_saltrounds => {
            const { clientLogin, clientPassword, clientFullName, clientEmail } = signFormValue;

            // const clientPasswordHash: string = await bcryptjs.hash(clientPassword, parseInt(bcrypt_hash_saltrounds, 10));

            const clientData: IClientSignData = {
                login: clientLogin,
                password: signOp === 'up' ? await bcryptjs.hash(clientPassword, parseInt(bcrypt_hash_saltrounds, 10)) : clientPassword
            }

            const headers: HttpHeaders = this.appService.createRequestHeaders();

            if ( signOp === 'up') {
                clientData.fullName = clientFullName;
                clientData.email = clientEmail;

                this.http.post('/api/sign/up', { 
                    sign: { clientData }
                }, { headers, withCredentials: true }).subscribe({
                    next: () => this.appService.reloadComponent(false, '/signIn'),
                    error: () => this.appService.createErrorModal(modalViewRef, modalComponentRef)
                });
            } else this.http.put('/api/sign/in', { 
                sign: { clientData }
            }, { headers, withCredentials: true }).pipe(accessData => accessData as Observable<IClientAccessData>).subscribe({
                next: accessData => {
                    localStorage.setItem('access_token', accessData.access_token);

                    this.appService.reloadComponent(false, '');
                },
                error: () => this.appService.createErrorModal(modalViewRef, modalComponentRef)
            });
        });
    }

    private _getBcrypt_hash_saltrounds (): Observable<string> {
        return this.http.get('/api/sign/getBcryptHashSaltrounds', { responseType: 'text', withCredentials: true });
    }

    public getCompressedImagesList (imagesType: 'home'): Observable<ICompressedImage[][]>
    public getCompressedImagesList (imagesType: 'gallery'): Observable<string[]>
    public getCompressedImagesList (imagesType: 'home' | 'gallery'): Observable<string[] | ICompressedImage[][]> {
        return this.http.get(`/api/client/getCompressedImagesList/:${ imagesType }`).pipe<string[] | ICompressedImage[][]>(imagesList => {
            if ( imagesType === 'home' ) return imagesList as Observable<ICompressedImage[][]>;
            else if ( imagesType === 'gallery' ) return imagesList as Observable<string[]>;
        });
    }
}