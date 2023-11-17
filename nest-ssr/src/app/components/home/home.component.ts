import { AfterViewChecked, Component, ElementRef, HostListener, Inject, OnInit, PLATFORM_ID, QueryList, ViewChildren } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TransferState, makeStateKey } from '@angular/platform-browser';
import { animate, animateChild, query, state, style, transition, trigger } from '@angular/animations';

import { DeviceDetectorService, DeviceInfo } from 'ngx-device-detector';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

import { AnimationEvent } from 'types/global';
import { IClientCompressedImage, IDiscount, IImagePhotographyType } from 'types/models';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    animations: [
        trigger('mouseTrigger', [
            state('enter', style({
                opacity: 0.4,
                transform: 'rotate3d(0, -5, 0, -0.5turn) scale(0.8)'
            })),
            state('leave', style({
                opacity: 1
            })),
            transition('enter => leave', [
                animate('0.5s 200ms ease')
            ]),
            transition('leave => enter', [
                animate('0.5s 200ms ease')
            ])
        ]),
        trigger('link-button-container-animation', [
            state('enter', style({ opacity: 1, transform: 'translate(-50%, -50%) scale(1)' })),
            state('leave', style({ opacity: 0, transform: 'translate(-50%, -50%) scale(0)' })),
            transition('enter => leave', [
                animate('300ms', style({ opacity: 0, transform: 'translate(-50%, -50%) scale(0)' }))
            ]),
            transition('leave => enter', [
                animate('0.2s', style({ opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }))
            ])
        ]),
        trigger('scroll-snap-item-radios-container-animation', [
            state('enter', style({ transform: 'translateX(-11.5em)' })),
            state('leave', style({ transform: 'translateX(0px)' })),
            transition('enter => leave', [
                animate('0.5s ease', style({ transform: 'translateX(0px)' })),
                query('@scroll-snap-item-radios-embeded-container-animation', [ animateChild() ])
            ]),
            transition('leave => enter', [
                animate('0.8s ease-in', style({ transform: 'translateX(-11.5em)' })),
                query('@scroll-snap-item-radios-embeded-container-animation', [ animateChild() ])
            ])
        ]),
        trigger('scroll-snap-item-radios-embeded-container-animation', [
            state('show', style({ opacity: 1 })),
            state('hide', style({ opacity: 0 })),
            transition('show => hide', [
                animate('0.3s ease', style({ opacity: 0 }))
            ]),
            transition('hide => show', [
                animate('0.3s ease', style({ opacity: 1 }))
            ])
        ])
    ]
})
export class HomeComponent implements OnInit, AfterViewChecked {
    public deviceInfo: DeviceInfo = null;

    constructor (
        @Inject(DOCUMENT) private readonly _document: Document,
        @Inject(PLATFORM_ID) private platformId: Object,
        private readonly transferState: TransferState,
        
        private readonly deviceService: DeviceDetectorService,

        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) {
        this.setDeviceInfo();
    }

    private readonly SERVER_DATA_KEY = makeStateKey<string>('pageTitle');

    @ViewChildren('scrollSnapSection', { read: ElementRef<HTMLDivElement> }) public readonly scrollSnapSectionViewRefs: QueryList<ElementRef<HTMLDivElement>>;
    @ViewChildren('scrollSnapItemRadio', { read: ElementRef<HTMLInputElement> }) private readonly scrollSnapItemRadioViewRefs: QueryList<ElementRef<HTMLInputElement>>;

    public isMobileDevice: boolean;
    public isTabletDevice: boolean;
    public isDesktopDevice: boolean;

    public firstViewChecked: boolean = false;
    public secondViewChecked: boolean = false;

    public scrollSnapSectionsPosition: { offsetTop: number, offsetHeight: number, offsetTopMod: number, indexNumber: number }[];
    public currentItem: number;

    public currentActiveScrollSnapSection = { index: null, section: null };
    
    public currentMouseTriggerStates: string[] = [];
    public currentLinkButtonContainerAnimationStates: string[] = [];
    public cursorIconsDisplayStates: boolean[] = [];

