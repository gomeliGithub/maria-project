import { Component, ElementRef, HostBinding, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';

import { AppService } from '../../../app/app.service';
import { ClientService } from '../../services/client/client.service';

import { AnimationEvent, IGalleryCompressedImagesData, IReducedGalleryCompressedImages } from 'types/global';
import { IClientCompressedImage } from 'types/models';

@Component({
    selector: 'app-gallery',
    templateUrl: './gallery.component.html',
    styleUrls: ['./gallery.component.css'],
    animations: [
        trigger('link-container-animation', [
            state('leave', style({
                opacity: 0,
                width: '0%',
            })),
            state('enter', style({
                opacity: 1,
                width: '100%',
            })),
            transition('leave => enter', [
                animate('500ms', style({ opacity: 1, width: '100%' }))
            ]),
            transition('enter => leave', [
                animate('500ms', style({ opacity: 0, width: '0%' }))
            ])
        ]),
        trigger('send-order-form-animation', [
            state('hide', style({
                transform: 'translate(-400%, 0) rotate3d(1, 1, 1, 90deg)'
            })),
            state('show', style({
                transform: 'translate(0, 0) rotate3d(0, 0, 0, 0)'
            })),
            transition('hide => show', [
                animate('0.5s 300ms ease-in', style({ transform: 'translate(0, 0) rotate3d(0, 0, 0, 0)' }))
            ]),
            transition('show => hide', [
                animate('0.2s', style({ transform: 'translate(-400%, 0) rotate3d(1, 1, 1, 90deg)' }))
            ])
        ]),
        trigger('images-animation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(250px)' }),
                animate('1.5s ease', style({ opacity: 1, transform: 'translateY(0px)' }))
            ]),
            transition(':leave', [
                style({ opacity: 1, transform: 'translateY(0px)'}),
                animate('1.5s ease', style({ opacity: 0, transform: 'translateY(250px)' }))
            ])
        ])
    ]
})
export class GalleryComponent implements OnInit {
    public photographyType: string;

    constructor (
        private readonly activateRoute: ActivatedRoute,
        private readonly router: Router,
        private readonly _componentRef: ElementRef<HTMLElement>,

        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) {
        this.photographyType = this.activateRoute.snapshot.paramMap.get('photographyType');

        this.sendOrderForm = new FormGroup({
            'orderType': new FormControl("", [ Validators.required, this.orderTypeValidator ]),
            'clientPhoneNumber': new FormControl("", [ Validators.required, Validators.pattern(/(?:\+|\d)[\d\-\(\) ]{9,}\d/g) ]),
            'comment': new FormControl("", Validators.maxLength(30))
        });
    }
    
    public activeClientIsExists: boolean;
    public activeClientType: string;

    public sendOrderForm: FormGroup<{
        orderType: FormControl<string>,
        clientPhoneNumber: FormControl<string>,
        comment: FormControl<string>
    }>;

    @HostBinding('className') componentClass: string;

    @ViewChildren('imageContainer', { read: ElementRef<HTMLDivElement> }) private readonly imageContainerViewRefs: QueryList<ElementRef<HTMLDivElement>>;

    @ViewChild('sendOrderFormContainer', { static: false }) private readonly sendOrderFormContainerViewRef: ElementRef<HTMLDivElement>;

    public compressedBigImagesIsExistsObservable: Observable<boolean>;
    public compressedBigImagesIsExists: boolean = false;
    public compressedImagesListObservable: Observable<IGalleryCompressedImagesData> = null;
    public compressedImagesList: IReducedGalleryCompressedImages = null;
    public photographyTypeDescription: string;

    public url: string;

    public bigGalleryIsHide: boolean = true;

    public mediumLinkContainerAnimationStates: string[] = [];
    public bigLinkContainerAnimationStates: string[] = [];

    public mediumLinkContainerAnimationDisplayValues: string[] = [];
    public bigLinkContainerAnimationDisplayValues: string[] = [];

    public flatMediumCompressedImagesList: IClientCompressedImage[];
    public flatBigCompressedImagesList: IClientCompressedImage[];

    public sendOrderFormAnimationState: string = 'hide';

    public additionalImagesExists: boolean = false;

    public isToggleBigGallery: boolean = false;

    public scrollPageBottomIsFinished: boolean = false;

    ngOnInit (): void {
        this.router.events.subscribe(evt => {
            if ( !(evt instanceof NavigationEnd) ) return;
            else this.url = evt.url;
            
            if ( this.url.startsWith('/gallery') ) window.location.reload();
        });

        this.appService.getTranslations([ 'PAGETITLES.GALLERY', `IMAGEPHOTOGRAPHYTYPESFULLTEXT.${ this.photographyType.toUpperCase() }`], true).subscribe(translation => {
            this.appService.setTitle(`${ translation[0] } - ${ translation[1] }`);
        });

        this.compressedBigImagesIsExistsObservable = this.clientService.checkCompressedBigImagesIsExists(this.photographyType).pipe(map(result => {
            this.compressedBigImagesIsExists = result;

            return result;
        }), catchError(() => {
            this.appService.createErrorModal();

            return of(null);
        }));

        this.getCompressedImagesData('medium');

        this.clientService.scrollPageBottomStatusChange.subscribe(value => {
            if ( value ) {
                if ( this.additionalImagesExists && !this.scrollPageBottomIsFinished ) {
                    this.scrollPageBottomIsFinished = true;

                    this.getCompressedImagesData('medium', this.imageContainerViewRefs.length);
                    this.clientService.setScrollPageBottomStatus(false);
                }
            }
        });
    }

