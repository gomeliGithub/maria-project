import { Component, Inject, OnInit, Optional, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { RouterModule } from '@angular/router';

import { RESPONSE } from '@nestjs/ng-universal/dist/tokens';
import { Response } from 'express';

import { TranslateModule } from '@ngx-translate/core';

import { AppService } from '../../app.service';

@Component({
    selector: 'app-not-found',
    standalone: true,
    imports: [ CommonModule, RouterModule, TranslateModule ],
    templateUrl: './not-found.component.html',
    styleUrls: ['./not-found.component.css']
})
export class NotFoundComponent implements OnInit {
    public isPlatformBrowser: boolean;
    public isPlatformServer: boolean;

    constructor (
        @Inject(PLATFORM_ID) private readonly platformId: string,

        @Optional() @Inject(RESPONSE) res: Response,

        private readonly _appService: AppService
    ) {
        this.isPlatformBrowser = isPlatformBrowser(this.platformId);
        this.isPlatformServer = isPlatformServer(this.platformId);
        
        if ( this.isPlatformServer ) {
            res.status(404);
        }
    }
    
    ngOnInit (): void {
        this._appService.getTranslations('PAGETITLES.NOTFOUND', true).subscribe(translation => this._appService.setTitle(translation));
    }
}