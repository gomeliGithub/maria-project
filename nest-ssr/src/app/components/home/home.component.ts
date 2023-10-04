import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

import { ICompressedImage } from 'types/global';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
    constructor (
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    public compressedImagesList: Observable<ICompressedImage[][]>;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.HOME', true).subscribe(translation => this.appService.setTitle(translation));

            this._getCompressedImagesList();
        }
    }

    private _getCompressedImagesList (): Observable<ICompressedImage[][]> {
        return this.clientService.getCompressedImagesList('home').pipe(imagesList => this.compressedImagesList = imagesList);
    }
}