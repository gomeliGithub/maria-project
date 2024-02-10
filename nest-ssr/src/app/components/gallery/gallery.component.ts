import { Component, ElementRef, HostBinding, OnInit, QueryList, ViewChild } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { OwlOptions, SlidesOutputData } from 'ngx-owl-carousel-o';

import { AppService } from '../../../app/app.service';
import { ClientService } from '../../services/client/client.service';

import { environment } from '../../../environments/environment';

import { AnimationEvent } from 'types/global';
import { IClientCompressedImage } from 'types/models';

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
        ]),
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

        if ( !environment.photographyTypes.includes(this.photographyType) ) this.router.navigate(['**'], { skipLocationChange: true });

        this.sendOrderForm = new FormGroup({
            'orderType': new FormControl("", [ Validators.required, this.orderTypeValidator ]),
            'clientPhoneNumber': new FormControl("", [ Validators.required, Validators.pattern(/(?:\+|\d)[\d\-\(\) ]{9,}\d/g) ]),
            'comment': new FormControl("", Validators.maxLength(30))
        });
    }
    
    public activeClientType: string;

    public sendOrderForm: FormGroup<{
        orderType: FormControl<string>,
        clientPhoneNumber: FormControl<string>,
        comment: FormControl<string>
    }>;

    @HostBinding('className') componentClass: string;

    public imageContainerViewRefs: QueryList<ElementRef<HTMLDivElement>>;

    @ViewChild('sendOrderFormContainer', { static: false }) private readonly sendOrderFormContainerViewRef: ElementRef<HTMLDivElement>;

    public compressedImagesList: IClientCompressedImage[] = null; // public compressedImagesList: IClientCompressedImage[][] = null;
    public compressedImagesListType: string = null;

    public photographyTypeDescription: string;

    public url: string;

    public linkContainerAnimationStates: string[] = [];
    public linkContainerAnimationDisplayValues: string[] = [];

    // public flatCompressedImagesList: IClientCompressedImage[];

    public sendOrderFormAnimationState: string = 'hide';

    public additionalImagesExists: boolean = false;
    public currentAdditionalImagesExists: boolean = false;

    public scrollPageBottomIsFinished: boolean = false;

    public galleryImagesCarouselOptions: OwlOptions = {
        loop: true,
        center: true,
        mouseDrag: false,
        touchDrag: false,
        pullDrag: false,
        margin: 10,
        mergeFit: true,
        lazyLoad: true,
        lazyLoadEager: 8,
        dots: false,
        nav: true,
        navText: [
            '<i class="bi bi-caret-left"></i>',
            '<i class="bi bi-caret-right"></i>'
        ],
        autoplay: true,
        autoplayTimeout: 4000,
        responsive: {
            0: {
                items: 2
            },
            400: {
                items: 2
            },
            740: {
                items: 2
            },
            1240: {
                items: 4
            }
        }
    }

    ngOnInit (): void {
        this.router.events.subscribe(evt => {
            if ( !( evt instanceof NavigationEnd ) ) return;
            else this.url = evt.url;
            
            if ( this.url.startsWith('/gallery') ) this.appService.reloadComponent(true);
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

        this.getCompressedImagesData('vertical');

        if ( this.appService.checkIsPlatformBrowser() ) {
            this.clientService.getActiveClient().subscribe({
                next: activeClientData => this.activeClientType = activeClientData ? activeClientData.type : null,
                error: () => this.appService.createErrorModal()
            });
        }

        this.clientService.galleryImageContainerViewRefsChange.subscribe(value => this.imageContainerViewRefs = value);

        this.clientService.scrollPageBottomStatusChange.subscribe(value => {
            if ( value ) {
                if ( this.additionalImagesExists && !this.scrollPageBottomIsFinished ) {
                    this.scrollPageBottomIsFinished = true;

                    this.clientService.setScrollPageBottomStatus(false);
                }
            }
        });
    }

    public changeActiveCarouselItems (event: SlidesOutputData): void {
        if ( this.additionalImagesExists ) {
            this.getCompressedImagesData('vertical', this.compressedImagesList.length);
        }

        event;
    }

    public getCompressedImagesData (imageViewSize: 'horizontal' | 'vertical', currentImagesCount?: number): void {
        this.compressedImagesListType = imageViewSize;

        if ( this.additionalImagesExists ) this.currentAdditionalImagesExists = true;
        else this.currentAdditionalImagesExists = false;

        if ( !currentImagesCount ) currentImagesCount = 0;

        this.clientService.getCompressedImagesData(this.photographyType, imageViewSize, currentImagesCount).subscribe({
            next: data => {
                if ( data.compressedImagesRaw.length !== 0 ) {
                    if ( !this.currentAdditionalImagesExists ) {
                        this.compressedImagesList = data.compressedImagesRaw;

                        if ( data.compressedImagesRaw.length < 5 ) {
                            this.galleryImagesCarouselOptions = { ...this.galleryImagesCarouselOptions, nav: false, center: false, loop: false, autoplay: false }

                            for ( let i = 0; i < 5 - data.compressedImagesRaw.length; i++ ) {
                                this.compressedImagesList.push({ ...this.compressedImagesList[0], description: 'empty_image' });
                            }
                        }
                    } else {
                        this.compressedImagesList.push(...data.compressedImagesRaw);
                    }
        
                    if ( data.compressedImagesRaw.length !== 0 ) {
                        // if ( !this.currentAdditionalImagesExists ) this.compressedImagesList = data.compressedImagesRaw.flat(); // this.flatCompressedImagesList = data.compressedImagesRaw.flat();
                        // else this.compressedImagesList.push(...data.compressedImagesRaw.flat()); // else this.flatCompressedImagesList.push(...data.compressedImagesRaw.flat());
        
                        this.compressedImagesList.forEach(() => { // this.flatCompressedImagesList.forEach(() => {
                            this.linkContainerAnimationStates.push('leave');
                            this.linkContainerAnimationDisplayValues.push('none');
                        });
                    }
                }
        
                this.photographyTypeDescription = data.photographyTypeDescription ? data.photographyTypeDescription : null;
        
                this.additionalImagesExists = data.additionalImagesExists;
        
                this.scrollPageBottomIsFinished = false;
            },
            error: () => this.appService.createErrorModal()
        });
    }

    public orderTypeValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        const clientOrderTypes: string[] = [ 'consultation', 'full' ];

        if ( !clientOrderTypes.includes(control.value) ) {
            return { 'orderType': true };
        }

        return null;
    }

    public getDownloadingOriginalImageName (response: HttpResponse<Blob>) {
        const contentDisposition: string = response.headers.get('content-disposition');
        const imageName: string = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();

        return decodeURIComponent(imageName);
    }

    public downloadOriginalImage (compressedImageName: string): void {
        this.clientService.downloadOriginalImage(compressedImageName).subscribe({
            next: ( response: HttpResponse<Blob> ) => {
                const imageName: string = this.getDownloadingOriginalImageName(response)
                const binaryData: Blob[] = [];

                binaryData.push(response.body);
                
                const downloadLink: HTMLAnchorElement = document.createElement('a');
                
                downloadLink.href = window.URL.createObjectURL(new Blob(binaryData, { type: 'blob' }));
                downloadLink.setAttribute('download', imageName);
                document.body.appendChild(downloadLink);
                downloadLink.click();
            },
            error: () => this.appService.createErrorModal()
        });
    }

    public sendOrder (): void {
        this.clientService.sendOrder(this.photographyType, this.sendOrderForm.value);

        this.sendOrderForm.reset();
        this.changeSendOrderFormAnimationState();
    }

    public setCurrentLinkContainerAnimationStateIndex (name: string): number { 
        return this.compressedImagesList.findIndex(compressedImageData => compressedImageData.name === name); // return this.flatCompressedImagesList.findIndex(compressedImageData => compressedImageData.name === name);
    }

    public startLinkContainerAnimation (index: number): void {
        this.linkContainerAnimationStates[index] = this.linkContainerAnimationStates[index] === 'leave' ? 'enter' : 'leave';
    }

    public linkContainerAnimationStarted (event: AnimationEvent, index: number): void {
        if ( event.toState === 'enter' ) this.linkContainerAnimationDisplayValues[index] = 'block';
    }

    public linkContainerAnimationDone (event: AnimationEvent, index: number): void {
        if ( event.toState === 'leave' ) this.linkContainerAnimationDisplayValues[index] = 'none';
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