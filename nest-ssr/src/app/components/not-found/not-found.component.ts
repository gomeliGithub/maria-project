import { Component, OnInit } from '@angular/core';

import { AppService } from '../../app.service';

@Component({
    selector: 'app-not-found',
    templateUrl: './not-found.component.html',
    styleUrls: ['./not-found.component.css']
})
export class NotFoundComponent implements OnInit {
    constructor (private readonly appService: AppService) { }
    
    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) this.appService.getTranslations('PAGETITLES.NOTFOUND', true).subscribe(translation => this.appService.setTitle(translation));
    }
}