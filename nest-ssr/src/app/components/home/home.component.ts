import { AfterContentChecked, AfterRenderPhase, AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, Inject, OnDestroy, OnInit, PLATFORM_ID, QueryList, TransferState, ViewChildren, afterRender, makeStateKey} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule } from '@ngx-translate/core';
import { DeviceDetectorService, DeviceInfo } from 'ngx-device-detector';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';
import { HomeService } from '../../services/home/home.service';

import { AnimationEvent } from 'types/global';
import { ICompressedImageWithoutRelationFields, IDiscount, IImagePhotographyType } from 'types/models';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';

const compressedImagesListDataStateKey = makeStateKey<ICompressedImageWithoutRelationFields[] | null>('compressedImagesList');
const discountsDataStateKey = makeStateKey<IDiscount[] | null>('discountsData');
const imagePhotographyTypesStateKey = makeStateKey<IImagePhotographyType[][] | null>('imagePhotographyTypes');

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [ CommonModule, NgbModule, RouterModule, TranslateModule ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    animations: [
        trigger('mouseTrigger', [
            state('enter', style({
                // opacity: 0.4,
                // transform: 'rotate3d(0, -5, 0, -0.5turn) scale(0.8)'
                transform: 'scale(0.85)'
            })),
            state('leave', style({
                // opacity: 1
            })),
            transition('enter => leave', [
                animate('0.5s ease'),
            ]),
            transition('leave => enter', [
                animate('0.5s ease')
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
        trigger('scroll-snap-section-item-visiable-animation', [
            state('visiable', style({ opacity: 1, transform: 'translateY(0px)' })),
            state('unvisiable', style({ opacity: 0, transform: 'translateY(200px)' })),
            transition('unvisiable => visiable', [
                animate('0.9s 200ms ease-out', style({ opacity: 1, transform: 'translateY(0px)' }))
            ]),
            transition('visiable => unvisiable', [
                animate('0.9s 200ms ease-out', style({ opacity: 0, transform: 'translateY(200px)' }))
            ])
        ])
    ]
})
export class HomeComponent implements OnInit, AfterContentChecked, AfterViewChecked, OnDestroy {
    public isPlatformBrowser: boolean;
    public isPlatformServer: boolean;

    public componentElementIsRendered: boolean = false;
    
    public deviceInfo: DeviceInfo | null = null;

    public isMobileDevice: boolean = false;
    public isTabletDevice: boolean = false;
    public isDesktopDevice: boolean = false;

    public compressedImagesDataIsLoaded: boolean = false;

    public scrollSnapSectionsPosition: { offsetTop: number, offsetHeight: number, offsetTopMod: number, indexNumber: number }[];

    public scrollSnapVisiableAnimationSectionsPosition: { offsetTop: number, offsetHeight: number }[];

    public currentActiveScrollSnapSection = { index: null, section: null };
    
    public currentMouseTriggerStates: string[] = [];
    public currentLinkButtonContainerAnimationStates: string[] = [];

    public currentScrollSnapSectionVisiableAnimationStates: { state: string, finished: boolean }[] = [];

    public compressedImagesList: ICompressedImageWithoutRelationFields[] | null;

    public discountsData: IDiscount[] | null;

    public imagePhotographyTypes: IImagePhotographyType[][] | null;
    public flatImagePhotographyTypes: IImagePhotographyType[] | null;

    constructor (
        @Inject(PLATFORM_ID) private readonly platformId: string,

        private readonly _router: Router,
        private readonly _changeDetector: ChangeDetectorRef,
        private readonly _transferState: TransferState,
        
        private readonly _deviceService: DeviceDetectorService,

        private readonly _appService: AppService,
        private readonly _clientService: ClientService,
        private readonly _homeService: HomeService,
    ) {
        this.isPlatformBrowser = isPlatformBrowser(this.platformId);
        this.isPlatformServer = isPlatformServer(this.platformId);
        
        afterRender(() => {
            if ( !this.componentElementIsRendered ) {
                this.componentElementIsRendered = true;
            }
        }, { phase: AfterRenderPhase.Read });
    }

    @ViewChildren('scrollSnapSection', { read: ElementRef<HTMLDivElement> }) public readonly scrollSnapSectionViewRefs: QueryList<ElementRef<HTMLDivElement>>;
    @ViewChildren('scrollSnapVisiableAnimationSection', { read: ElementRef<HTMLDivElement> }) public readonly scrollSnapVisiableAnimationSectionViewRefs: QueryList<ElementRef<HTMLDivElement>>;

    ngOnInit (): void {
        this._appService.getTranslations('PAGETITLES.HOME', true).subscribe(translation => {
            this._appService.setTitle(translation);
        });

        this._router.events.subscribe(evt => {
            if ( !(evt instanceof NavigationEnd) ) return;
            else {
                if ( !evt.url.startsWith('/') ) this._clientService.setNavbarAnimationState('static');
            }
        });

        if ( this.isPlatformServer ) {
            this._homeService.getCompressedImagesData(this, compressedImagesListDataStateKey);
            this._homeService.getDiscountsData(this, discountsDataStateKey);
            this._homeService.getImagePhotographyTypesData(this, imagePhotographyTypesStateKey);
        } else if ( this.isPlatformBrowser ) {
            this.compressedImagesList = this._transferState.get<ICompressedImageWithoutRelationFields[] | null>(compressedImagesListDataStateKey, null);

            if ( this.compressedImagesList === null ) this._homeService.getCompressedImagesData(this, compressedImagesListDataStateKey);

            this.discountsData = this._transferState.get<IDiscount[] | null>(discountsDataStateKey, null);

            if ( this.discountsData !== null && this.discountsData.length !== 0 ) this._homeService.setDiscountsDataIsExists(true);
            if ( this.discountsData === null ) this._homeService.getDiscountsData(this, discountsDataStateKey);

            this.imagePhotographyTypes = this._transferState.get<IImagePhotographyType[][] | null>(imagePhotographyTypesStateKey, null);

            if ( this.imagePhotographyTypes === null ) this._homeService.getImagePhotographyTypesData(this, imagePhotographyTypesStateKey);

            this.setAnimationsStates();
        }

        this._homeService.activeScrollSnapSectionChange.subscribe(value => {
            this.getScrollSnapSectionsPosition();

            const scrollSnapSectionPosition = this.scrollSnapSectionsPosition[value];

            this.scrollSnapSectionViewRefs.toArray()[scrollSnapSectionPosition.indexNumber].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        });
    }

    ngAfterContentChecked (): void {
        this.setDeviceInfo();

        this._changeDetector.detectChanges();
    }

    ngAfterViewChecked (): void {
        if ( this.isPlatformBrowser ) {
            if ( this.compressedImagesList && !this.compressedImagesDataIsLoaded ) {
                this.scrollSnapSectionViewRefs.first.nativeElement.scrollIntoView({ behavior: 'auto', block: 'start' });

                this.compressedImagesDataIsLoaded = true;

                this.getScrollSnapSectionsPosition();
            }
        }
    }

    ngOnDestroy (): void {
        this.componentElementIsRendered = false;
        this.compressedImagesDataIsLoaded = false;
    }

    @HostListener('scroll', [ '$event' ]) public onScroll ($event: any): void {
        if ( $event.srcElement.scrollTop > 50 ) this._clientService.setNavbarAnimationState('scrolled');
        else this._clientService.setNavbarAnimationState('static');

        this._clientService.setPrevNavbarAnimationStateChange(undefined);

        /* if ( $event.srcElement.scrollTop > $event.srcElement.scrollHeight - $event.srcElement.offsetHeight - 1 ) {
            this.clientService.setFooterAnimationState('show');
        } else this.clientService.setFooterAnimationState('hide'); */

        if ( this.componentElementIsRendered ) {
            this.getCurrentScrollSnapVisiableAnimationSection($event.srcElement);

            this.getActiveScrollSnapSection($event.srcElement);
        }
    }
    
    public setAnimationsStates (): void {
        if ( this.imagePhotographyTypes !== null ) {
            this.flatImagePhotographyTypes = this.imagePhotographyTypes.flat();
            this.flatImagePhotographyTypes.forEach(() => {
                this.currentMouseTriggerStates.push('leave');
                this.currentLinkButtonContainerAnimationStates.push('leave');
            });

            ( this.imagePhotographyTypes as IImagePhotographyType[][] ).forEach(() => this.currentScrollSnapSectionVisiableAnimationStates.push({ state: 'unvisiable', finished: false }));

            this.currentScrollSnapSectionVisiableAnimationStates.push({ state: 'unvisiable', finished: false });

            this._changeDetector.detectChanges();
        }
    }

    public setDeviceInfo (): void {
        this.deviceInfo = this._deviceService.getDeviceInfo();
        
        this.isMobileDevice = this._deviceService.isMobile();
        this.isTabletDevice = this._deviceService.isTablet();
        this.isDesktopDevice = this._deviceService.isDesktop();
    }

    public getScrollSnapSectionsPosition (): void {
        this.scrollSnapSectionsPosition = this.scrollSnapSectionViewRefs.toArray().map(( section, i ) => { 
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
            
        } else {
            for ( let i = 0; i < this.scrollSnapSectionsPosition.length; i++ ) {
                if ( currentMiddlePosition > this.scrollSnapSectionsPosition[i].offsetTop && 
                    currentMiddlePosition < this.scrollSnapSectionsPosition[i].offsetTopMod
                ) {
                    
                }
            }
        }
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
            if ( sectionData.offsetTop <= scrollPosition ) {
                setTimeout(() => this.startScrollSnapSectionVisiableAnimation(index), 500);
            }
        });
    }

    public startMouseTriggerAnimation (index: number): void {
        if ( this.isDesktopDevice ) this.currentMouseTriggerStates[index] = this.currentMouseTriggerStates[index] === 'enter' ? 'leave' : 'enter';
    }

    public startMouseTriggerAnimationClick (index: number): void {
        if ( this.isMobileDevice ) {
            this.currentMouseTriggerStates = this.currentMouseTriggerStates.map((_, i) => {
                if ( i !== index ) return 'leave';
                else return this.currentMouseTriggerStates[index] === 'enter' ? 'leave' : 'enter';
            });
        }
    }
    
    public startScrollSnapSectionVisiableAnimation (index: number): void {
        if ( !this.currentScrollSnapSectionVisiableAnimationStates[index].finished ) {
            this.currentScrollSnapSectionVisiableAnimationStates[index].state = 'visiable';
            this.currentScrollSnapSectionVisiableAnimationStates[index].finished = true;
        }
    }

    public scrollSnapSectionItemVisiableAnimationStarted (event: AnimationEvent): void {
        if ( event.toState === 'visiable' ) {
            const target: HTMLDivElement = event.element;

            target.classList.add('pe-none');
        }
    }

    public scrollSnapSectionItemVisiableAnimationDone (event: AnimationEvent): void {
        if ( event.toState === 'visiable' ) {
            const target: HTMLDivElement = event.element;

            target.classList.remove('pe-none');
        }
    }

    public setCurrentMouseTriggerStateIndex (name: string): number { 
        return ( this.flatImagePhotographyTypes as IImagePhotographyType[] ).findIndex(imagePhotographyTypeData => imagePhotographyTypeData.name === name);
    }

    public mouseTriggerAnimationStarted (event: AnimationEvent): void {
        const mouseTriggerElement: HTMLDivElement = event.element as HTMLDivElement;
        const indexNumber: number = parseInt(( mouseTriggerElement.parentElement as HTMLElement ).getAttribute('mouse-trigger-state-index') as string, 10);

        if ( event.toState === 'leave' ) this.currentLinkButtonContainerAnimationStates[indexNumber] = 'leave';
        if ( event.toState === 'enter' ) this.currentLinkButtonContainerAnimationStates[indexNumber] = 'enter';
    }
}