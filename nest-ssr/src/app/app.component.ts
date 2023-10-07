import { Component, ComponentRef, ElementRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { Observable, Subscription } from 'rxjs';

import { ModalComponent } from './components/modal/modal.component';

import { AppService } from './app.service';
import { ClientService } from './services/client/client.service';

import { environment } from '../environments/environment';

import { IClientBrowser, IClientLocale } from 'types/global';

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

    @ViewChild('changeClientLocaleButton', { static: false }) private readonly changeClientLocaleButtonViewRef: ElementRef<HTMLButtonElement>;

    public readonly locales: IClientLocale[] = environment.locales;

    public activeClient: Observable<IClientBrowser>

    public activeClientLogin: string;
    public activeClientType: string;
    public activeClientLocale: string;
    public activeClientFullName: string;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) this.clientService.getActiveClient().pipe(activeClient => this.activeClient = activeClient).subscribe({
            next: activeClient => {
                this.activeClientLogin = activeClient ? activeClient.login : null;
                this.activeClientType = activeClient ? activeClient.type : null;
                this.activeClientFullName = activeClient ? activeClient.fullName : null;
                this.activeClientLocale = activeClient ? activeClient.locale : null;

                if ( this.activeClientLocale ) this.translateService.use(this.activeClientLocale);
                else this.translateService.use(environment.defaultLocale);
            },
            error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
        });
    }

    public signOut (): Subscription {
        return this.clientService.signOut().subscribe({
            next: response => response,
            error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef, this.appService.getTranslations('DEFAULTERRORMESSAGE')) 
        });
    }

    public changeClientLocale (event: MouseEvent) {
        const localeButton: HTMLAnchorElement = event.target as HTMLAnchorElement;

        const newLocale: string = localeButton.id;

        this.clientService.changeClientLocale(newLocale).subscribe({
            next: data => {
                localStorage.setItem('access_token', data[0]);

                this.changeClientLocaleButtonViewRef.nativeElement.textContent = newLocale;
            },
            error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
        });
    }
}