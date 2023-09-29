import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { AppService } from '../../app.service';

import { ICompressedImage, IFullCompressedImageData } from 'types/global';

@Injectable({
    providedIn: 'root'
})
export class AdminPanelService {
    constructor (
        private readonly http: HttpClient,

        private readonly appService: AppService
    ) { }

    public getFullCompressedImagesData (): Observable<IFullCompressedImageData> {
        const headers: HttpHeaders = this.appService.createRequestHeaders();

        return this.http.get('/api/admin-panel/getFullCompressedImagesList', { headers, withCredentials: true }).pipe(map(imagesList => imagesList)) as Observable<ICompressedImage[]>;
    }

    public uploadImage (imageFile: File): void {
        const reader = new FileReader();

        reader.onload = event => {
            const headers: HttpHeaders = this.appService.createRequestHeaders();
            const imageData: ArrayBuffer = (event.target as FileReader).result as ArrayBuffer;

            this.http.post(`/api/client/uploadImage/:${imageFile.name}`, imageData, { headers, withCredentials: true }).subscribe(result => result);
        }

        reader.readAsArrayBuffer(imageFile);
    }
}