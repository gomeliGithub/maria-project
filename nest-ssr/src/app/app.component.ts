import { AfterViewInit, Component, ComponentRef, ElementRef, HostListener, Inject, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { animate, animateChild, group, query, state, style, transition, trigger } from '@angular/animations';

import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { ClientComponent } from './components/client/client.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ModalComponent } from './components/modal/modal.component';

import { AppService } from './app.service';
import { ClientService } from './services/client/client.service';

import { environment } from '../environments/environment';

import { IClientLocale } from 'types/global';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    animations: [
        trigger('navbar-toggler-icon-trigger', [
            transition('collapsed <=> expanded', [
                group([
                    query('@top-bar-animation', [ animateChild() ]),
                    query('@middle-bar-animation', [ animateChild() ]),
                    query('@bottom-bar-animation', [ animateChild() ])
                ])
            ])
        ]),
        trigger('top-bar-animation', [
            state('collapsed', style({ transform: 'rotate(0)' })),
            state('expanded', style({ transform: 'rotate(45deg)', transformOrigin: '10% 10%' })),
            transition('collapsed => expanded', [
                animate('0.2s ease', style({ transform: 'rotate(45deg)', transformOrigin: '10% 10%' }))
            ]),
            transition('expanded => collapsed', [
                animate('0.2s ease', style({ transform: 'rotate(0)', transformOrigin: '10% 10%' }))
            ])
        ]),
        trigger('middle-bar-animation', [
            state('collapsed', style({ opacity: 1 })),
            state('expanded', style({ opacity: 0 })),
            transition('collapsed => expanded', [
                animate('0.2s ease', style({ opacity: 0 }))
            ]),
            transition('expanded => collapsed', [
                animate('0.2s ease', style({ opacity: 1 }))
            ])
        ]),
        trigger('bottom-bar-animation', [
            state('collapsed', style({ transform: 'rotate(0)' })),
            state('expanded', style({ transform: 'rotate(-45deg)', transformOrigin: '10% 90%' })),
            transition('collapsed => expanded', [
                animate('0.2s ease', style({ transform: 'rotate(-45deg)', transformOrigin: '10% 90%' }))
            ]),
            transition('expanded => collapsed', [
                animate('0.2s ease', style({ transform: 'rotate(0)', transformOrigin: '10% 90%' }))
            ])
        ]),
        trigger('navbar-animation', [
            state('static', style({ backgroundColor: 'transparent' })),
            state('scrolled', style({ backgroundColor: '#e3f2fd' })),
            transition('static => scrolled', [
                animate('200ms', style({ backgroundColor: '#e3f2fd' }))
            ]),
            transition('scrolled => static', [
                animate('200ms', style({ backgroundColor: 'transparent' }))
            ])
        ])
    ]
})
export class AppComponent implements OnInit, AfterViewInit {
    constructor (
        @Inject(DOCUMENT) private readonly document: Document,
        
        private readonly appService: AppService,
        private readonly clientService: ClientService,
        private readonly translateService: TranslateService
    ) { }

    public onRouterOutlet (component: HomeComponent | GalleryComponent | ClientComponent | AdminPanelComponent | NotFoundComponent): void {
        if ( !(component instanceof HomeComponent) ) this.isHomePage = false;
        else {
            this.isHomePage = true;

            this.navbarAnimationState = 'scrolled';
        }
    }

    @HostListener("scroll", ["$event"]) private onScroll ($event: any): void {
        if ( $event.srcElement.scrollTop > 100 ) this.navbarAnimationState = 'scrolled';
        else this.navbarAnimationState = 'static';
    }

    @HostListener('document:mousedown', ['$event'])
    public onGlobalClick (event: any): void {
        if ( !this.navbarElementRef.nativeElement.contains(event.target) ) {
            if ( !this.navbarTogglerElementRef.nativeElement.classList.contains('collapsed') ) this.navbarTogglerElementRef.nativeElement.click();
        }
    }

    public async clientMenuClick (event: any): Promise<void> {
        const button: HTMLButtonElement = event.target as HTMLButtonElement;

        if ( !button.classList.contains('show') ) {
            const bootstrap = await import('bootstrap');
            
            const menu = new bootstrap.Dropdown(this.document.getElementById('clientMenuButton'));

            menu.toggle();
        }
    }

    public isHomePage: boolean = true;

    public navbarTogglerIconTriggerState: string = 'collapsed';
    public navbarAnimationState: string = 'static';

    @ViewChild(ModalComponent) modalComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    @ViewChild('changeClientLocaleButton', { static: false }) private readonly changeClientLocaleButtonViewRef: ElementRef<HTMLButtonElement>;
    @ViewChild('navbar', { static: false }) private readonly navbarElementRef: ElementRef<HTMLDivElement>;
    @ViewChild('navbarToggler', { static: false }) private readonly navbarTogglerElementRef: ElementRef<HTMLButtonElement>;

    public readonly locales: IClientLocale[] = environment.locales;

    public activeClientLogin: string;
    public activeClientType: string;
    public activeClientLocale: string;
    public activeClientFullName: string;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) this.clientService.getActiveClient().subscribe({
            next: activeClient => {
                this.activeClientLogin = activeClient ? activeClient.login : null;
                this.activeClientType = activeClient ? activeClient.type : null;
                this.activeClientFullName = activeClient ? activeClient.fullName : null;
                this.activeClientLocale = activeClient ? activeClient.locale : null;

                if ( this.activeClientLocale ) this.translateService.use(this.activeClientLocale);
                else this.translateService.use(environment.defaultLocale);

                this.document.documentElement.lang = this.activeClientLocale ?? environment.defaultLocale;
            },
            error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
        });
    }

    ngAfterViewInit (): void {
        this.navbarTogglerElementRef.nativeElement.classList.add('collapsed');
    }

    public changeNavbarTogglerIconTriggerState (): void {
        this.navbarTogglerIconTriggerState = this.navbarTogglerIconTriggerState === 'collapsed' ? 'expanded' : 'collapsed';
    }

    public signOut (): Subscription {
        return this.clientService.signOut().subscribe({
            next: response => response,
            error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef, this.appService.getTranslations('DEFAULTERRORMESSAGE')) 
        });
    }

    public changeClientLocale (event: MouseEvent): void {
        const localeButton: HTMLAnchorElement = event.target as HTMLAnchorElement;

        const newLocale: string = localeButton.id;

        this.clientService.changeClientLocale(newLocale).subscribe({
            next: data => {
                this.document.documentElement.lang = newLocale;

                localStorage.setItem('access_token', data[0]);

                this.changeClientLocaleButtonViewRef.nativeElement.textContent = newLocale;
            },
            error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
        });
    }
}