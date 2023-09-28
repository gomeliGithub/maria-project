import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';

import { AppService } from './app.service';
import { ClientService } from './services/client/client.service';

import { IClientBrowser } from 'types/global';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    constructor (
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    title = 'nest-ssr';

    activeClient: Observable<IClientBrowser>

    activeClientLogin: string;
    // activeClientLocale: string;
    activeClientFullName: string;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) this.clientService.getActiveClient().pipe(activeClient => this.activeClient = activeClient).subscribe(activeClient => {
            this.activeClientLogin = activeClient ? activeClient.login : null;
            this.activeClientFullName = activeClient ? activeClient.fullName : null;
        });
    }
}