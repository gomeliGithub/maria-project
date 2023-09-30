import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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

    public uploadImage (formFile: File, uploadImageInput: HTMLInputElement, newClientId: number, modalRef: IModalRef): void {
        const reader = new FileReader();

        reader.onload = event => {
            const fileData: ArrayBuffer = (event.target as FileReader).result as ArrayBuffer;

            const slicedImageData: ArrayBuffer[] = [];

            for (let i = 0; i <= fileData.byteLength; i += 100000) {
                slicedImageData.push(fileData.slice(i, i + 100000));
            } 
            
            this.webSocketService.on(this._socketServerHost, uploadImageInput, slicedImageData, newClientId, modalRef);
        }

        reader.readAsArrayBuffer(formFile);
    }
}