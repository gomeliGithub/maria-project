import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';

import { Client_order_status, Client_order_type } from '@prisma/client';

import { Observable, map } from 'rxjs';

import { AdminPanelComponent } from '../../components/admin-panel/admin-panel.component';
import { AdminPanelOrdersControlComponent } from '../../components/admin-panel-orders-control/admin-panel-orders-control.component';
import { AdminPanelDiscountsControlComponent } from '../../components/admin-panel-discounts-control/admin-panel-discounts-control.component';
import { ClientOrdersComponent } from '../../components/admin-panel-orders-control/client-orders/client-orders.component';

import { AppService } from '../../app.service';
import { WebSocketService } from '../web-socket/web-socket.service';

import { environment } from '../../../environments/environment';

import { IClientOrdersData, IClientOrdersInfoData, IClientOrdersInfoDataArr, IFullCompressedImageData } from 'types/global';
import { IGetClientOrdersOptions, IGetFullCompressedImagesDataOptions } from 'types/options';
import { IClientOrderWithoutRelationFields, IDiscount } from 'types/models';

@Injectable({
    providedIn: 'root'
})
export class AdminPanelService {
    private readonly _socketServerHost: string = environment.webSocketServerURL;

    constructor (
        private readonly _http: HttpClient,

        private readonly _appService: AppService,
        private readonly _webSocketService: WebSocketService
    ) { }

    public spinnerHiddenStatusChange: EventEmitter<boolean> = new EventEmitter();

    public setSpinnerHiddenStatus (value: boolean): void {
        this.spinnerHiddenStatusChange.emit(value);
    }

    public getFullCompressedImagesData (getParams?: IGetFullCompressedImagesDataOptions): Observable<IFullCompressedImageData> {
        let params: HttpParams = new HttpParams();

        if ( getParams ) {
            params = params.append('imagesLimit', getParams.imagesLimit ? getParams.imagesLimit : '');
            params = params.append('imagesExistsCount', getParams.imagesExistsCount ? getParams.imagesExistsCount : '');
            params = params.append('dateFrom', getParams.dateFrom ? getParams.dateFrom.toUTCString() : '');
            params = params.append('dateUntil', getParams.dateUntil ? getParams.dateUntil.toUTCString() : '');
            params = params.append('photographyTypes', getParams.photographyTypes ? JSON.stringify(getParams.photographyTypes) : '');
            params = params.append('displayTypes', getParams.displayTypes ? JSON.stringify(getParams.displayTypes) : '');
        }

        return this._http.get<IFullCompressedImageData>('/api/admin-panel/getFullCompressedImagesList', { params, headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true });
    }

    public loadAndShowImageThumbnail (componentThis: AdminPanelComponent, imageButton: HTMLButtonElement): Observable<Blob> | null {
        const originalImageName: string | null = imageButton.getAttribute('originalImageName');

        if ( originalImageName !== null ) {
            componentThis.currentLoadedImageThumbnailOriginalName = originalImageName;
            componentThis.spinnerHidden = false;

            return this._http.get('/api/admin-panel/getImageThumbnail', { 
                params: {
                    originalName: originalImageName
                },  headers: this._appService.createAuthHeaders() ?? { }, responseType: 'blob', withCredentials: true
            });
        } else return null;
    }

