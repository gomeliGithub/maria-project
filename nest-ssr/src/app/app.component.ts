import { Component, ElementRef, HostBinding, HostListener, Inject, OnInit, Optional, PLATFORM_ID, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { RouterModule } from '@angular/router';
import { animate, animateChild, group, query, state, style, transition, trigger } from '@angular/animations';

import { Request, Response } from 'express';
import { REQUEST, RESPONSE } from '@nestjs/ng-universal/dist/tokens';

import { Subscription } from 'rxjs';
import { NgbDropdown, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DeviceDetectorService } from 'ngx-device-detector';

import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { ClientComponent } from './components/client/client.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { AdminPanelOrdersControlComponent } from './components/admin-panel-orders-control/admin-panel-orders-control.component';
import { AdminPanelDiscountsControlComponent } from './components/admin-panel-discounts-control/admin-panel-discounts-control.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

import { AppService } from './app.service';
import { ClientService } from './services/client/client.service';
import { HomeService } from './services/home/home.service';

import { environment } from '../environments/environment';

import { IClientLocale, IGalleryCompressedImagesData } from 'types/global';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: true,
    imports: [ CommonModule, TranslateModule, NgbModule, RouterModule ],
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
            state('static', style({ backgroundColor: '#d7d7d740' })), // #d7d7d780
            state('scrolled', style({ backgroundColor: '#d7d7d7' })),
            transition('static => scrolled', [
                animate('200ms', style({ backgroundColor: '#d7d7d7' }))
            ]),
            transition('scrolled => static', [
                animate('200ms', style({ backgroundColor: '#d7d7d740' })) // #d7d7d780
            ])
        ]),
        trigger('footer-animation', [
            state('hide', style({ opacity: 0, transform: 'translateY(-100px) scale(0)' })),
            state('show', style({ opacity: 1, transform: 'translateY(0px) scale(1)' })),
            transition('hide => show', [
                animate('150ms', style({ opacity: 1, transform: 'translateY(0px) scale(1)' }))
            ]),
            transition('show => hide', [
                animate('150ms', style({ opacity: 0, transform: 'translateY(-100px) scale(0)' }))
            ])
        ])
    ]
})
export class AppComponent implements OnInit {
    public domainURL: string = environment.domainURL;

    public isPlatformBrowser: boolean;
    public isPlatformServer: boolean;

    public componentElementIsRendered: boolean = false;
    
    public isMobileDevice: boolean;

    public isHomePage: boolean = true;

    public navbarIsCollapsed: boolean = true;
    public navbarTogglerIconTriggerState: string = 'collapsed';
    public navbarAnimationState: string = 'static';
    public prevNavbarAnimationState: string | null;

    public discountsDataIsExists: boolean = false;

    public footerAnimationState: string = 'show'; // public footerAnimationState: string = 'hide';

    @ViewChildren(NgbDropdown) dropdowns: QueryList<NgbDropdown>;

    @ViewChild('navbar', { static: false }) private readonly navbarElementRef: ElementRef<HTMLDivElement>;
    @ViewChild('footer', { static: false }) private readonly footerElementRef: ElementRef<HTMLDivElement>;

    public scrollSnapItemRadiosIndex: number = 1;

    public readonly locales: IClientLocale[] = environment.locales;

    public activeClientLogin: string | null;
    public activeClientType: string | null;
    public activeClientLocale: string | null;
    public activeClientFullName: string | null;
    
    public galleryIndividualCompressedImagesData: IGalleryCompressedImagesData;
    public galleryChildrenCompressedImagesData: IGalleryCompressedImagesData;
    public galleryWeddingCompressedImagesData: IGalleryCompressedImagesData;
    public galleryFamilyCompressedImagesData: IGalleryCompressedImagesData;

    constructor (
        @Inject(PLATFORM_ID) private readonly platformId: string,
        @Optional() @Inject(REQUEST) private readonly _request: Request,
        @Optional() @Inject(RESPONSE) private readonly _response: Response,
        @Inject(DOCUMENT) private readonly _document: Document,
        
        private readonly _appService: AppService,
        private readonly _clientService: ClientService,
        private readonly _homeService: HomeService,

        private readonly _translateService: TranslateService,
        private readonly _deviceService: DeviceDetectorService
    ) { 
        this.isPlatformBrowser = isPlatformBrowser(this.platformId);
        this.isPlatformServer = isPlatformServer(this.platformId);
    }

    ngOnInit (): void {
        if ( this.isPlatformBrowser ) {
            this._clientService.getActiveClient().subscribe({
                next: activeClientData => {
                    this.activeClientLogin = activeClientData ? activeClientData.login : null;
                    this.activeClientType = activeClientData ? activeClientData.type : null;
                    this.activeClientFullName = activeClientData ? activeClientData.fullName : null;
                    this.activeClientLocale = activeClientData ? activeClientData.locale : null;

                    if ( this.activeClientLocale ) this._translateService.use(this.activeClientLocale);
                    else {
                        this._translateService.use(environment.defaultLocale);
                        this.activeClientLocale = environment.defaultLocale;
                    }

                    this._document.documentElement.lang = this.activeClientLocale ?? environment.defaultLocale;
                },
                error: () => this._appService.createErrorModal()
            });

            this.isMobileDevice = this._deviceService.isMobile();

            this._clientService.navbarAnimationStateChange.subscribe(value => this.navbarAnimationState = value);
            this._clientService.prevNavbarAnimationStateChange.subscribe(value => this.prevNavbarAnimationState = value);
            // this.clientService.footerAnimationStateChange.subscribe(value => this.footerAnimationState = value);

            this._homeService.discountsDataIsExistsChange.subscribe(value => this.discountsDataIsExists = value);
        }

        this._clientService.getCompressedImagesData('individual', 'vertical', 0).subscribe(data => this.galleryIndividualCompressedImagesData = data);
        this._clientService.getCompressedImagesData('children', 'vertical', 0).subscribe(data => this.galleryChildrenCompressedImagesData = data);
        this._clientService.getCompressedImagesData('wedding', 'vertical', 0).subscribe(data => this.galleryWeddingCompressedImagesData = data);
        this._clientService.getCompressedImagesData('family', 'vertical', 0).subscribe(data => this.galleryFamilyCompressedImagesData = data);
    }

