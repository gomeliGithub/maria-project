import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostBinding, Inject, OnInit, PLATFORM_ID, QueryList, ViewChildren } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { Image_display_type, Image_photography_type } from '@prisma/client';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { OffcanvasSearchComponent } from './offcanvas-search/offcanvas-search.component';

import { ImageSizePipe } from '../../pipes/image-size/image-size.pipe';
import { BooleanPipe } from '../../pipes/boolean/boolean.pipe';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';
import { ClientService } from '../../services/client/client.service';
import { WebSocketService } from '../../services/web-socket/web-socket.service';

import { AnimationEvent } from 'types/global';
import { ICompressedImageWithoutRelationFields, IImagePhotographyType } from 'types/models';
import { IGetFullCompressedImagesDataOptions, SortBy_Types } from 'types/options';

@Component({
    selector: 'app-admin-panel',
    standalone: true,
	imports: [ CommonModule, ReactiveFormsModule, NgbModule, ImageSizePipe, BooleanPipe, TranslateModule, OffcanvasSearchComponent ],
    templateUrl: './admin-panel.component.html',
    styleUrls: ['./admin-panel.component.css'],
    animations: [
        trigger('compressed-image-containers-animation', [
            state('leave', style({ opacity: 0, transform: 'rotate(90deg)' })),
            state('enter', style({ opacity: 1, transform: 'rotate(0deg)' })),
            transition('leave => enter', [
                animate('1s ease-in-out', style({ opacity: 1, transform: 'rotate(0deg)' }))
            ]),
            transition('enter => leave', [
                animate('1s ease-in-out', style({ opacity: 0, transform: 'rotate(90deg)' }))
            ])
        ]),
        trigger('compressed-image-containers-delete-animation', [
            transition(':leave', [
                style({ opacity: 1, transform: 'translate3d(0, 0, 0)' }),
                animate('400ms ease-in-out', style({ opacity: 0, transform: 'translate3d(-120%, -120%, 0) rotate(-90deg)' })),
            ])
        ]),
        trigger('compressed-image-data-containers-animation', [
            state('static', style({ opacity: 0 })),
            state('showed', style({ opacity: 1 })),
            transition('static => showed', [
                animate('0.5s ease-in-out', style({ opacity: 1 }))
            ]),
            transition('showed => static', [
                animate('0.5s ease-in-out', style({ opacity: 0 }))
            ])
        ]),
        trigger('image-thumbnail-container-animation', [
            state('true', style({
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)' 
            })),
            state('false', style({
                top: '50%',
                left: '50%',
                transform: 'translate(-230%, -50%)' 
            })),
            transition('false => true', [
                animate('1s ease', style({ transform: 'translate(-50%, -50%)' }))
            ]),
            transition('true => false', [
                animate('0.5s ease', style({ transform: 'translate(-230%, -50%)' }))
            ])
        ])
    ],
    host: { ngSkipHydration: 'true' }
})
export class AdminPanelComponent implements OnInit, AfterViewChecked {
    public isPlatformBrowser: boolean;
    public isPlatformServer: boolean;

    public uploadImageForm: FormGroup<{
        imagePhotographyType: FormControl<string | null>;
        imageDisplayType: FormControl<string | null>;
        image: FormControl<FileList | null>;
        imageDescription: FormControl<string | null>;
    }>;
    public uploadImageAccordionButtonTooltipIsHidden: boolean = false;

    public changeImageDataForm: FormGroup<{
        newImagePhotographyType: FormArray<FormControl<Image_photography_type | null>>;
        newImageDisplayType: FormArray<FormControl<Image_display_type | null>>;
        newImageDescription: FormArray<FormControl<string | null>>;
    }>;

    public changeImageDataFormElementPEIsNone: boolean = true;

    public changeImageDataFormPreviousValues: { [controlName: string]: ( string | null )[] } = {
        newImagePhotographyType: [],
        newImageDisplayType: [],
        newImageDescription: []
    };
    public changeImageDataFormSubmitButtonsHiddenStatus: boolean[] = [];