    public getClientOrders (options: IGetClientOrdersOptions): Observable<IClientOrdersData> {
        const params: HttpParams = this._createGetClientOrdersParams(options);

        return this._http.get<IClientOrdersData>('/api/admin-panel/getClientOrders', { params, headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true }).pipe(map(data => {
            ( data as IClientOrdersData ).orders = ( data as IClientOrdersData ).orders.map(clientOrder => {
                Object.keys(clientOrder).forEach(field => {
                    if ( field === 'createdDate' ) clientOrder[field] = new Date(clientOrder[field]);
                    if ( field === 'photographyType' ) switch ( clientOrder[field] ) {
                        case 'individual': { clientOrder[field] = this._appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.INDIVIDUAL'); break; }
                        case 'children': { clientOrder[field] = this._appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.CHILDREN'); break; }
                        case 'wedding': { clientOrder[field] = this._appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.WEDDING'); break; }
                        case 'family': { clientOrder[field] = this._appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.FAMILY'); break; }
                    }
                    if ( field === 'type') {
                        switch ( clientOrder[field] ) {
                            case 'consultation': { clientOrder[field] = this._appService.getTranslations('CLIENTORDERTYPES.CONSULTATION') as Client_order_type; break; }
                            case 'full': { clientOrder[field] = this._appService.getTranslations('CLIENTORDERTYPES.FULL') as Client_order_type; break; }
                        }
                    }
                    if ( field === 'status' ) switch ( clientOrder[field] ) {
                        case 'new': { clientOrder[field] = this._appService.getTranslations('CLIENTORDERSTATUSES.NEW') as Client_order_status; break; }
                        case 'processed': { clientOrder[field] = this._appService.getTranslations('CLIENTORDERSTATUSES.PROCESSED') as Client_order_status; break; }
                    }
                });

                return clientOrder;
            });
                
            return data;
        }));
    }

    public getClientOrdersInfoData (options: IGetClientOrdersOptions): Observable<IClientOrdersInfoData> {
        const params: HttpParams = this._createGetClientOrdersParams(options);

        return this._http.get<IClientOrdersInfoData>('/api/admin-panel/getClientOrdersInfoData', { params, headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true });
    }

    private _createGetClientOrdersParams (options: IGetClientOrdersOptions): HttpParams {
        let params: HttpParams = new HttpParams();

        if ( options ) {
            params = params.append('memberLogin', options.memberLogin ?? '');
            params = params.append('fromDate', options.fromDate ? options.fromDate.toDateString() : '');
            params = params.append('untilDate', options.untilDate ? options.untilDate.toDateString() : '');
            params = params.append('status', options.status ?? '');
            params = params.append('existsCount', options.existsCount ?? '');
            params = params.append('ordersLimit', options.ordersLimit ?? '');
        }

        return params;
    }
    
    public changeClientOrderStatus (clientOrderId: number, clientLogin: string): Observable<void> { 
        return this._http.put<void>('/api/admin-panel/changeClientOrderStatus', { adminPanel: {
            clientOrderId,
            clientLogin
        }} , { headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true });
    }

    public uploadImage (formFile: File, uploadImageForm: FormGroup<{
        imagePhotographyType: FormControl<string | null>;
        imageDisplayType: FormControl<string | null>;
        image: FormControl<FileList | null>;
        imageDescription: FormControl<string | null>;
    }>, newClientId: number): void {
        const reader = new FileReader();

        reader.onload = event => {
            const fileData: ArrayBuffer = ( event.target as FileReader ).result as ArrayBuffer;

            const slicedImageData: ArrayBuffer[] = [];

            for ( let i = 0; i <= fileData.byteLength; i += 100000 ) {
                slicedImageData.push(fileData.slice(i, i + 100000));
            } 

            this._webSocketService.on(this._socketServerHost, uploadImageForm, slicedImageData, newClientId);
        }

        reader.readAsArrayBuffer(formFile);
    }

    public switchImageControlResponses (responseText: string, operationName: string): void {
        switch ( responseText ) {
            case 'SUCCESS': {
                this.setSpinnerHiddenStatus(true);

                if ( operationName !== 'delete' ) this._appService.createSuccessModal();
                
                break; 
            }

            case 'MAXCOUNT': {
                this._appService.createWarningModal(this._appService.getTranslations('ADMINPANEL.MAXCOUNTONHOMEPAGEMESSAGE')); 

                break;
            }

            case 'PENDING': { 
                this._appService.createWarningModal(this._appService.getTranslations('UPLOADIMAGERESPONSES.PENDING')); 
                    
                break; 
            }

            case 'WRONGDISPLAYTYPE': {
                this._appService.createWarningModal(this._appService.getTranslations('UPLOADIMAGERESPONSES.WRONGDISPLAYTYPE')); 

                break;
            }
        }
    }

    public getNextClientOrdersInfoData (componentThis: AdminPanelOrdersControlComponent | ClientOrdersComponent, existsCountZero = false): void {
        let existsCount: number | null = null;

        if ( !componentThis.additionalOrdersInfoDataExists ) existsCount = 0;
        else existsCount = componentThis.getClientOrdersButtonViewRefs.length;

        if ( existsCountZero ) componentThis.additionalOrdersInfoDataExists = false;

        this.getClientOrdersInfoData({
            status: componentThis.currentSelectedOrdersStatusType,
            ordersLimit: 2,
            existsCount: existsCount
        }).subscribe({
            next: clientOrdersInfoData => {
                if ( !componentThis.additionalOrdersInfoDataExists
                    && (existsCountZero || componentThis.prevCurrentSelectedOrdersStatusType !== componentThis.currentSelectedOrdersStatusType) 
                ) componentThis.clientOrdersInfoData = clientOrdersInfoData.infoData && clientOrdersInfoData.infoData.length !== 0 ? clientOrdersInfoData.infoData : null;
                else ( componentThis.clientOrdersInfoData as IClientOrdersInfoDataArr[] ).push(...clientOrdersInfoData.infoData);

                componentThis.additionalOrdersInfoDataExists = clientOrdersInfoData.additionalOrdersInfoDataExists;
            },
            error: () => this._appService.createErrorModal()
        });
    }

    public getNextClientOrdersData (componentThis: AdminPanelOrdersControlComponent | ClientOrdersComponent, event?: MouseEvent, existsCountZero = false) {
        const target: HTMLDivElement | null = event ? event.target as HTMLDivElement : null;

        let clientLogin: string | null = null;

        if ( existsCountZero && target !== null ) {
            clientLogin = target.getAttribute('client-login');

            componentThis.currentSelectedClientLogin = clientLogin !== 'guest' ? clientLogin as string : this._appService.getTranslations('ADMINPANEL.GUESTLOGINTEXT');
        }

        if ( !componentThis.currentSelectedClientLogin ) componentThis.currentSelectedClientLogin = this._appService.getTranslations('ADMINPANEL.GUESTLOGINTEXT');

        let memberLogin: string | null = null;
        let existsCount: number | null = null;

        if ( componentThis.currentSelectedClientLogin ) {
            memberLogin = existsCountZero ? clientLogin : componentThis.currentSelectedClientLogin === 'Гость' ? 'guest' : componentThis.currentSelectedClientLogin
        } else memberLogin = 'guest';

        if ( !componentThis.additionalOrdersExists ) existsCount = 0;
        else existsCount = componentThis.clientOrderViewRefs.length;

        if ( existsCountZero ) componentThis.additionalOrdersExists = false;

        this.getClientOrders({
            status: componentThis.currentSelectedOrdersStatusType,
            memberLogin: memberLogin as string,
            ordersLimit: 2,
            existsCount
        }).subscribe({
            next: clientOrdersData => {
                if ( !componentThis.additionalOrdersExists
                    && (existsCountZero || componentThis.prevCurrentSelectedOrdersStatusType !== componentThis.currentSelectedOrdersStatusType) 
                ) componentThis.clientOrders = clientOrdersData.orders && clientOrdersData.orders.length !== 0 ? clientOrdersData.orders : null;
                else ( componentThis.clientOrders as IClientOrderWithoutRelationFields[] ).push(...clientOrdersData.orders);

                componentThis.additionalOrdersExists = clientOrdersData.additionalOrdersExists;
            },
            error: () => this._appService.createErrorModal()
        });
    }

    public getDiscountsData (): Observable<IDiscount[]> {
        return this._http.get<IDiscount[]>('/api/admin-panel/getDiscountsData', { headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true });
    }

    public createDiscount (componentThis: AdminPanelDiscountsControlComponent, discountContent: string, fromDate: Date, toDate: Date): void {
        componentThis.spinnerHidden = false;

        this._http.post('/api/admin-panel/createDiscount', { 
            adminPanel: {
                discountContent,
                fromDate,
                toDate
            }
        }, { responseType: 'text', headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true }).subscribe({
            next: responseText => {
                if ( responseText === 'MAXCOUNT' ) {
                    componentThis.spinnerHidden = true;

                    this._appService.createWarningModal(this._appService.getTranslations('ADMINPANEL.CHANGEDISCOUNTMAXCOUNTMESSAGE'));
                } else if ( responseText === 'SUCCESS' ) window.location.reload();
            },
            error: () => {
                componentThis.spinnerHidden = true;

                this._appService.createErrorModal()
            }
        });
    }

    public changeDiscountData (componentThis: AdminPanelDiscountsControlComponent, newDiscountContent: string, newFromDate: Date, newToDate: Date, discountId: number): void {
        componentThis.spinnerHidden = false;

        this._http.put<void>('/api/admin-panel/changeDiscountData', {
            adminPanel: {
                newDiscountContent,
                newFromDate,
                newToDate,
                discountId
            }
        }, { headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true }).subscribe({
            next: () => window.location.reload(),
            error: () => {
                componentThis.spinnerHidden = true;

                this._appService.createErrorModal()
            }
        });
    }

    public deleteDiscount (componentThis: AdminPanelDiscountsControlComponent, discountId: number): void {
        componentThis.spinnerHidden = false;

        this._http.delete<void>('/api/admin-panel/deleteDiscount', { 
            params: {
                discountId
            }, headers: this._appService.createAuthHeaders() ?? { }, withCredentials: true
        }).subscribe({
            next: () => window.location.reload(),
            error: () => {
                componentThis.spinnerHidden = true;

                this._appService.createErrorModal()
            }
        });
    }
}