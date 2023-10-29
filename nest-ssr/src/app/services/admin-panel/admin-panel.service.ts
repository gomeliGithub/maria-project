import { ComponentRef, Injectable, ViewContainerRef } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';

import { Observable, map } from 'rxjs';

import { ModalComponent } from '../../components/modal/modal.component';

import { AppService } from '../../app.service';
import { WebSocketService } from '../web-socket/web-socket.service';

import { environment } from '../../../environments/environment';

import { IClientOrdersInfoData, IFullCompressedImageData } from 'types/global';
import { IGetClientOrdersOptions, IModalRef } from 'types/options';
import { IClientOrder } from 'types/models';

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

    public getClientOrders (): Observable<IClientOrdersInfoData[]>
    public getClientOrders (options?: IGetClientOrdersOptions): Observable<IClientOrder[]>
    public getClientOrders (options?: IGetClientOrdersOptions): Observable<IClientOrdersInfoData[] | IClientOrder[]> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        let params = new HttpParams();

        if ( options ) {
            params = params.append('memberLogin', options.memberLogin ?? '');
            params = params.append('fromDate', options.fromDate ? options.fromDate.toDateString() : '');
            params = params.append('untilDate', options.untilDate ? options.untilDate.toDateString() : '');
            params = params.append('status', options.status ?? '');
            params = params.append('existsCount', options.existsCount ?? '');
            params = params.append('ordersLimit', options.ordersLimit ?? '');
        }

        return this.http.get<IClientOrdersInfoData[] | IClientOrder[]>('/api/admin-panel/getClientOrders', { params, headers, withCredentials: true }).pipe(map(data => {
            if ( options ) {
                data = (data as IClientOrdersInfoData[]).map(clientOrder => {
                    Object.keys(clientOrder).forEach(field => {
                        if ( field === 'createdDate') clientOrder[field] = new Date(clientOrder[field]);
                        if ( field === 'photographyType' ) switch ( clientOrder[field] ) {
                            case 'individual': { clientOrder[field] = this.appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.INDIVIDUAL'); break; }
                            case 'children': { clientOrder[field] = this.appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.CHILDREN'); break; }
                            case 'wedding': { clientOrder[field] = this.appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.WEDDING'); break; }
                            case 'family': { clientOrder[field] = this.appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.FAMILY'); break; }
                            case 'event': { clientOrder[field] = this.appService.getTranslations('IMAGEPHOTOGRAPHYTYPES.EVENT'); break; }
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
    }>, newClientId: number, modalRef: IModalRef): void {
        const reader = new FileReader();

        reader.onload = event => {
            const fileData: ArrayBuffer = (event.target as FileReader).result as ArrayBuffer;

            const slicedImageData: ArrayBuffer[] = [];

            for (let i = 0; i <= fileData.byteLength; i += 100000) {
                slicedImageData.push(fileData.slice(i, i + 100000));
            } 

            this.webSocketService.on(this._socketServerHost, uploadImageForm, slicedImageData, newClientId, modalRef);
        }

        reader.readAsArrayBuffer(formFile);
    }

    public switchImageControlResponses (responseText: string, modalViewRef: ViewContainerRef, modalComponentRef: ComponentRef<ModalComponent>): void {
        switch ( responseText ) {
            case 'SUCCESS': { window.location.reload(); break; }
            case 'MAXCOUNT': {
                this.appService.createWarningModal(modalViewRef, modalComponentRef, this.appService.getTranslations('ADMINPANEL.MAXCOUNTONHOMEPAGEMESSAGE')); 

                break;
            }
            case 'PENDING': { 
                this.appService.createWarningModal(modalViewRef, modalComponentRef, this.appService.getTranslations('UPLOADIMAGERESPONSES.PENDING')); 
                    
                break; 
            }
        }
    }
}