    public searchImagesForm: FormGroup<{
        dateFrom: FormControl<string | null>;
        dateUntil: FormControl<string | null>;
        photographyTypes: FormArray<FormControl<boolean>>;
        displayTypes: FormArray<FormControl<boolean>>;
        sortBy: FormControl<SortBy_Types>;
    }>;

    public imagePhotographyTypes: Image_photography_type[] = [];
    public imageDisplayTypes: Image_display_type[] = [];
    public sortBy_TypesArr: SortBy_Types[] = (() => {
        const result: SortBy_Types[] = [];

        for ( const data in SortBy_Types ) result.push(data as SortBy_Types);

        return result;
    })();

    public compressedImageContainersAnimationCurrentStates: string[] = [];
    public compressedImageDataContainersAnimationCurrentStates: string[] = [];
    public compressedImagesContainerAnimationIsDone: boolean = false;
    public compressedImageContainersDeleteStatus: boolean[] = [];

    public compressedImageButtonsIsHidden: boolean = true;

    public compressedImageThumbnailUrls: string[] = [];

    public imageThumbnailUrl: string | null;
    public imageThumbnailContainerAnimationState: boolean = false;
    public imageThumbnailContainerIsVisible: boolean = false;

    public requiredImageFileTypes: string[] = [ 'image/jpg', 'image/jpeg', 'image/png' ];

    public imageFile: File | null;

    public fullCompressedImagesList: ICompressedImageWithoutRelationFields[];
    public fullCompressedImagesListCount: number;
    public additionalImagesIsExists: boolean = false;
    public compressedImagesDataIsLoaded: boolean = false;

    public imagePhotographyTypesData: IImagePhotographyType[] | null;

    public currentDateFrom: Date | undefined;
    public currentDateUntil: Date | undefined;
    public currentPhotographyTypes: Image_photography_type[] | undefined = undefined;
    public currentDisplayTypes: Image_display_type[] | undefined = undefined;
    public previousPhotographyTypes: Image_photography_type[] = [];
    public previousDisplayTypes: Image_display_type[] = [];
    public previousPhotographyTypesNotChange: boolean = false;
    public previousDisplayTypesNotChange: boolean = false;

    public deleteImageIsCompleted: boolean = false;

    public currentLoadedImageThumbnailOriginalName: string | null;

    public spinnerHidden: boolean = true;

    constructor (
        @Inject(PLATFORM_ID) private readonly platformId: string,
        @Inject(DOCUMENT) private readonly _document: Document,

        public changeDetectorRef: ChangeDetectorRef,

        private readonly _appService: AppService,
        private readonly _adminPanelService: AdminPanelService,
        private readonly _clientService: ClientService,
        private readonly _webSocketService: WebSocketService
    ) {
        this.isPlatformBrowser = isPlatformBrowser(this.platformId);
        this.isPlatformServer = isPlatformServer(this.platformId);
        
        this.uploadImageForm = new FormGroup({
            'imagePhotographyType': new FormControl("", [ Validators.required, this.imagePhotographyTypeValidator ]),
            'imageDisplayType': new FormControl("", [ Validators.required, this.imageDisplayTypeValidator ]),
            'image': new FormControl([] as unknown as FileList, [ Validators.required, this.imageValidator ]),
            'imageDescription': new FormControl("", Validators.maxLength(20))
        });

        this.changeImageDataForm = new FormGroup({
            'newImagePhotographyType': new FormArray([new FormControl()]),
            'newImageDisplayType': new FormArray([new FormControl()]),
            'newImageDescription': new FormArray([new FormControl()])
        });

        this.searchImagesForm = new FormGroup({
            'dateFrom': new FormControl(null) as FormControl<string | null>,
            'dateUntil': new FormControl(null) as FormControl<string | null>,
            'photographyTypes': new FormArray([new FormControl()]),
            'displayTypes': new FormArray([new FormControl()]),
            'sortBy': new FormControl(SortBy_Types.uploadDate) as FormControl<SortBy_Types>,
        });
    }

