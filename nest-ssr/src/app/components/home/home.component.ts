import { AfterViewChecked, Component, ElementRef, HostListener, Inject, OnInit, QueryList, ViewChildren } from '@angular/core';
import { DOCUMENT } from '@angular/common';
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
                animate('0.5s 200ms ease'),
            ]),
            transition('leave => enter', [
                animate('0.5s 200ms ease')
            ])
        ]),
        trigger('link-button-container-animation', [
            state('enter', style({ opacity: 1, transform: 'translate(-50%, -80%) scale(1)' })),
            state('leave', style({ opacity: 0, transform: 'translate(-50%, -80%) scale(0)' })),
            transition('enter => leave', [
                animate('300ms ease', style({ opacity: 0, transform: 'translate(-50%, -80%) scale(0)' }))
            ]),
            transition('leave => enter', [
                animate('0.2s 400ms ease', style({ opacity: 1, transform: 'translate(-50%, -80%) scale(1)' }))
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
        ]),
        trigger('scroll-snap-section-item-visiable-animation', [
            state('visiable', style({ opacity: 1, transform: 'translateY(0px)' })),
            state('unvisiable', style({ opacity: 0, transform: 'translateY(150px)' })),
            transition('unvisiable => visiable', [
                animate('1.5s ease', style({ opacity: 1, transform: 'translateY(0px)' }))
            ]),
            transition('visiable => unvisiable', [
                animate('1.5s ease', style({ opacity: 0, transform: 'translateY(150px)' }))
            ])
        ])
    ]
})
export class HomeComponent implements OnInit, AfterViewChecked {
    public deviceInfo: DeviceInfo = null;

    constructor (
        @Inject(DOCUMENT) private readonly _document: Document,
        private readonly _componentElementRef: ElementRef<HTMLElement>,
        
        private readonly deviceService: DeviceDetectorService,

        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) {
        this.setDeviceInfo();
    }

    @ViewChildren('scrollSnapSection', { read: ElementRef<HTMLDivElement> }) public readonly scrollSnapSectionViewRefs: QueryList<ElementRef<HTMLDivElement>>;
    @ViewChildren('scrollSnapVisiableAnimationSection', { read: ElementRef<HTMLDivElement> }) public readonly scrollSnapVisiableAnimationSectionViewRefs: QueryList<ElementRef<HTMLDivElement>>;
    @ViewChildren('scrollSnapItemRadio', { read: ElementRef<HTMLInputElement> }) private readonly scrollSnapItemRadioViewRefs: QueryList<ElementRef<HTMLInputElement>>;

    public isMobileDevice: boolean;
    public isTabletDevice: boolean;
    public isDesktopDevice: boolean;

    public componentElementIsRendered: boolean = false;
    public firstScrollIsFinished: boolean = false;

    public scrollSnapSectionsPosition: { offsetTop: number, offsetHeight: number, offsetTopMod: number, indexNumber: number }[];
    public currentItem: number;

    public scrollSnapVisiableAnimationSectionsPosition: { offsetTop: number, offsetHeight: number }[];

    public currentActiveScrollSnapSection = { index: null, section: null };
    
    public currentMouseTriggerStates: string[] = [];
    public currentLinkButtonContainerAnimationStates: string[] = [];

    public currentScrollSnapItemRadiosContainerAnimationState: string = 'leave';
    public currentScrollSnapItemRadiosEmbededContainerAnimationState: string = 'hide';

    public currentScrollSnapSectionVisiableAnimationStates: { state: string, finished: boolean }[] = [];

    public compressedImagesList: IClientCompressedImage[];

    public discountsData: IDiscount[];

    public imagePhotographyTypes: IImagePhotographyType[][];
    public flatImagePhotographyTypes: IImagePhotographyType[];

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.HOME', true).subscribe(translation => this.appService.setTitle(translation));

            this.clientService.getCompressedImagesData('home').subscribe({
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
                    });

                    this.imagePhotographyTypes.forEach(() => this.currentScrollSnapSectionVisiableAnimationStates.push({ state: 'unvisiable', finished: false }));

