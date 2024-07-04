import { Component, ElementRef, HostBinding, OnInit, QueryList, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule } from '@ngx-translate/core';

import { CarouselModule, OwlOptions, SlidesOutputData } from 'ngx-owl-carousel-o';

import { AppService } from '../../../app/app.service';
import { ClientService } from '../../services/client/client.service';

import { environment } from '../../../environments/environment';

import { AnimationEvent } from 'types/global';
import { ICompressedImageWithoutRelationFields } from 'types/models';

@Component({
    selector: 'app-gallery',
    standalone: true,
    imports: [ CommonModule, ReactiveFormsModule, NgbModule, CarouselModule, TranslateModule ],
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

    public activeClientType: string | null;

    public sendOrderForm: FormGroup<{
        orderType: FormControl<string | null>,
        clientPhoneNumber: FormControl<string | null>,
        comment: FormControl<string | null>
    }>;

    public imageContainerViewRefs: QueryList<ElementRef<HTMLDivElement>>;

    public compressedImagesList: ICompressedImageWithoutRelationFields[] | null = null; // public compressedImagesList: IClientCompressedImage[][] = null;
    public compressedImagesListType: string | null = null;

    public photographyTypeDescription: string | null;

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

    constructor (
        private readonly _activateRoute: ActivatedRoute,
        private readonly _router: Router,

        private readonly _appService: AppService,
        private readonly _clientService: ClientService
    ) {
        this.photographyType = this._activateRoute.snapshot.paramMap.get('photographyType') as string;

        if ( !( this.photographyType in environment.photographyTypes ) ) this._router.navigate(['**'], { skipLocationChange: true });

        this.sendOrderForm = new FormGroup({
            'orderType': new FormControl("", [ Validators.required, this.orderTypeValidator ]),
            'clientPhoneNumber': new FormControl("", [ Validators.required, Validators.pattern(/(?:\+|\d)[\d\-\(\) ]{9,}\d/g) ]),
            'comment': new FormControl("", Validators.maxLength(30))
        });
    }

    @HostBinding('className') componentClass: string;

    @ViewChild('sendOrderFormContainer', { static: false }) private readonly sendOrderFormContainerViewRef: ElementRef<HTMLDivElement>;

    ngOnInit (): void {
        this._router.events.subscribe(evt => {
            if ( !( evt instanceof NavigationEnd ) ) return;
            else this.url = evt.url;
            
            if ( this.url.startsWith('/gallery') ) window.location.reload();
        });

        this._appService.getTranslations([ 'PAGETITLES.GALLERY', `IMAGEPHOTOGRAPHYTYPESFULLTEXT.${ this.photographyType.toUpperCase() }`], true).subscribe(translation => {
            this._appService.setTitle(`${ translation[0] } - ${ translation[1] }`);

            let photographyTypeMetaKeyword: string = '';

            switch ( this.photographyType ) {
                case 'children': { photographyTypeMetaKeyword = 'детский фотограф'; break; }
                case 'family': { photographyTypeMetaKeyword = 'семейный фотограф, фотосессия пары'; break; }
                case 'individual': { photographyTypeMetaKeyword = 'индивидуальный фотограф'; break; }
                case 'wedding': { photographyTypeMetaKeyword = 'свадебный фотограф'; break; }
            }

            const keywordsMetaNameTag: HTMLMetaElement = this._appService.getMetaNameTag('keywords') as HTMLMetaElement;
            const keywordsMetaNameTagContent: string = keywordsMetaNameTag.getAttribute('content') as string;

            keywordsMetaNameTag.setAttribute('content', `${ keywordsMetaNameTagContent }, ${ photographyTypeMetaKeyword }`);
        });

        this.getCompressedImagesData('vertical');

        if ( this._appService.checkIsPlatformBrowser() ) {
            this._clientService.getActiveClient().subscribe({
                next: activeClientData => this.activeClientType = activeClientData ? activeClientData.type : null,
                error: () => this._appService.createErrorModal()
            });
        }

        this._clientService.galleryImageContainerViewRefsChange.subscribe(value => this.imageContainerViewRefs = value);

        this._clientService.scrollPageBottomStatusChange.subscribe(value => {
            if ( value ) {
                if ( this.additionalImagesExists && !this.scrollPageBottomIsFinished ) {
                    this.scrollPageBottomIsFinished = true;

                    this._clientService.setScrollPageBottomStatus(false);
                }
            }
        });
    }

    public changeActiveCarouselItems (event: SlidesOutputData): void {
        if ( this.additionalImagesExists ) {
            this.getCompressedImagesData('vertical', ( this.compressedImagesList as ICompressedImageWithoutRelationFields[]).length);
        }

        event;
    }

    public getCompressedImagesData (imageViewSize: 'horizontal' | 'vertical', currentImagesCount?: number): void {
        this.compressedImagesListType = imageViewSize;

        if ( this.additionalImagesExists ) this.currentAdditionalImagesExists = true;
        else this.currentAdditionalImagesExists = false;

        if ( !currentImagesCount ) currentImagesCount = 0;

        this._clientService.getCompressedImagesData(this.photographyType, imageViewSize, currentImagesCount).subscribe({
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
                        ( this.compressedImagesList as ICompressedImageWithoutRelationFields[]).push(...data.compressedImagesRaw);
                    }
        
                    if ( data.compressedImagesRaw.length !== 0 ) {
                        // if ( !this.currentAdditionalImagesExists ) this.compressedImagesList = data.compressedImagesRaw.flat(); // this.flatCompressedImagesList = data.compressedImagesRaw.flat();
                        // else this.compressedImagesList.push(...data.compressedImagesRaw.flat()); // else this.flatCompressedImagesList.push(...data.compressedImagesRaw.flat());
        
                        ( this.compressedImagesList as ICompressedImageWithoutRelationFields[]).forEach(() => { // this.flatCompressedImagesList.forEach(() => {
                            this.linkContainerAnimationStates.push('leave');
                            this.linkContainerAnimationDisplayValues.push('none');
                        });
                    }
                }
        
                this.photographyTypeDescription = data.photographyTypeDescription ? data.photographyTypeDescription : null;
        
                this.additionalImagesExists = data.additionalImagesExists;
        
                this.scrollPageBottomIsFinished = false;
            },
            error: () => this._appService.createErrorModal()
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
        const contentDisposition: string = response.headers.get('content-disposition') as string;
        const imageName: string = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();

        return decodeURIComponent(imageName);
    }

    public downloadOriginalImage (compressedImageName: string): void {
        this._clientService.downloadOriginalImage(compressedImageName).subscribe({
            next: ( response: HttpResponse<Blob> ) => {
                const imageName: string = this.getDownloadingOriginalImageName(response)
                const binaryData: Blob[] = [];

                binaryData.push(response.body as Blob);
                
                const downloadLink: HTMLAnchorElement = document.createElement('a');
                
                downloadLink.href = window.URL.createObjectURL(new Blob(binaryData, { type: 'blob' }));
                downloadLink.setAttribute('download', imageName);
                document.body.appendChild(downloadLink);
                downloadLink.click();
            },
            error: () => this._appService.createErrorModal()
        });
    }

    public sendOrder (): void {
        this._clientService.sendOrder(this.photographyType, this.sendOrderForm.value);

        this.sendOrderForm.reset();
        this.changeSendOrderFormAnimationState();
    }

    public setCurrentLinkContainerAnimationStateIndex (name: string): number { 
        return ( this.compressedImagesList as ICompressedImageWithoutRelationFields[] ).findIndex(compressedImageData => compressedImageData.name === name); // return this.flatCompressedImagesList.findIndex(compressedImageData => compressedImageData.name === name);
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