    public documentBody: HTMLBodyElement = this._document.getElementsByTagName('body')[0];

    @HostBinding('className') public get componentClassValue (): string {
        return this._webSocketService.componentClass;
    }

    @ViewChildren('imagePhotographyTypeDescription', { read: ElementRef<HTMLInputElement> })
    public imagePhotographyTypeDescriptionViewRefs: QueryList<ElementRef<HTMLInputElement>>;

    ngOnInit (): void {
        if ( this.isPlatformBrowser ) {
            this._appService.getTranslations('PAGETITLES.ADMINPANEL.IMAGESCONTROL', true).subscribe(translation => this._appService.setTitle(translation));

            for ( const data in Image_photography_type ) {
                this.imagePhotographyTypes.push(data as Image_photography_type);
            }
            for ( const data in Image_display_type ) {
                this.imageDisplayTypes.push(data as Image_display_type);
            }

            this.searchImagesForm.controls.photographyTypes = new FormArray(this.imagePhotographyTypes.map(() => new FormControl(false) as FormControl<boolean>));
            this.searchImagesForm.controls.displayTypes = new FormArray(this.imageDisplayTypes.map(() => new FormControl(false) as FormControl<boolean>));

            this.getFullCompressedImagesData(false, { sortBy: this.sortBy_TypesArr[4] });

            this._clientService.getImagePhotographyTypesData('admin').subscribe({
                next: imagePhotographyTypesData => this.imagePhotographyTypesData = imagePhotographyTypesData.length !== 0 ? imagePhotographyTypesData : null,
                error: () => this._appService.createErrorModal()
            });

            this._adminPanelService.spinnerHiddenStatusChange.subscribe(value => {
                this.spinnerHidden = value;
            });
        }
    }

    ngAfterViewChecked (): void {
        if ( !this.compressedImagesContainerAnimationIsDone && this.compressedImageThumbnailUrls && this.fullCompressedImagesList && this.compressedImageThumbnailUrls.length === this.fullCompressedImagesList.length ) {
            this.compressedImageContainersAnimationCurrentStates.forEach(( data, index, arr ) => data === 'leave' ? arr[index] = 'enter' : null);

            this.changeDetectorRef.detectChanges();

            this.compressedImagesContainerAnimationIsDone = true;
        }
    }

    public get progressBarVisible (): boolean {
        return this._webSocketService.progressBarVisible;
    }

    public get progressBarValue (): number {
        return this._webSocketService.progressBarValue;
    }

    public uploadImageAccordionHide (): void {
        this.uploadImageAccordionButtonTooltipIsHidden = true;
    }

    public uploadImageAccordionShow (): void {
        this.uploadImageAccordionButtonTooltipIsHidden = true;
    }

    public uploadImageAccordionHidden (): void {
        this.uploadImageAccordionButtonTooltipIsHidden = false;
    }

    public uploadImageAccordionShown (): void {
        this.uploadImageAccordionButtonTooltipIsHidden = false;
    }

    public changeDocumentBodyUserInteractions (): void {
        if ( this.documentBody.classList.contains('pe-none') ) this.documentBody.classList.remove('pe-none');
        else this.documentBody.classList.add('pe-none');
    }

    public fileChange (event: any): void {
        const fileList: FileList = event.target.files;

        if ( fileList.length < 1 ) {
            return;
        }

        this.imageFile = fileList[0];
    }

    public imageValidator (): { [ s: string ]: boolean } | null {
        if ( this && this.imageFile !== null && ( ( this.imageFile.size > 104857600 || this.imageFile.name.length < 4 ) 
            || !this.requiredImageFileTypes.includes(this.imageFile.type) )
        ) {
            this.imageFile = null;

            return { 'image' : true };
        }

        return null;
    }

    public imagePhotographyTypeValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        if ( !( control.value in Image_photography_type ) ) {
            return { 'imagePhotographyType': true, 'newImagePhotographyType': true };
        }