                    this.currentScrollSnapSectionVisiableAnimationStates.push({ state: 'unvisiable', finished: false });
                },
                error: () => this.appService.createErrorModal()
            });
        }
    }

    ngAfterViewChecked (): void {
        const componentElement: HTMLElement = this._componentElementRef.nativeElement;

        if ( !this.componentElementIsRendered && componentElement.offsetHeight !== 0 && componentElement.offsetHeight > 450 ) {
            this.componentElementIsRendered = true;
        }

        if ( this.componentElementIsRendered && !this.firstScrollIsFinished ) {
            this.scrollSnapSectionViewRefs.first.nativeElement.scrollIntoView({ behavior: 'auto', block: 'start' });

            this.currentItem = 0;

            this.setActiveScrollSnapSection();

            if ( this.isMobileDevice ) {
                this.currentScrollSnapItemRadiosContainerAnimationState = 'enter';
                this.currentScrollSnapItemRadiosEmbededContainerAnimationState = 'show';
            }
        }
    }

    @HostListener('scroll', [ '$event' ]) public onScroll ($event: any): void {
        if ( $event.srcElement.scrollTop > 50 ) this.clientService.setNavbarAnimationState('scrolled');
        else this.clientService.setNavbarAnimationState('static');

        this.clientService.setPrevNavbarAnimationStateChange(null);

        const indentation: number = this.isDesktopDevice ? 1 : 150;

        if ( $event.srcElement.scrollTop > $event.srcElement.scrollHeight - $event.srcElement.offsetHeight - indentation ) {
            this.clientService.setFooterAnimationState('show');
        } else this.clientService.setFooterAnimationState('hide');

        if ( this.componentElementIsRendered ) {
            this.getCurrentScrollSnapVisiableAnimationSection($event.srcElement);

            if ( !this.firstScrollIsFinished && $event.srcElement.scrollTop === 0 ) this.firstScrollIsFinished = true;

            if ( this.firstScrollIsFinished ) this.getActiveScrollSnapSection($event.srcElement);
        }
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
        } else {
            for ( let i = 0; i < this.scrollSnapSectionsPosition.length; i++ ) {
                if ( currentMiddlePosition > this.scrollSnapSectionsPosition[i].offsetTop && 
                    currentMiddlePosition < this.scrollSnapSectionsPosition[i].offsetTopMod
                ) {
                    this.currentItem = i;

                    this.setActiveScrollSnapSection();
                }
            }
        }
    }

    public setActiveScrollSnapSection (): void {
        const prevActiveRadio = this.scrollSnapItemRadioViewRefs.toArray().find(el => el.nativeElement.checked === true);

        if ( prevActiveRadio ) prevActiveRadio.nativeElement.checked = false;

        const currentItem = this.scrollSnapItemRadioViewRefs.toArray()[this.currentItem];
        
        if ( currentItem ) currentItem.nativeElement.checked = true;

        this.currentItem = this.currentItem += 1;
    }

    public changeActiveScrollSnapSection (event: MouseEvent): void {
        const targetRadio: HTMLInputElement = event.target as HTMLInputElement;

        const scrollSnapSectionPosition = this.scrollSnapSectionsPosition[parseInt(targetRadio.id.replace('defaultCheck', ''), 10)];

        this.scrollSnapSectionViewRefs.toArray()[scrollSnapSectionPosition.indexNumber].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    public getScrollSnapVisiableAnimationSectionsPosition (): void {
        this.scrollSnapVisiableAnimationSectionsPosition = this.scrollSnapVisiableAnimationSectionViewRefs.toArray().map(section => { 
            return { 
                offsetTop: section.nativeElement.offsetTop,
                offsetHeight: section.nativeElement.offsetHeight
            };
        });
    }

    public getCurrentScrollSnapVisiableAnimationSection (componentElement: HTMLElement): void {
        this.getScrollSnapVisiableAnimationSectionsPosition();

        const scrollPosition: number = componentElement.scrollTop + componentElement.offsetHeight;

        this.scrollSnapVisiableAnimationSectionsPosition.forEach((sectionData, index) => {
            if ( this.firstScrollIsFinished && sectionData.offsetTop <= scrollPosition ) {
                this.startScrollSnapSectionVisiableAnimation(index);
            }
        });
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
    
    public startScrollSnapSectionVisiableAnimation (index: number): void {
        if ( !this.currentScrollSnapSectionVisiableAnimationStates[index].finished ) {
            setTimeout(() => {
                this.currentScrollSnapSectionVisiableAnimationStates[index].state = 'visiable';
                this.currentScrollSnapSectionVisiableAnimationStates[index].finished = true;
            }, 500);
        }
    }

    public setCurrentMouseTriggerStateIndex (name: string): number { 
        return this.flatImagePhotographyTypes.findIndex(imagePhotographyTypeData => imagePhotographyTypeData.name === name);
    }

    public mouseTriggerAnimationStarted (event: AnimationEvent): void {
        const mouseTriggerElement: HTMLDivElement = event.element as HTMLDivElement;
        const indexNumber: number = parseInt(mouseTriggerElement.parentElement.getAttribute('mouse-trigger-state-index'), 10);

        if ( event.toState === 'leave' ) this.currentLinkButtonContainerAnimationStates[indexNumber] = 'leave';
        if ( event.toState === 'enter' ) this.currentLinkButtonContainerAnimationStates[indexNumber] = 'enter';
    }
}