import { Component, ElementRef, HostBinding, OnInit, QueryList, TransferState, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';

import { AppService } from '../../../app/app.service';
import { ClientService } from '../../services/client/client.service';

import { AnimationEvent, IGalleryCompressedImagesData, IReducedGalleryCompressedImages } from 'types/global';
import { IClientCompressedImage } from 'types/models';

// const GALLERY_COMPRESSEDIMAGESDATA_STATE_KEY = makeStateKey<IGalleryCompressedImagesData>('galleryCompressedImagesData');

@Component({
    selector: 'app-gallery',
    templateUrl: './gallery.component.html',
    styleUrls: ['./gallery.component.css'],
    animations: [
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
        ])
    ]
})
export class GalleryComponent implements OnInit {
    public photographyType: string;

    public componentElementIsRendered: boolean = false;

    constructor (
        private readonly activateRoute: ActivatedRoute,
        private readonly router: Router,
        private readonly transferState: TransferState,

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

    public imageContainerViewRefs: QueryList<ElementRef<HTMLDivElement>>;

    @ViewChild('sendOrderFormContainer', { static: false }) private readonly sendOrderFormContainerViewRef: ElementRef<HTMLDivElement>;

    public compressedBigImagesIsExistsObservable: Observable<boolean>;
    public compressedBigImagesIsExists: boolean = false;
    public compressedImagesListObservable: Observable<IGalleryCompressedImagesData> = null;
    public compressedImagesList: IReducedGalleryCompressedImages = null;
    public compressedImagesListType: string = null;
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
    public currentAdditionalImagesExists: boolean = false;

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

            let photographyTypeMetaKeyword: string = null;

            switch ( this.photographyType ) {
                case 'children': { photographyTypeMetaKeyword = 'детский фотограф'; break; }
                case 'family': { photographyTypeMetaKeyword = 'семейный фотограф, фотосессия пары'; break; }
                case 'individual': { photographyTypeMetaKeyword = 'индивидуальный фотограф'; break; }
                case 'wedding': { photographyTypeMetaKeyword = 'свадебный фотограф'; break; }
            }

            const keywordsMetaNameTag: HTMLMetaElement = this.appService.getMetaNameTag('keywords');
            const keywordsMetaNameTagContent: string = keywordsMetaNameTag.getAttribute('content');

            keywordsMetaNameTag.setAttribute('content', `${ keywordsMetaNameTagContent }, ${ photographyTypeMetaKeyword }`);
        });

        this.compressedBigImagesIsExistsObservable = this.clientService.checkCompressedBigImagesIsExists(this.photographyType).pipe(map(result => {
            this.compressedBigImagesIsExists = result;

            return result;
        }), catchError(() => {
            this.appService.createErrorModal();

            return of(null);
        }));

        this.getCompressedImagesData('medium');

        this.clientService.galleryImageContainerViewRefsChange.subscribe(value => this.imageContainerViewRefs = value);

        this.clientService.scrollPageBottomStatusChange.subscribe(value => {
            if ( value ) {
                if ( this.additionalImagesExists && !this.scrollPageBottomIsFinished ) {
                    this.scrollPageBottomIsFinished = true;

                    this.getCompressedImagesData(this.bigGalleryIsHide ? 'medium' : 'big', this.imageContainerViewRefs.length);
                    this.clientService.setScrollPageBottomStatus(false);
                }
            }
        });
    }

    public getCompressedImagesData (imageViewSize: 'medium' | 'big', currentImagesCount?: number): void {
        this.compressedImagesListType = imageViewSize;

        if ( this.additionalImagesExists ) this.currentAdditionalImagesExists = true;
        else this.currentAdditionalImagesExists = false;

        if ( !currentImagesCount ) currentImagesCount = 0;

        // let storedData = this.transferState.get<IGalleryCompressedImagesData>(GALLERY_COMPRESSEDIMAGESDATA_STATE_KEY, null); console.log(storedData);
        
        if ( !this.currentAdditionalImagesExists ) {
            this.compressedImagesListObservable = this.clientService.getCompressedImagesData(this.photographyType, imageViewSize, currentImagesCount).pipe(map(data => {
                /* if ( !storedData || ( storedData && (
                    ( imageViewSize === 'medium' && ( storedData.compressedImagesRaw.medium.length === 0 || !storedData.compressedImagesRaw.medium[currentImagesCount / 4] ) ) 
                    || ( imageViewSize === 'big' && ( storedData.compressedImagesRaw.big.length === 0 || !storedData.compressedImagesRaw.big[currentImagesCount / 4] ) )
                ))) {
                    if ( !storedData ) {
                        storedData = {
                            additionalImagesExists: data.additionalImagesExists,
                            compressedImagesRaw: {
                                medium: null,
                                big: null
                            },
                            photographyTypeDescription: data.photographyTypeDescription
                        }
                    }

                    const updatedData = storedData;

                    if ( !updatedData.compressedImagesRaw.medium || updatedData.compressedImagesRaw.medium.length === 0 ) {
                        updatedData.compressedImagesRaw.medium = data.compressedImagesRaw.medium;
                    } else {
                        updatedData.compressedImagesRaw.medium.push(...data.compressedImagesRaw.medium)
                    }

                    if ( !updatedData.compressedImagesRaw.big || updatedData.compressedImagesRaw.big.length === 0 ) {
                        updatedData.compressedImagesRaw.big = data.compressedImagesRaw.big;
                    } else {
                        updatedData.compressedImagesRaw.big.push(...data.compressedImagesRaw.big)
                    }

                    this.transferState.set<IGalleryCompressedImagesData>(GALLERY_COMPRESSEDIMAGESDATA_STATE_KEY, updatedData);
                    
                    this._setCompressedImagesList(data, currentImagesCount / 4, this.currentAdditionalImagesExists, false);
                } else */
                this._setCompressedImagesList(data, currentImagesCount / 4, this.currentAdditionalImagesExists, true);
                // this._setCompressedImagesList(storedData, currentImagesCount / 4, this.currentAdditionalImagesExists, true);

                return data;
            }), catchError(() => {
                this.appService.createErrorModal();

                return of(null);
            }));
        } else {
            /* if ( storedData && ( 
                ( storedData.compressedImagesRaw.medium.length !== 0 && storedData.compressedImagesRaw.medium[currentImagesCount / 4] ) 
                || ( storedData.compressedImagesRaw.big.length === 0 && storedData.compressedImagesRaw.big[currentImagesCount / 4] )
            )) {
                this._setCompressedImagesList(storedData, currentImagesCount / 4, this.currentAdditionalImagesExists, true);
            } else */
            this.clientService.getCompressedImagesData(this.photographyType, imageViewSize, currentImagesCount).subscribe({
                next: data => {
                    /* const updatedData = storedData;

                    if ( !updatedData.compressedImagesRaw.medium || updatedData.compressedImagesRaw.medium.length === 0 ) {
                        updatedData.compressedImagesRaw.medium = data.compressedImagesRaw.medium;
                    } else {
                        updatedData.compressedImagesRaw.medium.push(...data.compressedImagesRaw.medium)
                    }
        
                    if ( !updatedData.compressedImagesRaw.big || updatedData.compressedImagesRaw.big.length === 0 ) {
                        updatedData.compressedImagesRaw.big = data.compressedImagesRaw.big;
                    } else {
                        updatedData.compressedImagesRaw.big.push(...data.compressedImagesRaw.big)
                    }
        
                    this.transferState.set<IGalleryCompressedImagesData>(GALLERY_COMPRESSEDIMAGESDATA_STATE_KEY, updatedData);
        
                    this.scrollPageBottomIsFinished = false; */

                    this._setCompressedImagesList(data, currentImagesCount / 4, this.currentAdditionalImagesExists, false);
                },
                error: () => this.appService.createErrorModal()
            });
        }
    }

    private _setCompressedImagesList (data: IGalleryCompressedImagesData, currentImagesCount: number, currentAdditionalImagesExists: boolean, transferStateKeyIsExists: boolean): void {
        transferStateKeyIsExists
        
        if ( data.compressedImagesRaw.medium.length !== 0 || data.compressedImagesRaw.big.length !== 0 ) {
            if ( !currentAdditionalImagesExists ) {
                this.compressedImagesList = data.compressedImagesRaw;
            } else {
                this.compressedImagesList.medium.push(...data.compressedImagesRaw.medium);
                this.compressedImagesList.big.push(...data.compressedImagesRaw.big);
            }
            /* else {
                const additionalData: IReducedGalleryCompressedImages = data.compressedImagesRaw;

                if ( transferStateKeyIsExists ) {
                    additionalData.medium = data.compressedImagesRaw.medium.slice(currentImagesCount, 2);
                    additionalData.big = data.compressedImagesRaw.big.slice(currentImagesCount, 2);
                }

                let test = false;
                let test2 = false;

                this.compressedImagesList.medium.forEach(value => value.find(value => additionalData.medium.forEach(sss => sss.forEach(s => test = s.name === value.name))));
                this.compressedImagesList.big.forEach(value => value.find(value => additionalData.big.forEach(sss => sss.forEach(s => test2 = s.name === value.name))));

                if ( !test ) this.compressedImagesList.medium.push(...additionalData.medium);
                if ( !test2 ) this.compressedImagesList.big.push(...additionalData.big);
            } */
            

            this.isToggleBigGallery = false;

            this.TESTAAAA = data.compressedImagesRaw;

            if ( data.compressedImagesRaw.medium.length !== 0 ) {
                if ( !currentAdditionalImagesExists ) this.flatMediumCompressedImagesList = data.compressedImagesRaw.medium.flat();
                else this.flatMediumCompressedImagesList.push(...data.compressedImagesRaw.medium.flat());

                this.flatMediumCompressedImagesList.forEach(() => {
                    this.mediumLinkContainerAnimationStates.push('leave');
                    this.mediumLinkContainerAnimationDisplayValues.push('none');
                });
            } else if ( data.compressedImagesRaw.big.length !== 0 ) {
                if ( !currentAdditionalImagesExists ) this.flatBigCompressedImagesList = data.compressedImagesRaw.big.flat();
                else this.flatBigCompressedImagesList.push(...data.compressedImagesRaw.big.flat());

                this.flatBigCompressedImagesList.forEach(() => {
                    this.bigLinkContainerAnimationStates.push('leave');
                    this.bigLinkContainerAnimationDisplayValues.push('none');
                });
            }
        }

        this.photographyTypeDescription = data.photographyTypeDescription ? data.photographyTypeDescription : null;

        this.additionalImagesExists = data.additionalImagesExists;

        this.scrollPageBottomIsFinished = false;
    }

    public TESTAAAA = null;

    public toggleBigGallery (): void {
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