    public currentScrollSnapItemRadiosContainerAnimationState: string = 'leave';
    public currentScrollSnapItemRadiosEmbededContainerAnimationState: string = 'hide';

    public compressedImagesList: IClientCompressedImage[];

    public discountsData: IDiscount[];

    public imagePhotographyTypes: IImagePhotographyType[][];
    public flatImagePhotographyTypes: IImagePhotographyType[];

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.HOME', true).subscribe(translation => this.appService.setTitle(translation));

            this.clientService.getCompressedImagesList('home').subscribe({
                next: imagesList => this.compressedImagesList = imagesList,
                error: () => this.appService.createErrorModal()
            });

            this.clientService.getDiscountsData().subscribe({
                next: discountsData => this.discountsData = discountsData && discountsData.length !== 0 ? discountsData : null,
                error: () => this.appService.createErrorModal()
            });
            
            this.clientService.getImagePhotographyTypesData('home').subscribe({
                next: imagePhotographyTypesData => {
                    this.imagePhotographyTypes = imagePhotographyTypesData;

                    this.flatImagePhotographyTypes = this.imagePhotographyTypes.flat();
                    this.flatImagePhotographyTypes.forEach(() => {
                        this.currentMouseTriggerStates.push('leave');
                        this.currentLinkButtonContainerAnimationStates.push('leave');

                        if ( this.isMobileDevice || this.isTabletDevice ) this.cursorIconsDisplayStates.push(true);
                    });
                },
                error: () => this.appService.createErrorModal()
            });
        }
    }

    ngAfterViewChecked (): void {
        const imagesCarousel = this._document.getElementById('imagesCarousel');

        if ( imagesCarousel && !this.firstViewChecked ) {
            this.firstViewChecked = true;
        }

        if ( this.firstViewChecked && !this.secondViewChecked ) {
            this.scrollSnapSectionViewRefs.first.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

            this.secondViewChecked = true;
        }
    }

    @HostListener('scroll', [ '$event' ]) public onScroll ($event: any): void {
        if ( $event.srcElement.scrollTop > 50 ) this.clientService.setNavbarAnimationState('scrolled');
        else this.clientService.setNavbarAnimationState('static');

        this.clientService.setPrevNavbarAnimationStateChange(null);

        if ( $event.srcElement.scrollTop > $event.srcElement.scrollHeight - $event.srcElement.offsetHeight - 150 ) {
            this.clientService.setFooterAnimationState('show');
        } else this.clientService.setFooterAnimationState('hide');

        if ( this.secondViewChecked ) this.getActiveScrollSnapSection($event.srcElement);
    }

    @HostListener('resize', [ '$event' ]) public onResize (): void {
        this.getScrollSnapSectionsPosition();
    }
    
    public setDeviceInfo (): void {
        this.deviceInfo = this.deviceService.getDeviceInfo();
        
        this.isMobileDevice = this.deviceService.isMobile();
        this.isTabletDevice = this.deviceService.isTablet();
        this.isDesktopDevice = this.deviceService.isDesktop();
    }

    public getScrollSnapSectionsPosition (): void {
        this.scrollSnapSectionsPosition = this.scrollSnapSectionViewRefs.toArray().map((section, i) => { 
            return { 
                offsetTop: section.nativeElement.offsetTop,
                offsetHeight: section.nativeElement.offsetHeight,
                offsetTopMod: section.nativeElement.offsetTop + section.nativeElement.offsetHeight, 
                indexNumber: i
            };
        });
    }

    public getActiveScrollSnapSection (componentElement: HTMLElement): void {
        this.getScrollSnapSectionsPosition();

        const currentScrollTop: number = componentElement.scrollTop;
        const currentMiddlePosition: number = currentScrollTop + componentElement.offsetHeight / 2; 

        if ( currentScrollTop === 0 ) {
            this.currentItem = 0;

            this.setActiveScrollSnapSection();
        } else for ( let i = 0; i < this.scrollSnapSectionsPosition.length; i++ ) {
            if ( currentMiddlePosition > this.scrollSnapSectionsPosition[i].offsetTop && 
                currentMiddlePosition < this.scrollSnapSectionsPosition[i].offsetTopMod
            ) {
                this.currentItem = i;

                this.setActiveScrollSnapSection();
            }
        }
    }

    public setActiveScrollSnapSection (): void {
        const prevActiveRadio = this.scrollSnapItemRadioViewRefs.toArray().find(el => el.nativeElement.checked === true);

        if ( prevActiveRadio ) prevActiveRadio.nativeElement.checked = false;
        
        this.scrollSnapItemRadioViewRefs.toArray()[this.currentItem].nativeElement.checked = true;

        this.currentItem = this.currentItem += 1;
    }

    public changeActiveScrollSnapSection (event: MouseEvent): void {
        const targetRadio: HTMLInputElement = event.target as HTMLInputElement;

        const scrollSnapSectionPosition = this.scrollSnapSectionsPosition[parseInt(targetRadio.id.replace('defaultCheck', ''), 10)];

        this.scrollSnapSectionViewRefs.toArray()[scrollSnapSectionPosition.indexNumber].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    public startScrollSnapItemRadiosContainerAnimation (toState: string): void {
        if ( this.isDesktopDevice ) {
            this.currentScrollSnapItemRadiosContainerAnimationState = toState;

            if ( toState === 'enter' ) this.currentScrollSnapItemRadiosEmbededContainerAnimationState = 'show';
            else if ( toState === 'leave' ) this.currentScrollSnapItemRadiosEmbededContainerAnimationState = 'hide';
        }
    }

    public startScrollSnapItemRadiosContainerAnimationClick (): void {
        if ( this.isMobileDevice || this.isTabletDevice ) {
            this.currentScrollSnapItemRadiosContainerAnimationState = this.currentScrollSnapItemRadiosContainerAnimationState === 'enter' ? 'leave' : 'enter';

            if ( this.currentScrollSnapItemRadiosContainerAnimationState === 'enter' ) this.currentScrollSnapItemRadiosEmbededContainerAnimationState = 'show';
            else if ( this.currentScrollSnapItemRadiosContainerAnimationState === 'leave' ) this.currentScrollSnapItemRadiosEmbededContainerAnimationState = 'hide';
        }
    }

    public startMouseTriggerAnimation (index: number): void {
        if ( this.isDesktopDevice ) this.currentMouseTriggerStates[index] = this.currentMouseTriggerStates[index] === 'enter' ? 'leave' : 'enter';
    }

    public startMouseTriggerAnimationClick (index: number): void {
        if ( this.isMobileDevice || this.isTabletDevice ) {
            this.currentMouseTriggerStates = this.currentMouseTriggerStates.map((_, i) => {
                if ( i !== index ) return 'leave';
                else return this.currentMouseTriggerStates[index] === 'enter' ? 'leave' : 'enter';
            });
        }
    }

    public setCurrentMouseTriggerStateIndex (name: string): number { 
        return this.flatImagePhotographyTypes.findIndex(imagePhotographyTypeData => imagePhotographyTypeData.name === name);
    }

    public mouseTriggerAnimationStarted (event: AnimationEvent): void {
        const mouseTriggerElement: HTMLDivElement = event.element as HTMLDivElement;
        const indexNumber: number = parseInt(mouseTriggerElement.parentElement.getAttribute('mouse-trigger-state-index'), 10);

        if ( event.toState === 'leave' ) this.currentLinkButtonContainerAnimationStates[indexNumber] = 'leave';
        if ( event.toState === 'enter' ) this.cursorIconsDisplayStates[indexNumber] = false;
    }

    public mouseTriggerAnimationDone (event: AnimationEvent): void {
        const mouseTriggerElement: HTMLDivElement = event.element as HTMLDivElement;
        const indexNumber: number = parseInt(mouseTriggerElement.parentElement.getAttribute('mouse-trigger-state-index'), 10);

        if ( event.toState === 'leave' ) this.cursorIconsDisplayStates[indexNumber] = true;
        if ( event.toState === 'enter') this.currentLinkButtonContainerAnimationStates[indexNumber] = 'enter';
    }
}