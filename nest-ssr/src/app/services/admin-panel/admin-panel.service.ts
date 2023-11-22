import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';

import { Observable, map } from 'rxjs';

import { AdminPanelOrdersControlComponent } from '../../components/admin-panel-orders-control/admin-panel-orders-control.component';
import { AdminPanelDiscountsControlComponent } from '../../components/admin-panel-discounts-control/admin-panel-discounts-control.component';

import { AppService } from '../../app.service';
import { WebSocketService } from '../web-socket/web-socket.service';

import { environment } from '../../../environments/environment';

import { IClientOrdersData, IClientOrdersInfoData, IFullCompressedImageData } from 'types/global';
import { IGetClientOrdersOptions } from 'types/options';
import { ClientOrdersComponent } from 'src/app/components/admin-panel-orders-control/client-orders/client-orders.component';
import { IDiscount } from 'types/models';

@Injectable({
    providedIn: 'root'
})
export class AdminPanelService {
    constructor (
        private readonly http: HttpClient,

        private readonly appService: AppService,
        private readonly webSocketService: WebSocketService
    ) { }

    private readonly _socketServerHost: string = environment.webSocketServerURL;

    public getFullCompressedImagesData (): Observable<IFullCompressedImageData> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        return this.http.get('/api/admin-panel/getFullCompressedImagesList', { headers, withCredentials: true }).pipe(map(imagesList => imagesList)) as Observable<IFullCompressedImageData>;
    }

    public getClientOrders (options: {
        getInfoData: string,
        fromDate?: Date,
        untilDate?: Date,
        status?: string,
        ordersLimit?: number,
        existsCount?: number
    }): Observable<IClientOrdersInfoData>
    public getClientOrders (options?: {
        getInfoData?: string,
        memberLogin: string,
        fromDate?: Date,
        untilDate?: Date,
        status?: string,
        ordersLimit?: number,
        existsCount?: number
    }): Observable<IClientOrdersData>
    public getClientOrders (options?: IGetClientOrdersOptions): Observable<IClientOrdersInfoData | IClientOrdersData> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        let params = new HttpParams();

        if ( options ) {
            params = params.append('getInfoData', options.getInfoData ?? '');
            params = params.append('memberLogin', options.memberLogin ?? '');
            params = params.append('fromDate', options.fromDate ? options.fromDate.toDateString() : '');
            params = params.append('untilDate', options.untilDate ? options.untilDate.toDateString() : '');
            params = params.append('status', options.status ?? '');
            params = params.append('existsCount', options.existsCount ?? '');
            params = params.append('ordersLimit', options.ordersLimit ?? '');
        }

        return this.http.get<IClientOrdersInfoData | IClientOrdersData>('/api/admin-panel/getClientOrders', { params, headers, withCredentials: true }).pipe(map(data => {
            if ( !options.getInfoData || options.getInfoData === 'false' ) {
                (data as IClientOrdersData).orders = (data as IClientOrdersData).orders.map(clientOrder => {
                    Object.keys(clientOrder).forEach(field => {
                        if ( field === 'createdDate') clientOrder[field] = new Date(clientOrder[field]);
                        if ( field === 'photographyType' ) switch ( clientOrder[field] ) {
                            case 'individual': { clientOrder[field] = this.appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.INDIVIDUAL'); break; }
                            case 'children': { clientOrder[field] = this.appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.CHILDREN'); break; }
                            case 'wedding': { clientOrder[field] = this.appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.WEDDING'); break; }
                            case 'family': { clientOrder[field] = this.appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.FAMILY'); break; }
                        }
                        if ( field === 'type') {
                            switch ( clientOrder[field] ) {
                                case 'consultation': { clientOrder[field] = this.appService.getTranslations('CLIENTORDERTYPES.CONSULTATION'); break; }
                                case 'full': { clientOrder[field] = this.appService.getTranslations('CLIENTORDERTYPES.FULL'); break; }
                            }
                        }
                        if ( field === 'status' ) switch ( clientOrder[field] ) {
                            case 'new': { clientOrder[field] = this.appService.getTranslations('CLIENTORDERSTATUSES.NEW'); break; }
                            case 'processed': { clientOrder[field] = this.appService.getTranslations('CLIENTORDERSTATUSES.PROCESSED'); break; }
                        }
                    });

                    return clientOrder;
                });
            }
            
            return data;
        }));
    }

    public changeClientOrderStatus (clientOrderId: number, clientLogin: string): Observable<void> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();
        
        return this.http.put<void>('/api/admin-panel/changeClientOrderStatus', { adminPanel: {
            clientOrderId,
            clientLogin
        }} , { headers, withCredentials: true });
    }

    public uploadImage (formFile: File, uploadImageForm: FormGroup<{
        imagePhotographyType: FormControl<string>;
        imageViewSizeType: FormControl<string>;
        image: FormControl<FileList>;
        imageDescription: FormControl<string>;
    }>, newClientId: number): void {
        const reader = new FileReader();

        reader.onload = event => {
            const fileData: ArrayBuffer = (event.target as FileReader).result as ArrayBuffer;

            const slicedImageData: ArrayBuffer[] = [];

            for (let i = 0; i <= fileData.byteLength; i += 100000) {
                slicedImageData.push(fileData.slice(i, i + 100000));
            } 

            this.webSocketService.on(this._socketServerHost, uploadImageForm, slicedImageData, newClientId);
        }

        reader.readAsArrayBuffer(formFile);
    }

    public switchImageControlResponses (responseText: string): void {
        switch ( responseText ) {
            case 'SUCCESS': { window.location.reload(); break; }
            case 'MAXCOUNT': {
                this.appService.createWarningModal(this.appService.getTranslations('ADMINPANEL.MAXCOUNTONHOMEPAGEMESSAGE')); 

                break;
            }
            case 'PENDING': { 
                this.appService.createWarningModal(this.appService.getTranslations('UPLOADIMAGERESPONSES.PENDING')); 
                    
                break; 
            }
        }
    }

    public getClientOrdersInfoData (componentThis: AdminPanelOrdersControlComponent | ClientOrdersComponent, existsCountZero = false): void {
        let existsCount: number = null;

        if ( !componentThis.additionalOrdersInfoDataExists ) existsCount = 0;
        else existsCount = componentThis.getClientOrdersButtonViewRefs.length;

        if ( existsCountZero ) componentThis.additionalOrdersInfoDataExists = false;

        this.getClientOrders({
            getInfoData: 'true',
            status: componentThis.currentSelectedOrdersStatusType,
            ordersLimit: 2,
            existsCount: existsCount
        }).subscribe({
            next: clientOrdersInfoData => {
                if ( !componentThis.additionalOrdersInfoDataExists
                    && (existsCountZero || componentThis.prevCurrentSelectedOrdersStatusType !== componentThis.currentSelectedOrdersStatusType) 
                ) componentThis.clientOrdersInfoData = clientOrdersInfoData.infoData && clientOrdersInfoData.infoData.length !== 0 ? clientOrdersInfoData.infoData : null;
                else componentThis.clientOrdersInfoData.push(...clientOrdersInfoData.infoData);

                componentThis.additionalOrdersInfoDataExists = clientOrdersInfoData.additionalOrdersInfoDataExists;
            },
            error: () => this.appService.createErrorModal()
        });
    }

    public getClientOrdersData (componentThis: AdminPanelOrdersControlComponent | ClientOrdersComponent, event?: MouseEvent, existsCountZero = false) {
        const target: HTMLDivElement = event ? event.target as HTMLDivElement : null;

        let clientLogin: string = null;

        if ( existsCountZero ) {
            clientLogin = target.getAttribute('client-login');

            componentThis.currentSelectedClientLogin = clientLogin !== 'guest' ? clientLogin : this.appService.getTranslations('ADMINPANEL.GUESTLOGINTEXT');
        }

        if ( !componentThis.currentSelectedClientLogin ) componentThis.currentSelectedClientLogin = this.appService.getTranslations('ADMINPANEL.GUESTLOGINTEXT');

        let memberLogin: string = null;
        let existsCount: number = null;

        if ( componentThis.currentSelectedClientLogin ) {
            memberLogin = existsCountZero ? clientLogin : componentThis.currentSelectedClientLogin === 'Гость' ? 'guest' : componentThis.currentSelectedClientLogin
        } else memberLogin = 'guest';

        if ( !componentThis.additionalOrdersExists ) existsCount = 0;
        else existsCount = componentThis.clientOrderViewRefs.length;

        if ( existsCountZero ) componentThis.additionalOrdersExists = false;

        this.getClientOrders({
            getInfoData: 'false',
            status: componentThis.currentSelectedOrdersStatusType,
            memberLogin,
            ordersLimit: 2,
            existsCount
        }).subscribe({
            next: clientOrdersData => {
                if ( !componentThis.additionalOrdersExists
                    && (existsCountZero || componentThis.prevCurrentSelectedOrdersStatusType !== componentThis.currentSelectedOrdersStatusType) 
                ) componentThis.clientOrders = clientOrdersData.orders && clientOrdersData.orders.length !== 0 ? clientOrdersData.orders : null;
                else componentThis.clientOrders.push(...clientOrdersData.orders);

                componentThis.additionalOrdersExists = clientOrdersData.additionalOrdersExists;
            },
            error: () => this.appService.createErrorModal()
        });
    }

    public getDiscountsData (): Observable<IDiscount[]> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        return this.http.get<IDiscount[]>('/api/admin-panel/getDiscountsData', { headers, withCredentials: true });
    }

    public createDiscount (componentThis: AdminPanelDiscountsControlComponent, discountContent: string, fromDate: Date, toDate: Date): void {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        componentThis.spinnerHidden = false;

        this.http.post('/api/admin-panel/createDiscount', { 
            adminPanel: {
                discountContent,
                fromDate,
                toDate
            }
        }, { responseType: 'text', headers, withCredentials: true }).subscribe({
            next: responseText => {
                if ( responseText === 'MAXCOUNT' ) {
                    componentThis.spinnerHidden = true;

                    this.appService.createWarningModal(this.appService.getTranslations('ADMINPANEL.CHANGEDISCOUNTMAXCOUNTMESSAGE'));
                } else if ( responseText === 'SUCCESS' ) window.location.reload();
            },
            error: () => {
                componentThis.spinnerHidden = true;

                this.appService.createErrorModal()
            }
        });
    }

    public changeDiscountData (componentThis: AdminPanelDiscountsControlComponent, newDiscountContent: string, newFromDate: Date, newToDate: Date, discountId: number): void {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        componentThis.spinnerHidden = false;

        this.http.put<void>('/api/admin-panel/changeDiscountData', {
            adminPanel: {
                newDiscountContent,
                newFromDate,
                newToDate,
                discountId
            }
        }, { headers, withCredentials: true }).subscribe({
            next: () => window.location.reload(),
            error: () => {
                componentThis.spinnerHidden = true;

                this.appService.createErrorModal()
            }
        });
    }

    public deleteDiscount (componentThis: AdminPanelDiscountsControlComponent, discountId: number): void {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        componentThis.spinnerHidden = false;

        this.http.delete<void>('/api/admin-panel/deleteDiscount', { 
            params: {
                discountId
            }, headers, withCredentials: true
        }).subscribe({
            next: () => window.location.reload(),
            error: () => {
                componentThis.spinnerHidden = true;

                this.appService.createErrorModal()
            }
        });
    }
}