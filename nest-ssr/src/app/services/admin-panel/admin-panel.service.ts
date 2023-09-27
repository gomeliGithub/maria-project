import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ICompressedImage } from 'types/global';

@Injectable({
    providedIn: 'root'
})
export class AdminPanelService {
    constructor (
        private readonly http: HttpClient
    ) { }

    public getFullCompressedImagesList (): Observable<ICompressedImage[]> {
        return this.http.get('/api/admin-panel/getFullCompressedImagesList').pipe(map(imagesList => imagesList)) as Observable<ICompressedImage[]>;
    }

    public uploadImage (imageFile: File): void {
        const reader = new FileReader();

        reader.onload = event => {
            const imageData: ArrayBuffer = (event.target as FileReader).result as ArrayBuffer;

            this.http.post(`/api/client/uploadImage/:${imageFile.name}`, imageData).subscribe(result => result);
        }

        reader.readAsArrayBuffer(imageFile);
    }
}