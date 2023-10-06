import { Component, ComponentRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { ModalComponent } from './components/modal/modal.component';

import { AppService } from './app.service';
import { ClientService } from './services/client/client.service';

import { environment } from '../environments/environment';

import { IClientBrowser } from 'types/global';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    constructor (
        private readonly appService: AppService,
        private readonly clientService: ClientService,
        private readonly translateService: TranslateService
    ) { }

    @ViewChild(ModalComponent) modalComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    activeClient: Observable<IClientBrowser>

    activeClientLogin: string;
    // activeClientLocale: string;
    activeClientFullName: string;

    ngOnInit (): void {
        this.translateService.use(environment.defaultLocale);

        if ( this.appService.checkIsPlatformBrowser() ) this.clientService.getActiveClient().pipe(activeClient => this.activeClient = activeClient).subscribe({
            next: activeClient => {
                this.activeClientLogin = activeClient ? activeClient.login : null;
                this.activeClientFullName = activeClient ? activeClient.fullName : null;
            },
            error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
        });
    }
}