    public getCompressedImagesData (imageViewSize: 'medium' | 'big', currentImagesCount?: number): void {
            if ( !currentImagesCount ) currentImagesCount = 0;

            this.compressedImagesListObservable = this.clientService.getCompressedImagesData(this.photographyType, imageViewSize, currentImagesCount).pipe(map(data => {
                if ( data.compressedImagesRaw.medium.length !== 0 || data.compressedImagesRaw.big.length !== 0 ) {
                    if ( !this.additionalImagesExists ) {
                        this.compressedImagesList = data.compressedImagesRaw;

                        this.isToggleBigGallery = false;
                    } else {
                        this.compressedImagesList.medium.push(...data.compressedImagesRaw.medium);
                        this.compressedImagesList.big.push(...data.compressedImagesRaw.big);
                    }

                    if ( data.compressedImagesRaw.medium.length !== 0 ) {
                        if ( !this.additionalImagesExists ) {
                            this.flatMediumCompressedImagesList = data.compressedImagesRaw.medium.flat();
                        } else {
                            this.flatMediumCompressedImagesList.push(...data.compressedImagesRaw.medium.flat());
                        }

                        this.flatMediumCompressedImagesList.forEach(() => {
                            this.mediumLinkContainerAnimationStates.push('leave');
                            this.mediumLinkContainerAnimationDisplayValues.push('none');
                        });
                    } else if ( data.compressedImagesRaw.big.length !== 0 ) {
                        if ( !this.additionalImagesExists ) {
                            this.flatBigCompressedImagesList = data.compressedImagesRaw.big.flat();
                        } else {
                            this.flatBigCompressedImagesList.push(...data.compressedImagesRaw.big.flat());
                        }

                        this.flatBigCompressedImagesList.forEach(() => {
                            this.bigLinkContainerAnimationStates.push('leave');
                            this.bigLinkContainerAnimationDisplayValues.push('none');
                        });
                    }
                }

                this.photographyTypeDescription = data.photographyTypeDescription ? data.photographyTypeDescription : null;

                this.additionalImagesExists = data.additionalImagesExists;

                this.scrollPageBottomIsFinished = false;

                return data;
            }), catchError(() => {
                this.appService.createErrorModal();

                return of(null);
            }));


    }

    public toggleBigGallery (): void { debugger;
        if ( this.bigGalleryIsHide ) {
            this.getCompressedImagesData('big');

            this.bigGalleryIsHide = false;
        } else {
            this.getCompressedImagesData('medium');

            this.bigGalleryIsHide = true;
        }

        this.isToggleBigGallery = true;

        if ( this.additionalImagesExists ) this.additionalImagesExists = !this.additionalImagesExists;
    }

    public orderTypeValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        const clientOrderTypes: string[] = [ 'consultation', 'full' ];

        if ( !clientOrderTypes.includes(control.value) ) {
            return { 'orderType': true };
        }

        return null;
    }

    public sendOrder (): void {
        this.clientService.sendOrder(this.photographyType, this.sendOrderForm.value);

        this.sendOrderForm.reset();
        this.changeSendOrderFormAnimationState();
    }

    public setCurrentLinkContainerAnimationStateIndex (name: string, viewSizeType: string): number { 
        if ( viewSizeType === 'medium' ) return this.flatMediumCompressedImagesList.findIndex(compressedImageData => compressedImageData.name === name);
        if ( viewSizeType === 'big' ) return this.flatBigCompressedImagesList.findIndex(compressedImageData => compressedImageData.name === name);
    }

    public startLinkContainerAnimation (index: number, viewSizeType: string): void {
        switch ( viewSizeType ) {
            case 'medium': { 
                this.mediumLinkContainerAnimationStates[index] = this.mediumLinkContainerAnimationStates[index] === 'leave' ? 'enter' : 'leave';
                
                break;
            }

            case 'big': { 
                this.bigLinkContainerAnimationStates[index] = this.bigLinkContainerAnimationStates[index] === 'leave' ? 'enter' : 'leave';
                
                break;
            }
        }
    }

    public linkContainerAnimationStarted (event: AnimationEvent, index: number, viewSizeType: string): void {
        if ( event.toState === 'enter' ) switch ( viewSizeType ) {
            case 'medium': { this.mediumLinkContainerAnimationDisplayValues[index] = 'block'; break; }
            case 'big': { this.bigLinkContainerAnimationDisplayValues[index] = 'block'; break; }
        }
    }

    public linkContainerAnimationDone (event: AnimationEvent, index: number, viewSizeType: string): void {
        if ( event.toState === 'leave' ) switch ( viewSizeType ) {
            case 'medium': { this.mediumLinkContainerAnimationDisplayValues[index] = 'none'; break; }
            case 'big': { this.bigLinkContainerAnimationDisplayValues[index] = 'none'; break; }
        }
    }

    public changeSendOrderFormAnimationState (): void {
        this.sendOrderFormAnimationState = this.sendOrderFormAnimationState === 'hide' ? 'show' : 'hide';
    }

    public sendOrderFormAnimationStarted (event: AnimationEvent): void {
        if ( event.toState === 'show' ) this.componentClass = 'pointerEventsNone';
    }

    public sendOrderFormAnimationDone (event: AnimationEvent): void {
        if ( event.toState === 'hide' ) {
            this.componentClass = '';

            this.sendOrderForm.reset();

            this.sendOrderFormContainerViewRef.nativeElement.classList.remove('position-relative');
            this.sendOrderFormContainerViewRef.nativeElement.classList.add('position-absolute');
        }

        if ( event.toState === 'show' ) {
            this.sendOrderFormContainerViewRef.nativeElement.classList.remove('position-absolute');
            this.sendOrderFormContainerViewRef.nativeElement.classList.add('position-relative');
        }
    }
}