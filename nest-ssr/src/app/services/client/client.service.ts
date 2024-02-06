import { ElementRef, EventEmitter, Injectable, QueryList } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';

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

    public galleryImageContainerViewRefsChange: EventEmitter<QueryList<ElementRef<HTMLDivElement>>> = new EventEmitter();

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

    public setGalleryImageContainerViewRefs (value: QueryList<ElementRef<HTMLDivElement>>): void {
        this.galleryImageContainerViewRefsChange.emit(value);
    }

    public getActiveClient (): Observable<IClientBrowser> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        return this.http.get<IClientBrowser>('/api/sign/getActiveClient', { headers, withCredentials: true });
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
                    error: () => this.appService.createErrorModal(this.appService.getTranslations('CLIENTPAGE.SIGNERRORTEXT'))
                });
            } else this.http.put('/api/sign/in', { 
                sign: { clientData }
            }, { responseType: 'text', headers, withCredentials: true }).subscribe({
                next: access_token => {
                    localStorage.setItem('access_token', access_token);

                    this.appService.reloadComponent(false, '');
                },
                error: () => this.appService.createErrorModal(this.appService.getTranslations('CLIENTPAGE.SIGNERRORTEXT'))
            });
        });
    }

    private _getBcrypt_hash_saltrounds (): Observable<string> {
        return this.http.get('/api/sign/getBcryptHashSaltrounds', { responseType: 'text', withCredentials: true });
    }

    public getCompressedImagesData (imagesType: 'home', imageViewSize: 'horizontal' | 'vertical'): Observable<IClientCompressedImage[]>
    public getCompressedImagesData (imagesType: string, imageViewSize: 'horizontal' | 'vertical', imagesExistsCount?: number): Observable<IGalleryCompressedImagesData>
    public getCompressedImagesData (imagesType: 'home' | string, imageViewSize: 'horizontal' | 'vertical', imagesExistsCount?: number): Observable<IGalleryCompressedImagesData | IClientCompressedImage[]> {
        return this.http.get<IGalleryCompressedImagesData | IClientCompressedImage[]>(`/api/client/getCompressedImagesData/:${ imagesType }`, { params: {
            imageViewSize,
            imagesExistsCount
        }});
    }

    public getImagePhotographyTypesData (targetPage: 'home'): Observable<IImagePhotographyType[][]>
    public getImagePhotographyTypesData (targetPage: 'admin'): Observable<IImagePhotographyType[]>
    public getImagePhotographyTypesData (targetPage: 'home' | 'admin'): Observable<IImagePhotographyType[][] | IImagePhotographyType[]> {
        return this.http.get<IImagePhotographyType[][] | IImagePhotographyType[]>(`/api/client/getImagePhotographyTypesData/:${ targetPage }`);
    }

    public getDiscountsData (): Observable<IDiscount[]> {
        return this.http.get<IDiscount[]>('/api/client/getDiscountsData');
    }

    public downloadOriginalImage (compressedImageName: string): Observable<HttpResponse<Blob>> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        return this.http.get(`/api/client/downloadOriginalImage/:${ compressedImageName }`, { responseType: 'blob', observe: 'response', headers, withCredentials: true });
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