    public onRouterOutlet (component: HomeComponent | GalleryComponent | ClientComponent | AdminPanelComponent | AdminPanelOrdersControlComponent 
        | AdminPanelDiscountsControlComponent | NotFoundComponent
    ): void {
        if ( !this.navbarIsCollapsed ) this.navbarTogglerClick(true);

        if ( this.navbarAnimationState !== 'static' ) this._clientService.setNavbarAnimationState('static');

        if ( this.isPlatformServer && !environment.production ) {
            this._response.setHeader('Content-Language', environment.locales.map(data => data.code).join(', '));
        }

        if ( !( component instanceof HomeComponent ) ) {
            this.componentClass = false;

            // this.footerAnimationState = 'show';

            this.navbarElementRef.nativeElement.classList.remove('fixed-top');
            this.footerElementRef.nativeElement.classList.remove('bottom-0', 'position-absolute');
            this.navbarElementRef.nativeElement.classList.add('sticky-top');
            this.footerElementRef.nativeElement.classList.add('position-relative');

            this.isHomePage = false;

            if ( component instanceof GalleryComponent ) this._appService.onRouterOutletGalleryComponent(this, component);
        } else {
            this.componentClass = true;
            this.isHomePage = true;

            if ( this.isPlatformServer ) {
                if ( this._request.url === '/' ) {
                    this._appService.updateCanonicalLink(this._document, this.domainURL, 'home');
                }
            }

            this._homeService.setActiveScrollSnapSection(0);

            this.navbarElementRef.nativeElement.classList.remove('sticky-top');
            this.footerElementRef.nativeElement.classList.remove('position-relative');
            this.navbarElementRef.nativeElement.classList.add('fixed-top');
            this.footerElementRef.nativeElement.classList.add('bottom-0', 'position-absolute');
        }
    }

    @HostBinding('class.overflow-y-hidden') componentClass: boolean;

    @HostListener('scroll', [ '$event' ]) public onScroll ($event: any): void {
        if ( $event.srcElement.scrollTop > 50 ) this.navbarAnimationState = 'scrolled';
        else this.navbarAnimationState = 'static';

        if ( $event.srcElement.scrollTop > $event.srcElement.scrollHeight - $event.srcElement.offsetHeight - 1 ) {
            this._clientService.setScrollPageBottomStatus(true);
        }

        this.prevNavbarAnimationState = null;
    }

    @HostListener('document:mousedown', [ '$event' ])
    public onGlobalClick (event: MouseEvent): void {
        if ( !this.navbarElementRef.nativeElement.contains(event.target as HTMLElement) ) {
            if ( !this.navbarIsCollapsed ) this.navbarTogglerClick(true);
        }
    }

    public menuMove (open: boolean, hoveredDropdown?: NgbDropdown): void {
        if ( open ) {
            this.dropdowns.toArray().forEach(el => el.close());
    
            if ( hoveredDropdown ) hoveredDropdown.open();
        } else hoveredDropdown ? hoveredDropdown.close() : this.dropdowns.toArray().forEach(el => el.close());
    }

    public changeNavbarTogglerIconTriggerState (): void {
        this.navbarTogglerIconTriggerState = this.navbarTogglerIconTriggerState === 'collapsed' ? 'expanded' : 'collapsed';
    }

    public changeActiveScrollSnapSection (event: MouseEvent): void {
        if ( !this.isHomePage ) {
            this._appService.reloadComponent(false, '/', false).then(() => setTimeout(() => this.goToActiveScrollSnapSection(event), 1000));
        } else {
            if ( this.isMobileDevice ) this.navbarTogglerClick(true);

            this.goToActiveScrollSnapSection(event);
        }
    }

    public goToActiveScrollSnapSection (event: MouseEvent): void {
        const targetRadio: HTMLInputElement = event.target as HTMLInputElement;

        const scrollSnapSectionPositionIndex: number = parseInt(targetRadio.id.replace('defaultCheck', ''), 10);

        this._homeService.setActiveScrollSnapSection(scrollSnapSectionPositionIndex);
    }

    public goToPageTop (event: MouseEvent): void {
        if ( this.isHomePage ) {
            event.preventDefault();

            if ( this.isMobileDevice ) this.navbarTogglerClick(true);

            setTimeout(() => this._homeService.setActiveScrollSnapSection(0), 500);
        }
    }

    public navbarTogglerClick (animationStart = false): void {
        this._appService.navbarTogglerClick(this, animationStart);
    }

    public signOut (): Subscription {
        return this._clientService.signOut().subscribe({
            next: () => this._appService.reloadComponent(false, '/'),
            error: () => this._appService.createErrorModal(this._appService.getTranslations('DEFAULTERRORMESSAGE')) 
        });
    }

    public changeClientLocale (event: MouseEvent): void {
        this._appService.changeClientLocale(this, this._clientService, event, this._document);
    }
}