import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { AppService } from '../../app.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
    constructor (
        private readonly http: HttpClient,
        
        private readonly appService: AppService
    ) { }

    public compressedImagesList: Observable<string[]>;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.HOME', true).subscribe(translation => this.appService.setTitle(translation));

            this._getCompressedImagesList();
        }
    }

    private _getCompressedImagesList (): Observable<string[]> {
        return this.http.get('/api/client/getCompressedImagesList/:home', { withCredentials: true }).pipe<string[]>(imagesList => this.compressedImagesList = imagesList as Observable<string[]>);
    }
}