        return null;
    }

    public imageDisplayTypeValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        if ( !( control.value in Image_display_type ) ) {
            return { 'imageDisplayType': true, 'newDisplayType': true };
        }

        return null;
    }

    public changeImageFormControlChange (formArrayName: 'newImagePhotographyType' | 'newImageDisplayType' | 'newImageDescription', formControlIndex: number): void {
        this._adminPanelService.changeImageFormControlChange(this, formArrayName, formControlIndex);
    }

    public loadAndShowImageThumbnail (event: MouseEvent): void {
        const imageButton: HTMLButtonElement = !( event.target instanceof HTMLButtonElement ) ? ( event.target as HTMLButtonElement ).parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( imageButton ) this._adminPanelService.loadAndShowImageThumbnail(this, imageButton, false);
    }

    public loadAndShowImageThumbnailRecursive (compressedImagesList: ICompressedImageWithoutRelationFields[], currentIndex: number): void {
        this._adminPanelService.loadAndShowImageThumbnail(this, null, true, compressedImagesList[currentIndex].originalName, compressedImagesList, currentIndex);
    }

    public imageThumbnailContainerAnimationDone (event: AnimationEvent): void {
        if ( event.toState === false ) {
            this.imageThumbnailUrl = null;
            this.imageThumbnailContainerIsVisible = false;
            this.currentLoadedImageThumbnailOriginalName = null;
        }
    }

    public switchImageThumbnailContainerVisible (): void {
        this.imageThumbnailContainerAnimationState = !this.imageThumbnailContainerAnimationState;
    }

    public uploadImage (): void {
        const { imagePhotographyType, imageDisplayType, imageDescription } = this.uploadImageForm.value;

        const imageMetaJson: string = JSON.stringify({
            name         : this.imageFile ? this.imageFile.name : null,
            size         : this.imageFile ? this.imageFile.size : null,
            type         : this.imageFile ? this.imageFile.type : null
        }); 

        if ( this.imageFile ) this._adminPanelService.uploadImage(this, imagePhotographyType, imageDisplayType, imageDescription, imageMetaJson);
        else this._appService.createErrorModal();
    }

    public deleteImage (event: MouseEvent, compressedImageIndex: number) {
        const deleteImageButton: HTMLButtonElement = !( event.target instanceof HTMLButtonElement ) ? ( event.target as HTMLElement ).parentElement?.parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( deleteImageButton ) this._adminPanelService.deleteImage(this, deleteImageButton, compressedImageIndex);
        else this._appService.createErrorModal();
    }

    public changeImageDisplayTarget (event: MouseEvent) {
        const imageButton: HTMLButtonElement = !( event.target instanceof HTMLButtonElement ) ? ( event.target as HTMLElement ).parentElement?.parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( imageButton ) this._adminPanelService.changeImageDisplayTarget(this, imageButton);
        else this._appService.createErrorModal();
    }

    public changeImageData (event: SubmitEvent): void {
        const submitButton: HTMLButtonElement = event.submitter as HTMLButtonElement;

        const originalImageName: string | null = submitButton.getAttribute('originalImageName');

        if ( originalImageName !== null ) this._adminPanelService.changeImageData(this, originalImageName);
        else this._appService.createErrorModal();
    }

    public setPhotographyTypeImage (event: MouseEvent): void {
        const imageButton: HTMLButtonElement = !( event.target instanceof HTMLButtonElement ) ? ( event.target as HTMLElement ).parentElement?.parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( imageButton ) this._adminPanelService.setPhotographyTypeImage(this, imageButton);
        else this._appService.createErrorModal();
    }

    public changePhotographyTypeDescription (event: MouseEvent): void {
        const target: HTMLButtonElement = event.target as HTMLButtonElement;

        if ( target ) this._adminPanelService.changePhotographyTypeDescription(this, target);
        else this._appService.createErrorModal();
    }

    public compressedImageContainersAnimationStarted (event: AnimationEvent): void {
        if ( event.toState === 'leave' && this.additionalImagesIsExists ) this.changeImageDataFormElementPEIsNone = true;

        if ( event.toState === 'enter' ) this.compressedImageButtonsIsHidden = true;
    }

    public compressedImageContainersAnimationDone (event: AnimationEvent): void {
        if ( event.toState === 'enter' ) this.changeImageDataFormElementPEIsNone = false;

        if ( this.deleteImageIsCompleted ) {
            this.deleteImageIsCompleted = false;
            this._appService.createSuccessModal();
        }

        if ( event.toState === 'enter' ) this.compressedImageButtonsIsHidden = false;
    }

    public compressedImageContainersDeleteAnimationStarted (index: number): void {
        this.compressedImageDataContainerClick(index);
    }

    public compressedImageDataContainerClick (index: number): void {
        const currentState: string = this.compressedImageDataContainersAnimationCurrentStates[index];

        this.compressedImageDataContainersAnimationCurrentStates[index] = currentState === 'showed' ? 'static' : 'showed';
    }

    public compressedImageDataContainersAnimationStarted (event: AnimationEvent): void {
        const target: HTMLDivElement = event.element;

        this.changeImageDataFormElementPEIsNone = true;

        if ( event.toState === 'showed' ) {
            target.classList.remove('invisible');
            target.classList.add('visible');
        }
    }

    public compressedImageDataContainersAnimationDone (event: AnimationEvent): void {
        const target: HTMLDivElement = event.element;

        this.changeImageDataFormElementPEIsNone = false;

        if ( event.toState === 'static' ) {
            target.classList.remove('visible');
            target.classList.add('invisible');
        }
    }

    public searchImages (): void {
        this._adminPanelService.searchImages(this);
    }

    public getFullCompressedImagesData (isSearch: boolean, getParams: IGetFullCompressedImagesDataOptions, additionalImagesClick: boolean = false): void {
        let imagesExistsCount: number = this.fullCompressedImagesList ? this.fullCompressedImagesList.length : 0;

        if ( isSearch ) imagesExistsCount = this.previousPhotographyTypesNotChange && this.previousDisplayTypesNotChange ? this.fullCompressedImagesList.length : 0;
        
        this.changeDocumentBodyUserInteractions();

        this._adminPanelService.getFullCompressedImagesData(this, isSearch, {
            imagesLimit: getParams.imagesLimit, 
            imagesExistsCount,
            dateFrom: getParams.dateFrom,
            dateUntil: getParams.dateUntil,
            photographyTypes: getParams.photographyTypes,
            displayTypes: getParams.displayTypes,
            sortBy: getParams.sortBy
        }, additionalImagesClick);

        /*

        this._adminPanelService.getFullCompressedImagesData(this, isSearch, {
            imagesLimit: getParams ? getParams.imagesLimit : undefined, 
            imagesExistsCount,
            dateFrom: getParams ? getParams.dateFrom : undefined,
            dateUntil: getParams ? getParams.dateUntil : undefined,
            photographyTypes: getParams ? getParams.photographyTypes : undefined,
            displayTypes: getParams ? getParams.displayTypes : undefined,
            sortBy: getParams ? getParams.sortBy : undefined
        }, additionalImagesClick);

        */
    }

    public searchImagesFormReset (): void {
        this.searchImagesForm.reset();

        this.currentDateFrom = undefined;
        this.currentDateUntil = undefined;
        this.currentPhotographyTypes = undefined;
        this.currentDisplayTypes = undefined;
        this.previousPhotographyTypes = [];
        this.previousDisplayTypes = [];
        this.previousPhotographyTypesNotChange = false;
        this.previousDisplayTypesNotChange = false;
    }

    public getSearchImagesMethod (): { callParentMethod: () => void } {
        return {
            callParentMethod: () => {
                this.searchImages()
            }
        }
    }

    public getSearchImagesFormResetMethod (): { callParentMethod: () => void } {
        return {
            callParentMethod: () => {
                this.searchImagesFormReset()
            }
        }
    }
}