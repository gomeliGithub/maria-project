import { AfterViewChecked, Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';

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
                animate('0.3s 100ms ease-out')
            ]),
            transition('leave => enter', [
                animate('0.3s 100ms ease-out')
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
        ])
    ]
})
export class HomeComponent implements OnInit, AfterViewChecked {
    public deviceInfo: DeviceInfo = null;

    constructor (
        private readonly deviceService: DeviceDetectorService,
        private readonly _componentElement: ElementRef<HTMLElement>,

        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) {
        this.setDeviceInfo();
    }

    public isMobileDevice: boolean;
    public isTabletDevice: boolean;
    public isDesktopDevice: boolean;

    public firstScrolledToTop: boolean = false;
    
    public currentMouseTriggerStates: string[] = [];
    public currentLinkButtonContainerAnimationStates: string[] = [];
    public cursorIconsDisplayStates: boolean[] = [];

    public compressedImagesList: IClientCompressedImage[];

    public discountsData: IDiscount[];

    public imagePhotographyTypes: IImagePhotographyType[][];
    public flatImagePhotographyTypes: IImagePhotographyType[];

    public footerElementRef: ElementRef<HTMLElement>;

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
        const imagesCarousel = document.getElementById('imagesCarousel');

        if ( imagesCarousel && !this.firstScrolledToTop ) {
            this.firstScrolledToTop = true;

            this._componentElement.nativeElement.scroll({
                top: 0,
                left: 0,
                behavior: 'auto'
            });
        }
    }

    @HostListener('scroll', [ '$event' ]) public onScroll ($event: any): void {
        if ( $event.srcElement.scrollTop > 50 ) this.clientService.setNavbarAnimationState('scrolled');
        else this.clientService.setNavbarAnimationState('static');

        this.clientService.setPrevNavbarAnimationStateChange(null);

        if ( $event.srcElement.scrollTop > $event.srcElement.scrollHeight - $event.srcElement.offsetHeight - 1 ) {
            this.footerElementRef.nativeElement.classList.remove('footerHidden');
        } else this.footerElementRef.nativeElement.classList.add('footerHidden');
    }
    
    public setDeviceInfo (): void {
        this.deviceInfo = this.deviceService.getDeviceInfo();
        
        this.isMobileDevice = this.deviceService.isMobile();
        this.isTabletDevice = this.deviceService.isTablet();
        this.isDesktopDevice = this.deviceService.isDesktop();
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