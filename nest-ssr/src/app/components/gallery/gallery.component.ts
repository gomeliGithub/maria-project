import { Component, ComponentRef, HostBinding, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { ModalComponent } from '../modal/modal.component';

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
                transform: 'translate(-50%, 50%)'
            })),
            state('enter', style({
                opacity: 1,
                transform: 'translate(-50%, -120%)' 
            })),
            transition('leave => enter', [
                animate('200ms', style({ opacity: 1, transform: 'translate(-50%, -120%)' }))
            ]),
            transition('enter => leave', [
                animate('200ms', style({ opacity: 0, transform: 'translate(-50%, 50%)' }))
            ])
        ]),
        trigger('send-order-form-animation', [
            state('hide', style({
                transform: 'translate(-400%, -50%) rotate3d(1, 1, 1, 90deg)'
            })),
            state('show', style({
                transform: 'translate(-50%,-50%) rotate3d(0, 0, 0, 0)'
            })),
            transition('hide => show', [
                animate('0.5s 300ms ease-in', style({ transform: 'translate(-50%,-50%) rotate3d(0, 0, 0, 0)' }))
            ]),
            transition('show => hide', [
                animate('0.2s', style({ transform: 'translate(-400%, -50%) rotate3d(1, 1, 1, 90deg)' }))
            ])
        ])
    ]
})
export class GalleryComponent implements OnInit {
    public photographyType: string;

    constructor (
        private readonly activateRoute: ActivatedRoute,
        private readonly router: Router,

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

    public sendOrderForm: FormGroup<{
        orderType: FormControl<string>,
        clientPhoneNumber: FormControl<string>,
        comment: FormControl<string>
    }>;

    @ViewChild(ModalComponent) modalComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    @HostBinding('className') componentClass: string;

    public compressedImagesList: IReducedGalleryCompressedImages;
    public photographyTypeDescription: string;

    public url: string;

    public smallLinkContainerAnimationStates: string[] = [];
    public mediumLinkContainerAnimationStates: string[] = [];
    public bigLinkContainerAnimationStates: string[] = [];

    public smallLinkContainerAnimationDisplayValues: string[] = [];
    public mediumLinkContainerAnimationDisplayValues: string[] = [];
    public bigLinkContainerAnimationDisplayValues: string[] = [];

    public flatSmallCompressedImagesList: IClientCompressedImage[];
    public flatMediumCompressedImagesList: IClientCompressedImage[];
    public flatBigCompressedImagesList: IClientCompressedImage[];

    public sendOrderFormAnimationState: string = 'hide';

    ngOnInit (): void {
        this.router.events.subscribe(evt => {
            if ( !(evt instanceof NavigationEnd) ) return;
            else this.url = evt.url;
            
            if ( this.url.startsWith('/gallery') ) window.location.reload();
        });

        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations([ 'PAGETITLES.GALLERY', `IMAGEPHOTOGRAPHYTYPESFULLTEXT.${ this.photographyType.toUpperCase() }`], true).subscribe({
                next: translation => this.appService.setTitle(`${ translation[0] } - ${ translation[1] }`),
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });

            import('bootstrap').then(bootstrap => {
                const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
            });

            this.clientService.getCompressedImagesList(this.photographyType).subscribe({
                next: data => {
                    if ( data.compressedImages.small.length === 0 && data.compressedImages.medium.length === 0 && data.compressedImages.big.length === 0) {
                        this.compressedImagesList = null;
                    } else {
                        this.compressedImagesList = data.compressedImages;

                        if ( data.compressedImages.small.length !== 0 ) {
                            this.flatSmallCompressedImagesList = data.compressedImages.small.flat();
                            this.flatSmallCompressedImagesList.forEach(() => {
                                this.smallLinkContainerAnimationStates.push('leave');
                                this.smallLinkContainerAnimationDisplayValues.push('none');
                            });
                        }

                        if ( data.compressedImages.medium.length !== 0 ) {
                            this.flatMediumCompressedImagesList = data.compressedImages.medium.flat();
                            this.flatMediumCompressedImagesList.forEach(() => {
                                this.mediumLinkContainerAnimationStates.push('leave');
                                this.mediumLinkContainerAnimationDisplayValues.push('none');
                            });
                        }

                        if ( data.compressedImages.big.length !== 0 ) {
                            this.flatBigCompressedImagesList = data.compressedImages.big.flat();
                            this.flatBigCompressedImagesList.forEach(() => {
                                this.bigLinkContainerAnimationStates.push('leave');
                                this.bigLinkContainerAnimationDisplayValues.push('none');
                            });
                        }
                    }

                    this.photographyTypeDescription = data.photographyTypeDescription ? data.photographyTypeDescription : null;
                },
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });
        }
    }

    public orderTypeValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        const clientOrderTypes: string[] = [ 'consultation', 'full' ];

        if ( !clientOrderTypes.includes(control.value) ) {
            return { 'orderType': true };
        }

        return null;
    }

    public sendOrder (): void {
        this.clientService.sendOrder(this.photographyType, this.sendOrderForm.value, this.modalViewRef, this.modalComponentRef);

        this.sendOrderForm.reset();
        this.changeSendOrderFormAnimationState();
    }

    public setCurrentLinkContainerAnimationStateIndex (name: string, viewSizeType: string): number { 
        if ( viewSizeType === 'small' ) return this.flatSmallCompressedImagesList.findIndex(compressedImageData => compressedImageData.name === name);
        if ( viewSizeType === 'medium' ) return this.flatMediumCompressedImagesList.findIndex(compressedImageData => compressedImageData.name === name);
        if ( viewSizeType === 'big' ) return this.flatBigCompressedImagesList.findIndex(compressedImageData => compressedImageData.name === name);
    }

    public startLinkContainerAnimation (index: number, viewSizeType: string): void {
        switch ( viewSizeType ) {
            case 'small': { 
                this.smallLinkContainerAnimationStates[index] = this.smallLinkContainerAnimationStates[index] === 'leave' ? 'enter' : 'leave';

                break;
            }

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
            case 'small': { this.smallLinkContainerAnimationDisplayValues[index] = 'block'; break; }
            case 'medium': { this.mediumLinkContainerAnimationDisplayValues[index] = 'block'; break; }
            case 'big': { this.bigLinkContainerAnimationDisplayValues[index] = 'block'; break; }
        }
    }

    public linkContainerAnimationDone (event: AnimationEvent, index: number, viewSizeType: string): void {
        if ( event.toState === 'leave' ) switch ( viewSizeType ) {
            case 'small': { this.smallLinkContainerAnimationDisplayValues[index] = 'none'; break; }
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