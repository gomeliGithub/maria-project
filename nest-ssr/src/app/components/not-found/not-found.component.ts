import { Component, Inject, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    constructor (
        @Optional() @Inject(RESPONSE) res: Response,

        private readonly _appService: AppService
    ) {
        if ( this._appService.checkIsPlatformServer() ) {
            res.status(404);
        }
    }
    
    ngOnInit (): void {
        this._appService.getTranslations('PAGETITLES.NOTFOUND', true).subscribe(translation => this._appService.setTitle(translation));
    }
}