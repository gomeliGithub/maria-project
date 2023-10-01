import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppService } from '../../../app/app.service';

@Component({
    selector: 'app-gallery',
    templateUrl: './gallery.component.html',
    styleUrls: ['./gallery.component.css']
})
export class GalleryComponent implements OnInit {
    constructor (
        private readonly http: HttpClient,
        private readonly appService: AppService
    ) {}

    public compressedImagesList: Observable<string[]>;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.GALLERY', true).subscribe(translation => this.appService.setTitle(translation));

            this._getCompressedImagesList();
        }
    }

    private _getCompressedImagesList (): Observable<string[]> {
        return this.http.get('/api/client/getCompressedImagesList/:gallery', { withCredentials: true }).pipe<string[]>(imagesList => this.compressedImagesList = imagesList as Observable<string[]>);
    }
}