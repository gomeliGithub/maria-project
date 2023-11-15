import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, forkJoin } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import * as bcryptjs from 'bcryptjs';

import { AppService } from '../../app.service';

import { IClientBrowser, IGalleryCompressedImagesData } from 'types/global';
import { IClientSignData } from 'types/sign';
import { IClientCompressedImage, IDiscount, IImagePhotographyType } from 'types/models';

@Injectable({
    providedIn: 'root'
})
export class ClientService {
    constructor (
        private readonly translateService: TranslateService,
        private readonly http: HttpClient,
        private readonly appService: AppService
    ) { }

    public scrollPageBottomStatusChange: EventEmitter<boolean> = new EventEmitter();
    public navbarAnimationStateChange: EventEmitter<string> = new EventEmitter();
    public prevNavbarAnimationStateChange: EventEmitter<string> = new EventEmitter();
    public footerAnimationStateChange: EventEmitter<string> = new EventEmitter();

    public setScrollPageBottomStatus (value: boolean): void {
        this.scrollPageBottomStatusChange.emit(value);
    }

    public setNavbarAnimationState (value: string): void {
        this.navbarAnimationStateChange.emit(value);
    }

    public setPrevNavbarAnimationStateChange (value: string): void { 
        this.prevNavbarAnimationStateChange.emit(value);
    }

    public setFooterAnimationState (value: string): void {
        this.footerAnimationStateChange.emit(value);
    } 

    public getActiveClient (): Observable<IClientBrowser> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        return this.http.get('/api/sign/getActiveClient', { headers, withCredentials: true }
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
                    error: () => this.appService.createErrorModal()
                });
            } else this.http.put('/api/sign/in', { 
                sign: { clientData }
            }, { responseType: 'text', headers, withCredentials: true }).pipe(access_token => access_token).subscribe({
                next: access_token => {
                    localStorage.setItem('access_token', access_token);

                    this.appService.reloadComponent(false, '');
                },
                error: () => this.appService.createErrorModal()
            });
        });
    }

    private _getBcrypt_hash_saltrounds (): Observable<string> {
        return this.http.get('/api/sign/getBcryptHashSaltrounds', { responseType: 'text', withCredentials: true });
    }

    public checkCompressedBigImagesIsExists (photographyType: string): Observable<boolean> {
        return this.http.get<boolean>(`/api/client/checkCompressedBigImagesIsExists/:${ photographyType }`);
    }

    public getCompressedImagesList (imagesType: 'home', imageViewSize?: 'medium' | 'big'): Observable<IClientCompressedImage[]>
    public getCompressedImagesList (imagesType: string, imageViewSize?: 'medium' | 'big', imagesExistsCount?: number): Observable<IGalleryCompressedImagesData>
    public getCompressedImagesList (imagesType: 'home' | string, imageViewSize?: 'medium' | 'big', imagesExistsCount?: number): Observable<IGalleryCompressedImagesData | IClientCompressedImage[]> {
        return this.http.get(`/api/client/getCompressedImagesList/:${ imagesType }`, { params: {
            imageViewSize,
            imagesExistsCount
        }}).pipe<IGalleryCompressedImagesData | IClientCompressedImage[]>(imagesList => {
            if ( imagesType === 'home' ) return imagesList as Observable<IClientCompressedImage[]>;
            else return imagesList as Observable<IGalleryCompressedImagesData>;
        });
    }

    public getImagePhotographyTypesData (targetPage: 'home'): Observable<IImagePhotographyType[][]>
    public getImagePhotographyTypesData (targetPage: 'admin'): Observable<IImagePhotographyType[]>
    public getImagePhotographyTypesData (targetPage: 'home' | 'admin'): Observable<IImagePhotographyType[][] | IImagePhotographyType[]> {
        return this.http.get(`/api/client/getImagePhotographyTypesData/:${ targetPage }`).pipe<IImagePhotographyType[][] | IImagePhotographyType[]>(data => {
            if ( targetPage === 'home' ) return data as Observable<IImagePhotographyType[][]>;
            else if ( targetPage === 'admin' ) return data as Observable<IImagePhotographyType[]>;
        });
    }

    public getDiscountsData (): Observable<IDiscount[]> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        return this.http.get<IDiscount[]>('/api/client/getDiscountsData', { headers, withCredentials: true });
    }

    public sendOrder (photographyType: string, sendOrderFormValue: Partial<{
        orderType: string;
        clientPhoneNumber: string;
        comment: string;
    }>): void {
        const headers = this.appService.createRequestHeaders();

        const { orderType, clientPhoneNumber, comment } = sendOrderFormValue;

        this.http.post('/api/client/createOrder', {
            client: {
                imagePhotographyType: photographyType,
                orderType,
                clientPhoneNumber,
                comment
            }
        }, { headers: headers, withCredentials: true }).subscribe({
            next: () => this.appService.createSuccessModal(this.appService.getTranslations('GALLERYPAGE.CLIENTORDERSUCCESSMESSAGE')),
            error: () => this.appService.createErrorModal()
        });
    }

    public signOut (): Observable<void> {
        const headers = this.appService.createRequestHeaders();

        return this.http.put<void>('/api/sign/out', { }, { headers: headers, withCredentials: true });
    }

    public changeClientLocale (newLocale: string) {
        const headers = this.appService.createRequestHeaders();

        return forkJoin([ 
            this.http.post('/api/client/changeLocale', { sign: { newLocale } }, { responseType: 'text', headers, withCredentials: true }),
            this.translateService.use(newLocale)
        ]);
    }
}