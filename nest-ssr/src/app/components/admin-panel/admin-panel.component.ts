import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostBinding, Inject, OnInit, PLATFORM_ID, QueryList, ViewChildren } from '@angular/core';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { Image_display_type, Image_photography_type } from '@prisma/client';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { Observable } from 'rxjs';

import { ImageSizePipe } from '../../pipes/image-size/image-size.pipe';
import { BooleanPipe } from '../../pipes/boolean/boolean.pipe';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';
import { ClientService } from '../../services/client/client.service';
import { WebSocketService } from '../../services/web-socket/web-socket.service';

import { AnimationEvent } from 'types/global';
import { ICompressedImageWithoutRelationFields, IImagePhotographyType } from 'types/models';
import { IGetFullCompressedImagesDataOptions } from 'types/options';

@Component({
    selector: 'app-admin-panel',
    standalone: true,
	imports: [ CommonModule, ReactiveFormsModule, NgbModule, ImageSizePipe, BooleanPipe, TranslateModule ],
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
    }>;

    public imagePhotographyTypes: Image_photography_type[] = [];
    public imageDisplayTypes: Image_display_type[] = [];

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

    private _imageFile: File | null;

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

        private readonly _http: HttpClient,
        private readonly _changeDetectorRef: ChangeDetectorRef,

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
            'displayTypes': new FormArray([new FormControl()])
        });
    }

    @HostBinding('className') public get componentClassValue (): string {
        return this._webSocketService.componentClass;
    }

    @ViewChildren('imagePhotographyTypeDescription', { read: ElementRef<HTMLInputElement> })
    private readonly imagePhotographyTypeDescriptionViewRefs: QueryList<ElementRef<HTMLInputElement>>;

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

            this.getFullCompressedImagesData(false);

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

            this._changeDetectorRef.detectChanges();

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

    public getFullCompressedImagesData (isSearch: boolean, getParams?: IGetFullCompressedImagesDataOptions, additionalImagesClick: boolean = false): void {
        if ( additionalImagesClick ) {
            this._checkChangesInPreviousPhotographyTypes();
            this._checkChangesInPreviousDisplayTypes();
        }

        let imagesExistsCount: number = this.fullCompressedImagesList ? this.fullCompressedImagesList.length : 0;

        if ( isSearch ) imagesExistsCount = this.previousPhotographyTypesNotChange ? this.fullCompressedImagesList.length : 0;

        this._adminPanelService.getFullCompressedImagesData({ 
            imagesLimit: getParams ? getParams.imagesLimit : undefined, 
            imagesExistsCount,
            dateFrom: getParams ? getParams.dateFrom : undefined,
            dateUntil: getParams ? getParams.dateUntil : undefined,
            photographyTypes: getParams ? getParams.photographyTypes : undefined,
            displayTypes: getParams ? getParams.displayTypes : undefined
        }).subscribe({
            next: imageData => {
                if ( ( isSearch && !this.previousPhotographyTypesNotChange ) || !this.additionalImagesIsExists ) {
                    this.fullCompressedImagesList = imageData.imagesList;

                    if ( this.fullCompressedImagesList.length > 0 ) {
                        this.compressedImageThumbnailUrls = [];
                        this.compressedImageContainersAnimationCurrentStates = [];
                        this.compressedImageContainersDeleteStatus = [];

                        this.loadAndShowImageThumbnailRecursive(this.fullCompressedImagesList, 0);
                    }

                    this.fullCompressedImagesList.forEach(() => {
                        this.compressedImageContainersAnimationCurrentStates.push('leave');
                        this.compressedImageContainersDeleteStatus.push(false);
                    });

                    this.changeImageDataForm = new FormGroup({
                        'newImagePhotographyType': new FormArray(this.fullCompressedImagesList.map(data => {
                            this.changeImageDataFormPreviousValues['newImagePhotographyType'].push(data.photographyType);

                            return new FormControl(data.photographyType);
                        })),
                        'newImageDisplayType': new FormArray(this.fullCompressedImagesList.map(data => {
                            this.changeImageDataFormPreviousValues['newImageDisplayType'].push(data.displayType);

                            return new FormControl(data.displayType);
                        })),
                        'newImageDescription': new FormArray(this.fullCompressedImagesList.map(data => {
                            this.changeImageDataFormPreviousValues['newImageDescription'].push(data.description);

                            return new FormControl(data.description);
                        }))
                    });

                    this.fullCompressedImagesList.forEach(() => {
                        this.changeImageDataFormSubmitButtonsHiddenStatus.push(true);
                        this.compressedImageDataContainersAnimationCurrentStates.push('static');
                    });
                } else {
                    this.compressedImageButtonsIsHidden = true;

                    this.fullCompressedImagesList.push(...imageData.imagesList);

                    const newFullCompressedImagesList: ICompressedImageWithoutRelationFields[] = this.fullCompressedImagesList.slice(imagesExistsCount);

                    newFullCompressedImagesList.forEach(() => {
                        this.compressedImageContainersAnimationCurrentStates.push('leave');
                        this.compressedImageContainersDeleteStatus.push(false);
                    });

                    this.compressedImagesContainerAnimationIsDone = false;

                    this.loadAndShowImageThumbnailRecursive(newFullCompressedImagesList, 0);

                    imageData.imagesList.forEach(data => {
                        this.changeImageDataFormPreviousValues['newImagePhotographyType'].push(data.photographyType);
                        this.changeImageDataForm.controls.newImagePhotographyType.push(new FormControl(data.photographyType));

                        this.changeImageDataFormPreviousValues['newImageDisplayType'].push(data.displayType);
                        this.changeImageDataForm.controls.newImageDisplayType.push(new FormControl(data.displayType));

                        this.changeImageDataFormPreviousValues['newImageDescription'].push(data.description);
                        this.changeImageDataForm.controls.newImageDescription.push(new FormControl(data.description));
                    });

                    imageData.imagesList.forEach(() => {
                        this.changeImageDataFormSubmitButtonsHiddenStatus.push(true);
                        this.compressedImageDataContainersAnimationCurrentStates.push('static');
                    });
                }

                this.fullCompressedImagesListCount = imageData.count;

                this.additionalImagesIsExists = imageData.additionalImagesIsExists;

                this.compressedImagesDataIsLoaded = true;
            },
            error: () => this._appService.createErrorModal()
        });
    }

    public fileChange (event: any): void {
        const fileList: FileList = event.target.files;

        if ( fileList.length < 1 ) {
            return;
        }

        this._imageFile = fileList[0];
    }

    public imageValidator (): { [ s: string ]: boolean } | null {
        if ( this && this._imageFile !== null && ( ( this._imageFile.size > 104857600 || this._imageFile.name.length < 4 ) 
            || !this.requiredImageFileTypes.includes(this._imageFile.type) )
        ) {
            this._imageFile = null;

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
        const formArray: FormArray<FormControl<string>> = <FormArray<FormControl<Image_photography_type | Image_display_type | string>>>this.changeImageDataForm.get(formArrayName);
        const control: FormControl<string> = formArray.at(formControlIndex);

        if ( this.changeImageDataFormPreviousValues[formArrayName][formControlIndex] === control.value ) {
            this.changeImageDataFormSubmitButtonsHiddenStatus[formControlIndex] = true;

            switch ( formArrayName ) {
                case 'newImagePhotographyType': { control.removeValidators([ Validators.required, this.imagePhotographyTypeValidator ]); break; }
                case 'newImageDisplayType': { control.removeValidators([ Validators.required, this.imageDisplayTypeValidator ]); break; }
                case 'newImageDescription': { control.removeValidators([ Validators.maxLength(20) ]); break; }
            }
        } else {
            this.changeImageDataFormSubmitButtonsHiddenStatus[formControlIndex] = false;

            switch ( formArrayName ) {
                case 'newImagePhotographyType': { control.setValidators([ Validators.required, this.imagePhotographyTypeValidator ]); break; }
                case 'newImageDisplayType': { control.setValidators([ Validators.required, this.imageDisplayTypeValidator ]); break; }
                case 'newImageDescription': { control.setValidators([ Validators.maxLength(20) ]); break; }
            }
        }

        control.updateValueAndValidity();
    }

    public loadAndShowImageThumbnail (event: MouseEvent): void {
        const imageButton: HTMLButtonElement = !( event.target instanceof HTMLButtonElement ) ? ( event.target as HTMLButtonElement ).parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( imageButton ) {
            ( this._adminPanelService.loadAndShowImageThumbnail(this, imageButton) as Observable<Blob> ).subscribe({
                next: imageThumbnailBlob => {
                    const reader = new FileReader();

                    reader.readAsDataURL(imageThumbnailBlob);

                    reader.onload = event => {
                        this.spinnerHidden = true;

                        this.imageThumbnailUrl = ( event.target as FileReader ).result as string;

                        this.imageThumbnailContainerIsVisible = true;
                        
                        this.switchImageThumbnailContainerVisible();
                    };
                },
                error: () => {
                    this.spinnerHidden = true;

                    this._appService.createErrorModal();
                }
            });
        }
    }

    public loadAndShowImageThumbnailRecursive (compressedImagesList: ICompressedImageWithoutRelationFields[], currentIndex: number): void {
        ( this._adminPanelService.loadAndShowImageThumbnail(this, null, compressedImagesList[currentIndex].originalName) as Observable<Blob> ).subscribe({
            next: imageThumbnailBlob => {
                const reader = new FileReader();

                reader.readAsDataURL(imageThumbnailBlob);

                reader.onload = event => {
                    this.spinnerHidden = true;

                    this.compressedImageThumbnailUrls.push(( event.target as FileReader ).result as string);

                    currentIndex += 1;

                    if ( currentIndex === compressedImagesList.length ) return;
                    else this.loadAndShowImageThumbnailRecursive(compressedImagesList, currentIndex);
                };
            },
            error: () => {
                this.spinnerHidden = true;

                this._appService.createErrorModal();
            }
        });
    }

    public imageThumbnailContainerAnimationStart (event: AnimationEvent): void {
        const target: HTMLDivElement = event.element;

        if ( event.toState === true ) target.classList.add('pe-none');
        else if ( event.toState === false ) target.classList.add('pe-none');
    }

    public imageThumbnailContainerAnimationDone (event: AnimationEvent): void {
        const target: HTMLDivElement = event.element;

        if ( event.toState === false ) {
            target.classList.remove('pe-none');

            this.imageThumbnailUrl = null;
            this.imageThumbnailContainerIsVisible = false;
            this.currentLoadedImageThumbnailOriginalName = null;
        } else if ( event.toState === true ) target.classList.remove('pe-none');
    }

    public switchImageThumbnailContainerVisible (): void {
        this.imageThumbnailContainerAnimationState = !this.imageThumbnailContainerAnimationState;
    }

    public uploadImage (): void {
        const { imagePhotographyType, imageDisplayType, imageDescription } = this.uploadImageForm.value;

        const imageMetaJson: string = JSON.stringify({
            name         : this._imageFile ? this._imageFile.name : null,
            size         : this._imageFile ? this._imageFile.size : null,
            type         : this._imageFile ? this._imageFile.type : null
        }); 

        if ( this._imageFile ) {
            const newClientId: number = Math.random();
    
            this._http.post('/api/admin-panel/uploadImage', {
                client: {
                    _id: newClientId, 
                    uploadImageMeta: imageMetaJson,
                    imagePhotographyType,
                    imageDisplayType,
                    imageDescription
                }
            }, { headers: this._appService.createAuthHeaders() || { }, responseType: 'text', withCredentials: true }).subscribe({
                next: result => {
                    switch ( result ) {
                        case 'START': { this._adminPanelService.uploadImage(this._imageFile as File, this.uploadImageForm, newClientId); break; }
                        case 'PENDING': { this._appService.createWarningModal(this._appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'FILEEXISTS': { this._appService.createWarningModal(this._appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'MAXCOUNT': { this._appService.createWarningModal(this._appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'MAXSIZE': { this._appService.createWarningModal(this._appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'MAXNAMELENGTH': { this._appService.createWarningModal(this._appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                    }
                },
                error: () => this._appService.createErrorModal()
            });
        } else this._appService.createErrorModal();
    }

    public deleteImage (event: MouseEvent, compressedImageIndex: number) {
        const deleteImageButton: HTMLButtonElement = !( event.target instanceof HTMLButtonElement ) ? ( event.target as HTMLElement ).parentElement?.parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( deleteImageButton ) {
            const originalImageName: string | null = deleteImageButton.getAttribute('originalImageName');
            const imageIndexNumber: number = parseInt(deleteImageButton.getAttribute('image-index-number') as string, 10);

            if ( originalImageName !== null && !isNaN(imageIndexNumber) ) {
                this.spinnerHidden = false;

                this._http.post('/api/admin-panel/deleteImage', {
                    adminPanel: { originalImageName }
                }, { headers: this._appService.createAuthHeaders() || { }, responseType: 'text', withCredentials: true }).subscribe({
                    next: responseText => {
                        this._adminPanelService.switchImageControlResponses(responseText, 'delete');
                        this.deleteImageIsCompleted = true;

                        this.compressedImageContainersDeleteStatus[imageIndexNumber] = true;
                        this._changeDetectorRef.detectChanges();

                        this.fullCompressedImagesList.splice(imageIndexNumber, 1);
                        
                        Object.keys(this.changeImageDataFormPreviousValues).forEach(controlName => this.changeImageDataFormPreviousValues[controlName].splice(imageIndexNumber, 1));

                        this.compressedImageThumbnailUrls.splice(compressedImageIndex, 1);
                        this.compressedImageContainersAnimationCurrentStates.splice(compressedImageIndex, 1);
                        this.changeImageDataFormSubmitButtonsHiddenStatus.splice(compressedImageIndex, 1);
                        this.compressedImageDataContainersAnimationCurrentStates.splice(compressedImageIndex, 1);
                        this.compressedImageContainersDeleteStatus.splice(compressedImageIndex, 1);
                    },
                    error: () => {
                        this.spinnerHidden = true;

                        this._appService.createErrorModal();
                    }
                });
            }
        } else this._appService.createErrorModal();
    }

    public changeImageDisplayTarget (event: MouseEvent) {
        const imageButton: HTMLButtonElement = !( event.target instanceof HTMLButtonElement ) ? ( event.target as HTMLElement ).parentElement?.parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( imageButton ) {
            const originalImageName: string | null = imageButton.getAttribute('originalImageName');
            const displayTargetPage: string | null = imageButton.getAttribute('targetPage');
            const imageIndexNumber: number = parseInt(imageButton.getAttribute('image-index-number') as string, 10);

            if ( originalImageName !== null && displayTargetPage !== null && !isNaN(imageIndexNumber) ) {
                this.spinnerHidden = false;

                this._http.post('/api/admin-panel/changeImageDisplayTarget', {
                    adminPanel: { originalImageName, displayTargetPage }
                }, { headers: this._appService.createAuthHeaders() || { }, responseType: 'text', withCredentials: true }).subscribe({
                    next: responseText => {
                        this._adminPanelService.switchImageControlResponses(responseText, 'changeDisplayTarget');

                        this.fullCompressedImagesList[imageIndexNumber].displayedOnHomePage = false; // 0
                        this.fullCompressedImagesList[imageIndexNumber].displayedOnGalleryPage = false; // 0

                        if ( responseText === 'SUCCESS' ) {
                            switch ( displayTargetPage ) {
                                case 'home': { this.fullCompressedImagesList[imageIndexNumber].displayedOnHomePage = true; break; } // 1
                                case 'gallery': { this.fullCompressedImagesList[imageIndexNumber].displayedOnGalleryPage = true; break; } // 1
                                case 'original': { break; }
                            }
                        }
                    },
                    error: () => {
                        this.spinnerHidden = true;
                        
                        this._appService.createErrorModal();
                    }
                });
            }
        } else this._appService.createErrorModal();
    }

    public changeImageData (event: SubmitEvent): void {
        const submitButton: HTMLButtonElement = event.submitter as HTMLButtonElement;

        const originalImageName: string | null = submitButton.getAttribute('originalImageName');

        if ( originalImageName !== null ) {
            this.spinnerHidden = false;

            const changeImageDataFormValue = this.changeImageDataForm.value;
            const changedImageIndexNumber: number = this.fullCompressedImagesList.findIndex(imageData => imageData.originalName == originalImageName);
            
            const previousImagePhotographyType: Image_photography_type = this.changeImageDataFormPreviousValues['newImagePhotographyType'][changedImageIndexNumber] as Image_photography_type;
            const previousImageDisplayType: Image_display_type = this.changeImageDataFormPreviousValues['newImageDisplayType'][changedImageIndexNumber] as Image_display_type;
            const previousImageDescription: string = this.changeImageDataFormPreviousValues['newImageDescription'][changedImageIndexNumber] as string;

            let newImagePhotographyType: Image_photography_type | undefined = ( changeImageDataFormValue.newImagePhotographyType as ( Image_photography_type | null )[] ).at(changedImageIndexNumber) as Image_photography_type;
            let newImageDisplayType: Image_display_type | undefined = ( changeImageDataFormValue.newImageDisplayType as ( Image_display_type | null )[] ).at(changedImageIndexNumber) as Image_display_type;
            let newImageDescription: string | undefined = ( changeImageDataFormValue.newImageDescription as string[] ).at(changedImageIndexNumber) as string;

            newImagePhotographyType = previousImagePhotographyType !== newImagePhotographyType ? newImagePhotographyType : undefined;
            newImageDisplayType = previousImageDisplayType !== newImageDisplayType ? newImageDisplayType : undefined;
            newImageDescription = previousImageDescription !== newImageDescription ? newImageDescription : undefined;

            this._http.put('/api/admin-panel/changeImageData', {
                adminPanel: { originalImageName, newImagePhotographyType, newImageDescription, newImageDisplayType }
            }, { responseType: 'text', headers: this._appService.createAuthHeaders() || { }, withCredentials: true }).subscribe({
                next: responseText => {
                    this.spinnerHidden = true;

                    this._adminPanelService.switchImageControlResponses(responseText, 'changeData');

                    let control: FormControl<Image_photography_type | Image_display_type | string | null> | null = null;

                    if ( newImagePhotographyType && this.fullCompressedImagesList[changedImageIndexNumber].photographyType !== newImagePhotographyType ) {
                        control = this.changeImageDataForm.controls.newImagePhotographyType.at(changedImageIndexNumber) as FormControl<Image_photography_type>;

                        if ( control !== null ) {
                            control.removeValidators([ Validators.required, this.imagePhotographyTypeValidator ]);
                            this.fullCompressedImagesList[changedImageIndexNumber].photographyType = newImagePhotographyType as Image_photography_type;
                        }
                    }

                    if ( newImageDisplayType && this.fullCompressedImagesList[changedImageIndexNumber].displayType !== newImageDisplayType ) {
                        control = this.changeImageDataForm.controls.newImageDisplayType.at(changedImageIndexNumber) as FormControl<Image_display_type>;

                        if ( control !== null ) {
                            control.removeValidators([ Validators.required, this.imageDisplayTypeValidator ]);
                            this.fullCompressedImagesList[changedImageIndexNumber].displayType = newImageDisplayType as Image_display_type;
                        }
                    }

                    if ( newImageDescription && this.fullCompressedImagesList[changedImageIndexNumber].description !== newImageDescription ) {
                        control = this.changeImageDataForm.controls.newImageDescription.at(changedImageIndexNumber) as FormControl<string>;

                        if ( control !== null ) {
                            control.removeValidators([ Validators.maxLength(20) ]);
                            this.fullCompressedImagesList[changedImageIndexNumber].description = newImageDescription;
                        }
                    }

                    this.changeImageDataFormSubmitButtonsHiddenStatus[changedImageIndexNumber] = true;
                },
                error: () => {
                    this.spinnerHidden = true;

                    this._appService.createErrorModal();
                }
            });
        } else this._appService.createErrorModal();
    }

    public setPhotographyTypeImage (event: MouseEvent): void {
        const imageButton: HTMLButtonElement = !( event.target instanceof HTMLButtonElement ) ? ( event.target as HTMLElement ).parentElement?.parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( imageButton ) {
            const originalImageName: string | null = imageButton.getAttribute('originalImageName');
            const imagePhotographyType: string | null = imageButton.getAttribute('imagePhotographyType');

            if ( originalImageName !== null && imagePhotographyType !== null ) {
                this.spinnerHidden = false;

                this._http.post('/api/admin-panel/setPhotographyTypeImage', {
                    adminPanel: { originalImageName, imagePhotographyType }
                }, { responseType: 'text', headers: this._appService.createAuthHeaders() || { }, withCredentials: true }).subscribe({
                    next: responseText => {
                        this.spinnerHidden = true;
    
                        this._adminPanelService.switchImageControlResponses(responseText, 'setPhotographyType');

                        const editedPhotographyTypeIndex: number = ( this.imagePhotographyTypesData as IImagePhotographyType[]).findIndex(photographyTypeData => photographyTypeData.name === imagePhotographyType);
                        ( this.imagePhotographyTypesData as IImagePhotographyType[])[editedPhotographyTypeIndex].compressedImageOriginalName = ( this.fullCompressedImagesList.find(imageData => imageData.originalName === originalImageName) as ICompressedImageWithoutRelationFields).name;

                        this._changeDetectorRef.detectChanges();
                    },
                    error: () => {
                        this.spinnerHidden = true;
                        
                        this._appService.createErrorModal();
                    }
                });
            }
        }
    }

    public changePhotographyTypeDescription (event: MouseEvent): void {
        const target: HTMLButtonElement = event.target as HTMLButtonElement;

        if ( target ) {
            const photographyTypeName: string = target.getAttribute('photography-type-name') as string;

            if ( photographyTypeName ) {
                const photographyTypeNewDescription: string = ( this.imagePhotographyTypeDescriptionViewRefs.find(imagePhotographyTypeDescription => {
                    return imagePhotographyTypeDescription.nativeElement.getAttribute('photography-type-name') === photographyTypeName;
                }) as ElementRef<HTMLInputElement> ).nativeElement.value;

                if ( photographyTypeNewDescription.length <= 800 ) {
                    this.spinnerHidden = false;

                    this._http.post<void>('/api/admin-panel/changePhotographyTypeDescription', {
                        adminPanel: { photographyTypeName, photographyTypeNewDescription }
                    }, { headers: this._appService.createAuthHeaders() || { }, withCredentials: true }).subscribe({
                        next: () => {
                            this.spinnerHidden = true;

                            const editedPhotographyTypeIndex: number = ( this.imagePhotographyTypesData as IImagePhotographyType[] ).findIndex(photographyTypeData => photographyTypeData.name === photographyTypeName);
                            ( this.imagePhotographyTypesData as IImagePhotographyType[] )[editedPhotographyTypeIndex].description = photographyTypeNewDescription;

                            this._changeDetectorRef.detectChanges();

                            this._appService.createSuccessModal();
                        },
                        error: () => {
                            this.spinnerHidden = true;
                            
                            this._appService.createErrorModal();
                        }
                    });
                } else this._appService.createWarningModal(this._appService.getTranslations('ADMINPANEL.CHANGEPHOTOGRAPHYTYPEDESCRIPTIONBUTTONINVALIDMESSSAGE'));
            }
        }
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
        this.searchImagesForm.updateValueAndValidity();

        const { dateFrom, dateUntil, photographyTypes, displayTypes } = this.searchImagesForm.value;

        this.currentDateFrom = new Date(dateFrom as string);
        this.currentDateUntil = new Date(dateUntil as string);

        this.currentPhotographyTypes = [];
        this.currentDisplayTypes = [];

        ( photographyTypes as boolean[] ).forEach(( selected, index ) => selected === true ? ( this.currentPhotographyTypes as Image_photography_type[] ).push(this.imagePhotographyTypes[index]) : null);
        ( displayTypes as boolean[] ).forEach(( selected, index ) => selected === true ? ( this.currentDisplayTypes as Image_display_type[] ).push(this.imageDisplayTypes[index]) : null);

        this._checkChangesInPreviousPhotographyTypes();
        this._checkChangesInPreviousDisplayTypes();

        if ( !this.previousPhotographyTypesNotChange ) this.previousPhotographyTypes = this.currentPhotographyTypes;
        if ( !this.previousDisplayTypesNotChange ) this.previousDisplayTypes = this.currentDisplayTypes;
        
        if ( this.currentPhotographyTypes.length === 0 ) this.currentPhotographyTypes = undefined;
        if ( this.currentDisplayTypes.length === 0 ) this.currentDisplayTypes = undefined;

        this.getFullCompressedImagesData(true, { 
            dateFrom: this.currentDateFrom, 
            dateUntil: this.currentDateUntil,
            photographyTypes: this.currentPhotographyTypes,
            displayTypes: this.currentDisplayTypes
        });
    }

    private _checkChangesInPreviousPhotographyTypes (): void {
        let result: boolean = false;

        result = this.previousPhotographyTypes.length !== 0 && this.previousPhotographyTypes.length === this.currentPhotographyTypes?.length ? this.previousPhotographyTypes.every(( data, index ) => data === ( this.currentPhotographyTypes as Image_photography_type[] )[index]) : false;

        this.previousPhotographyTypesNotChange = result;
    }

    private _checkChangesInPreviousDisplayTypes (): void {
        let result: boolean = false;

        result = this.previousDisplayTypes.length !== 0 && this.previousDisplayTypes.length === this.currentDisplayTypes?.length ? this.previousDisplayTypes.every(( data, index ) => data === ( this.currentDisplayTypes as Image_display_type[] )[index]) : false;

        this.previousDisplayTypesNotChange = result;
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
}