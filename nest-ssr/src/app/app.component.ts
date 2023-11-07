import { Component, ElementRef, HostBinding, HostListener, Inject, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
import { animate, animateChild, group, query, state, style, transition, trigger } from '@angular/animations';
import { TranslateService } from '@ngx-translate/core';

import { Subscription } from 'rxjs';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { ClientComponent } from './components/client/client.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { AdminPanelOrdersControlComponent } from './components/admin-panel-orders-control/admin-panel-orders-control.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

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
export class AppComponent implements OnInit {
    constructor (
        @Inject(DOCUMENT) private readonly document: Document,
        
        private readonly appService: AppService,
        private readonly clientService: ClientService,
        private readonly translateService: TranslateService
    ) { }

    public isHomePage: boolean = true;

    public navbarIsCollapsed: boolean = true;
    public navbarTogglerIconTriggerState: string = 'collapsed';
    public navbarAnimationState: string = 'static';
    public prevNavbarAnimationState: string = null;

    @ViewChildren(NgbDropdown) dropdowns: QueryList<NgbDropdown>;

    @ViewChild('changeClientLocaleButton', { static: false }) private readonly changeClientLocaleButtonViewRef: ElementRef<HTMLButtonElement>;
    @ViewChild('navbar', { static: false }) private readonly navbarElementRef: ElementRef<HTMLDivElement>;
    @ViewChild('footer', { static: false }) private readonly footerElementRef: ElementRef<HTMLElement>;

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
            error: () => this.appService.createErrorModal()
        });
    }

    public onRouterOutlet (component: HomeComponent | GalleryComponent | ClientComponent | AdminPanelComponent | AdminPanelOrdersControlComponent | NotFoundComponent): void {
        if ( !this.navbarIsCollapsed ) this.navbarTogglerClick(true);

        if ( !(component instanceof HomeComponent) ) {
            this.componentClass = false;
            this.footerElementRef.nativeElement.classList.remove('footerHidden');
            this.isHomePage = false;

            if ( component instanceof GalleryComponent ) {
                component.activeClientIsExists = this.activeClientLogin ? true : false;
                component.activeClientType = this.activeClientType;
            }
        } else {
            this.componentClass = true;
            this.isHomePage = true;

            this.navbarAnimationState = 'scrolled';

            component.footerElementRef = this.footerElementRef;
        }
    }

    @HostBinding('class.overflow-y-hidden') componentClass: boolean;

    @HostListener("scroll", ["$event"]) private onScroll ($event: any): void {
        if ( $event.srcElement.scrollTop > 50 ) this.navbarAnimationState = 'scrolled';
        else this.navbarAnimationState = 'static';

        this.prevNavbarAnimationState = null;
    }

    @HostListener('document:mousedown', ['$event'])
    public onGlobalClick (event: MouseEvent): void {
        if ( !this.navbarElementRef.nativeElement.contains(event.target as HTMLElement) ) {
            if ( !this.navbarIsCollapsed ) this.navbarTogglerClick(true);
        }
    }

    public navbarTogglerClick (animationStart = false): void {
        if ( animationStart ) this.changeNavbarTogglerIconTriggerState();

        this.navbarIsCollapsed = !this.navbarIsCollapsed;
        if ( !this.prevNavbarAnimationState ) this.prevNavbarAnimationState = this.navbarAnimationState;

        if ( !this.isHomePage && this.prevNavbarAnimationState === 'static' ) {
            if ( !this.navbarIsCollapsed ) this.navbarAnimationState = 'scrolled';
            else {
                this.navbarAnimationState = 'static';

                this.prevNavbarAnimationState = null;
            }
        }
    }

    public menuMove (open: boolean, hoveredDropdown?: NgbDropdown): void {
        if ( open ) {
            this.dropdowns.toArray().forEach(el => el.close());
    
            hoveredDropdown.open();
        } else hoveredDropdown ? hoveredDropdown.close() : this.dropdowns.toArray().forEach(el => el.close());
    }

    public changeNavbarTogglerIconTriggerState (): void {
        this.navbarTogglerIconTriggerState = this.navbarTogglerIconTriggerState === 'collapsed' ? 'expanded' : 'collapsed';
    }

    public signOut (): Subscription {
        return this.clientService.signOut().subscribe({
            next: () => this.appService.reloadComponent(false, '/'),
            error: () => this.appService.createErrorModal(this.appService.getTranslations('DEFAULTERRORMESSAGE')) 
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
            error: () => this.appService.createErrorModal()
        });
    }
}