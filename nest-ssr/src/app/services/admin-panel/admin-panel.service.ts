import { ComponentRef, Injectable, ViewContainerRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';

import { Observable, map } from 'rxjs';

import { ModalComponent } from '../../components/modal/modal.component';

import { AppService } from '../../app.service';
import { WebSocketService } from '../web-socket/web-socket.service';

import { environment } from '../../../environments/environment';

import { IFullCompressedImageData } from 'types/global';
import { IModalRef } from 'types/options';

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

    public uploadImage (formFile: File, uploadImageForm: FormGroup<{
        imageEventType: FormControl<string>;
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