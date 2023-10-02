import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { AppService } from '../../../app/app.service';
import { ClientService } from '../../services/client/client.service';

@Component({
    selector: 'app-gallery',
    templateUrl: './gallery.component.html',
    styleUrls: ['./gallery.component.css']
})
export class GalleryComponent implements OnInit {
    constructor (
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) {}

    public compressedImagesList: Observable<string[]>;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.GALLERY', true).subscribe(translation => this.appService.setTitle(translation));

            this._getCompressedImagesList();
        }
    }

    private _getCompressedImagesList (): Observable<string[]> {
        return this.clientService.getCompressedImagesList('gallery').pipe(imagesList => this.compressedImagesList = imagesList);
    }
}