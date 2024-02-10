import { Component, Inject, OnInit, Optional } from '@angular/core';
import { RESPONSE } from '@nestjs/ng-universal/dist/tokens';
import { Response } from 'express';

import { AppService } from '../../app.service';

@Component({
    selector: 'app-not-found',
    templateUrl: './not-found.component.html',
    styleUrls: ['./not-found.component.css']
})
export class NotFoundComponent implements OnInit {
    constructor (
        @Optional() @Inject(RESPONSE) res: Response,

        private readonly appService: AppService
    ) {
        if ( this.appService.checkIsPlatformServer() ) {
            res.status(404);
        }
    }
    
    ngOnInit (): void {
        this.appService.getTranslations('PAGETITLES.NOTFOUND', true).subscribe(translation => this.appService.setTitle(translation));
    }
}