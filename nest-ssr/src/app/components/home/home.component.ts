import { AfterContentChecked, AfterRenderPhase, AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, ViewChildren, afterRender} from '@angular/core';
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
import { CommonModule } from '@angular/common';

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
        trigger('scroll-snap-item-radios-container-animation', [
            state('enter', style({ transform: 'translateX(-11.5em)' })),
            state('leave', style({ transform: 'translateX(0px)' })),
            transition('enter => leave', [
                animate('0.5s ease', style({ transform: 'translateX(0px)' }))
            ]),
            transition('leave => enter', [
                animate('0.8s ease-in', style({ transform: 'translateX(-11.5em)' }))
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
    public componentElementIsRendered: boolean = false;
    
    public deviceInfo: DeviceInfo | null = null;

    public isMobileDevice: boolean = false;
    public isTabletDevice: boolean = false;
    public isDesktopDevice: boolean = false;

    public compressedImagesDataIsLoaded: boolean = false;

    public scrollSnapSectionsPosition: { offsetTop: number, offsetHeight: number, offsetTopMod: number, indexNumber: number }[];
    public currentItem: number;

    public scrollSnapVisiableAnimationSectionsPosition: { offsetTop: number, offsetHeight: number }[];

    public currentActiveScrollSnapSection = { index: null, section: null };
    
    public currentMouseTriggerStates: string[] = [];
    public currentLinkButtonContainerAnimationStates: string[] = [];

    public currentScrollSnapItemRadiosContainerAnimationState: string = 'leave';

    public currentScrollSnapSectionVisiableAnimationStates: { state: string, finished: boolean }[] = [];

    public compressedImagesList: ICompressedImageWithoutRelationFields[] | null;

    public discountsData: IDiscount[] | null;

    public imagePhotographyTypes: IImagePhotographyType[][] | null;
    public flatImagePhotographyTypes: IImagePhotographyType[] | null;

    constructor (
        private readonly _router: Router,
        private readonly _changeDetector: ChangeDetectorRef,
        
        private readonly _deviceService: DeviceDetectorService,

        private readonly _appService: AppService,
        private readonly _clientService: ClientService,
        private readonly _homeService: HomeService,
    ) {
        afterRender(() => {
            if ( !this.componentElementIsRendered && this.scrollSnapItemRadioViewRefs.length !== 0 ) {
                this.currentItem = 0;

                this.setActiveScrollSnapSection();

                this.componentElementIsRendered = true;
            }
        }, { phase: AfterRenderPhase.Read });
    }

    @ViewChildren('scrollSnapSection', { read: ElementRef<HTMLDivElement> }) public readonly scrollSnapSectionViewRefs: QueryList<ElementRef<HTMLDivElement>>;
    @ViewChildren('scrollSnapVisiableAnimationSection', { read: ElementRef<HTMLDivElement> }) public readonly scrollSnapVisiableAnimationSectionViewRefs: QueryList<ElementRef<HTMLDivElement>>;
    @ViewChildren('scrollSnapItemRadio', { read: ElementRef<HTMLInputElement> }) private readonly scrollSnapItemRadioViewRefs: QueryList<ElementRef<HTMLInputElement>>;

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

        this._clientService.getCompressedImagesData('home', 'horizontal').subscribe({
            next: imagesData => this.compressedImagesList = imagesData.length !== 0 ? imagesData : null,
            error: () => this._appService.createErrorModal()
        });

        this._clientService.getDiscountsData().subscribe({
            next: discountsData => {
                this.discountsData = discountsData.length !== 0 ? discountsData : null;

                if ( this.discountsData ) this._homeService.setDiscountsDataIsExists(true);
            },
            error: () => this._appService.createErrorModal()
        });

        this._clientService.getImagePhotographyTypesData('home').subscribe({
            next: imagePhotographyTypesData => {
                this.imagePhotographyTypes = imagePhotographyTypesData.length !== 0 ? imagePhotographyTypesData: null;

                if ( this.imagePhotographyTypes !== null ) {
                    this.flatImagePhotographyTypes = this.imagePhotographyTypes.flat();
                    this.flatImagePhotographyTypes.forEach(() => {
                        this.currentMouseTriggerStates.push('leave');
                        this.currentLinkButtonContainerAnimationStates.push('leave');
                    });
        
                    ( this.imagePhotographyTypes as IImagePhotographyType[][] ).forEach(() => this.currentScrollSnapSectionVisiableAnimationStates.push({ state: 'unvisiable', finished: false }));
        
                    this.currentScrollSnapSectionVisiableAnimationStates.push({ state: 'unvisiable', finished: false });
                }
            },
            error: () => this._appService.createErrorModal()
        });

        this._homeService.activeScrollSnapSectionChange.subscribe(value => {
            if ( value === 0 ) this.currentItem = 0;

            this.getScrollSnapSectionsPosition();
            this.setActiveScrollSnapSection();

            const scrollSnapSectionPosition = this.scrollSnapSectionsPosition[value];

            this.scrollSnapSectionViewRefs.toArray()[scrollSnapSectionPosition.indexNumber].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        });
    }

    ngAfterContentChecked (): void {
        this.setDeviceInfo();

        this.currentScrollSnapItemRadiosContainerAnimationState = 'enter';

        this._changeDetector.detectChanges();
    }

    ngAfterViewChecked (): void {
        if ( this._appService.checkIsPlatformBrowser() ) {
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

    public setDeviceInfo (): void {
        this.deviceInfo = this._deviceService.getDeviceInfo();
        
        this.isMobileDevice = this._deviceService.isMobile();
        this.isTabletDevice = this._deviceService.isTablet();
        this.isDesktopDevice = this._deviceService.isDesktop();
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
        const scrollSnapItemRadiosArr: ElementRef<HTMLInputElement>[] = this.scrollSnapItemRadioViewRefs.toArray();

        scrollSnapItemRadiosArr.forEach(el => el.nativeElement.checked = false);

        const currentItem: ElementRef<HTMLInputElement> = scrollSnapItemRadiosArr[this.currentItem];
        
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
            if ( sectionData.offsetTop <= scrollPosition ) {
                setTimeout(() => this.startScrollSnapSectionVisiableAnimation(index), 500);
            }
        });
    }

    public startScrollSnapItemRadiosContainerAnimation (toState: string): void {
        this.currentScrollSnapItemRadiosContainerAnimationState = toState;
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