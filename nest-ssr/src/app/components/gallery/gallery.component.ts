import { Component, ElementRef, HostBinding, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { AppService } from '../../../app/app.service';
import { ClientService } from '../../services/client/client.service';

import { AnimationEvent, IReducedGalleryCompressedImages } from 'types/global';
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
                transform: 'translate(-400%, -50%) rotate3d(1, 1, 1, 90deg)'
            })),
            state('show', style({
                transform: 'translate(-50%, -50%) rotate3d(0, 0, 0, 0)'
            })),
            transition('hide => show', [
                animate('0.5s 300ms ease-in', style({ transform: 'translate(-50%,-50%) rotate3d(0, 0, 0, 0)' }))
            ]),
            transition('show => hide', [
                animate('0.2s', style({ transform: 'translate(-400%, -50%) rotate3d(1, 1, 1, 90deg)' }))
            ])
        ]),
        trigger('images-animation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translate(0, 50%) rotate3d(1, 1, 1, 180deg)' }),
                animate('800ms ease', style({ opacity: 1, transform: 'translate(0, 0) rotate3d(0, 0, 0, 0)' }))
            ]),
            transition(':leave', [
                style({ opacity: 1, transform: 'translate(0, 0) rotate3d(0, 0, 0, 0)' }),
                animate('800ms ease', style({ opacity: 0, transform: 'translate(0, -50%) rotate3d(1, 1, 1, 180deg)' }))
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
            'clientPhoneNumber': new FormControl("", [ Validators.required, Validators.pattern(/(?:\+|\d)[\d\-\(\) ]{9,}\d/) ]),
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

    public compressedBigImagesIsExists: boolean = false;
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

    ngOnInit (): void {
        this.router.events.subscribe(evt => {
            if ( !(evt instanceof NavigationEnd) ) return;
            else this.url = evt.url;
            
            if ( this.url.startsWith('/gallery') ) window.location.reload();
        });

        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations([ 'PAGETITLES.GALLERY', `IMAGEPHOTOGRAPHYTYPESFULLTEXT.${ this.photographyType.toUpperCase() }`], true).subscribe({
                next: translation => this.appService.setTitle(`${ translation[0] } - ${ translation[1] }`),
                error: () => this.appService.createErrorModal()
            });

            this.clientService.checkCompressedBigImagesIsExists(this.photographyType).subscribe({
                next: result => this.compressedBigImagesIsExists = result,
                error: () => this.appService.createErrorModal()
            });

            sessionStorage.clear();

            this.getCompressedImagesList('medium');

            this.clientService.scrollPageBottomStatusChange.subscribe(value => {
                if ( value ) {
                    if ( this.additionalImagesExists ) {
                        this.getCompressedImagesList('medium', this.imageContainerViewRefs.length);
                        this.clientService.setScrollPageBottomStatus(false);
                    }
                }
            });
        }
    }

    public getCompressedImagesList (imageViewSize: 'medium' | 'big', currentImagesCount?: number): void {
        const compressedImagesListMedium: IClientCompressedImage[][] = (JSON.parse(sessionStorage.getItem('compressedImagesListMedium')) as IClientCompressedImage[][]);
        const compressedImagesListBig: IClientCompressedImage[][] = (JSON.parse(sessionStorage.getItem('compressedImagesListBig')) as IClientCompressedImage[][]);

        if ( !this.additionalImagesExists ) {
            if ( !currentImagesCount ) currentImagesCount = 0;

            if ( imageViewSize === 'medium' && compressedImagesListMedium ) {
                this.isToggleBigGallery = true;

                this.compressedImagesList.big = [];
                this.compressedImagesList.medium = compressedImagesListMedium.slice(currentImagesCount, 8 / 4) ?? [];

                this.additionalImagesExists = compressedImagesListMedium.length > this.compressedImagesList.medium.length;
            } else if ( imageViewSize === 'big' && compressedImagesListBig ) {
                this.isToggleBigGallery = true;
                
                this.compressedImagesList.medium = [];
                this.compressedImagesList.big = compressedImagesListBig.slice(currentImagesCount, 8 / 8) ?? [];

                this.additionalImagesExists = compressedImagesListBig.length > this.compressedImagesList.big.length;
            }
        }

        if ( this.additionalImagesExists || ( !compressedImagesListMedium || !compressedImagesListBig ) ) {
            if ( !currentImagesCount ) currentImagesCount = 0;

            this.clientService.getCompressedImagesList(this.photographyType, imageViewSize, currentImagesCount).subscribe({
                next: data => {
                    if ( data.compressedImages.medium.length !== 0 || data.compressedImages.big.length !== 0 ) {
                        if ( !this.additionalImagesExists ) {
                            this.compressedImagesList = data.compressedImages;

                            this.isToggleBigGallery = false;
                        } else {
                            this.compressedImagesList.medium.push(...data.compressedImages.medium);
                            this.compressedImagesList.big.push(...data.compressedImages.big);
                        }

                        if ( data.compressedImages.medium.length !== 0 ) {
                            if ( !this.additionalImagesExists ) {
                                sessionStorage.setItem('compressedImagesListMedium', JSON.stringify(data.compressedImages.medium));
                                this.flatMediumCompressedImagesList = data.compressedImages.medium.flat();
                            } else {
                                const updatedCompressedImagesListMedium: IClientCompressedImage[][] = (JSON.parse(sessionStorage.getItem('compressedImagesListMedium')));

                                updatedCompressedImagesListMedium.push(...data.compressedImages.medium);
                                
                                sessionStorage.setItem('compressedImagesListMedium', JSON.stringify(updatedCompressedImagesListMedium));
                                this.flatMediumCompressedImagesList.push(...data.compressedImages.medium.flat());
                            }

                            this.flatMediumCompressedImagesList.forEach(() => {
                                this.mediumLinkContainerAnimationStates.push('leave');
                                this.mediumLinkContainerAnimationDisplayValues.push('none');
                            });
                        } else if ( data.compressedImages.big.length !== 0 ) {
                            if ( !this.additionalImagesExists ) {
                                sessionStorage.setItem('compressedImagesListBig', JSON.stringify(data.compressedImages.big));
                                this.flatBigCompressedImagesList = data.compressedImages.big.flat();
                            } else {
                                const updatedCompressedImagesListBig: IClientCompressedImage[][] = (JSON.parse(sessionStorage.getItem('compressedImagesListBig')));

                                updatedCompressedImagesListBig.push(...data.compressedImages.big);

                                sessionStorage.setItem('compressedImagesListBig', JSON.stringify(updatedCompressedImagesListBig));
                                this.flatBigCompressedImagesList.push(...data.compressedImages.big.flat());
                            }

                            this.flatBigCompressedImagesList.forEach(() => {
                                this.bigLinkContainerAnimationStates.push('leave');
                                this.bigLinkContainerAnimationDisplayValues.push('none');
                            });
                        }
                    }

                    this.photographyTypeDescription = data.photographyTypeDescription ? data.photographyTypeDescription : null;

                    this.additionalImagesExists = data.additionalImagesExists;
                },
                error: () => this.appService.createErrorModal()
            });
        }
    }

    public toggleBigGallery (): void {
        if ( this.bigGalleryIsHide ) {
            this.getCompressedImagesList('big');

            this.bigGalleryIsHide = false;
        } else {
            this.getCompressedImagesList('medium');

            this.bigGalleryIsHide = true;
        }

        this._componentRef.nativeElement.scroll({ top: 0, left: 0, behavior: 'smooth' });

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
        }
    }
}