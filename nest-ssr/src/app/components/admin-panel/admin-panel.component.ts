import { Component, ElementRef, HostBinding, HostListener, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';
import { ClientService } from '../../services/client/client.service';
import { WebSocketService } from '../../services/web-socket/web-socket.service';

import { AnimationEvent } from 'types/global';
import { IClientCompressedImage, IImagePhotographyType } from 'types/models';

@Component({
    selector: 'app-admin-panel',
    templateUrl: './admin-panel.component.html',
    styleUrls: ['./admin-panel.component.css'],
    animations: [
        trigger('images-table-rows-animation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateX(-100%)' }),
                animate('2s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
            ]),
            transition(':leave', [
                style({ opacity: 1, transform: 'translateX(0)' }),
                animate('1s ease', style({ opacity: 0, transform: 'translateX(-100%)' }))
            ])
        ])
    ],
    host: { ngSkipHydration: 'true' }
})
export class AdminPanelComponent implements OnInit {
    constructor (
        private readonly http: HttpClient,

        private readonly appService: AppService,
        private readonly adminPanelService: AdminPanelService,
        private readonly clientService: ClientService,
        private readonly webSocketService: WebSocketService
    ) {
        this.uploadImageForm = new FormGroup({
            'imagePhotographyType': new FormControl("", [ Validators.required, this.imagePhotographyTypeValidator ]),
            'imageViewSizeType': new FormControl("", [ Validators.required, this.imageViewSizeTypeValidator ]),
            'image': new FormControl(null as FileList, [ Validators.required, this.imageValidator ]),
            'imageDescription': new FormControl("", Validators.maxLength(20))
        });

        this.changeImageDataForm = new FormGroup({
            'newImagePhotographyType': new FormControl(""),
            'newImageViewSizeType': new FormControl(""),
            'newImageDescription': new FormControl("")
        });
    }

    public uploadImageForm: FormGroup<{
        imagePhotographyType: FormControl<string>;
        imageViewSizeType: FormControl<string>;
        image: FormControl<FileList>;
        imageDescription: FormControl<string>;
    }>;

    public changeImageDataForm: FormGroup<{
        newImagePhotographyType: FormControl<string>;
        newImageViewSizeType: FormControl<string>;
        newImageDescription: FormControl<string>;
    }>;

    @ViewChild('changeImageDataContainer', { static: false }) private readonly changeImageDataContainerViewRef: ElementRef<HTMLDivElement>;
    @ViewChild('additionalImagesButton', { static: false }) private readonly additionalImagesButtonViewRef: ElementRef<HTMLDivElement>;

    @HostListener('document:mousedown', [ '$event' ])
    public onGlobalClick (event): void {
       if ( !this.changeImageDataContainerViewRef.nativeElement.contains(event.target) ) {
            this.changeImageDataFormHidden = true;
        }
    }

    @HostBinding('className') public get componentClassValue (): string {
        return this.webSocketService.componentClass;
    }

    @ViewChildren('imagePhotographyTypeDescription', { read: ElementRef<HTMLInputElement> }) 
    private readonly imagePhotographyTypeDescriptionViewRefs: QueryList<ElementRef<HTMLInputElement>>;

    public changeImageDataFormHidden: boolean = true;
    public changingOriginalImageName: string;

    private _imageFile: File;

    public fullCompressedImagesList: IClientCompressedImage[];
    public fullCompressedImagesListCount: number;
    public additionalImagesIsExists: boolean = false;

    public imagePhotographyTypes: IImagePhotographyType[];

    public spinnerHidden: boolean = true;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.ADMINPANEL.IMAGESCONTROL', true).subscribe(translation => this.appService.setTitle(translation));

            this.getFullCompressedImagesData();

            this.clientService.getImagePhotographyTypesData('admin').subscribe({
                next: imagePhotographyTypesData => this.imagePhotographyTypes = imagePhotographyTypesData.length !== 0 ? imagePhotographyTypesData : null,
                error: () => this.appService.createErrorModal()
            });

            this.adminPanelService.spinnerHiddenStatusChange.subscribe(value => {
                this.spinnerHidden = value;
            });
        }
    }

    public get progressBarVisible (): boolean {
        return this.webSocketService.progressBarVisible;
    }

    public get progressBarValue (): number {
        return this.webSocketService.progressBarValue;
    }

    public getFullCompressedImagesData (imagesLimit?: number): void {
        const imagesExistsCount: number = this.fullCompressedImagesList ? this.fullCompressedImagesList.length : 0;

        this.adminPanelService.getFullCompressedImagesData(imagesLimit, imagesExistsCount).subscribe({
            next: imageData => {
                if ( !this.additionalImagesIsExists ) this.fullCompressedImagesList = imageData.imagesList;
                else this.fullCompressedImagesList.push(...imageData.imagesList);

                this.fullCompressedImagesListCount = imageData.count;

                this.additionalImagesIsExists = imageData.additionalImagesIsExists;
            },
            error: () => this.appService.createErrorModal()
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
        if ( this && this._imageFile && (this._imageFile.size > 104857600 || this._imageFile.name.length < 4) ) {
            this._imageFile = null;

            return { 'image' : true };
        }

        return null;
    }

    public imagePhotographyTypeValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        const imagePhotographyTypes: string[] = [ 'individual', 'children', 'wedding', 'family' ];

        if ( !imagePhotographyTypes.includes(control.value) ) {
            return { 'imagePhotographyType': true, 'newImagePhotographyType': true };
        }

        return null;
    }

    public imageViewSizeTypeValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        const imageViewSizeTypes: string[] = [ 'medium', 'big' ];

        if ( !imageViewSizeTypes.includes(control.value) ) {
            return { 'imageViewSizeType': true, 'newImageViewSizeType': true };
        }

        return null;
    }

    public controlPhotographyTypeChange () {
        const control: FormControl<string> = <FormControl>this.changeImageDataForm.get('newImagePhotographyType');

        if ( control.value ) control.setValidators([ Validators.required, this.imagePhotographyTypeValidator ])
        else control.setValidators(null);
    
        control.updateValueAndValidity();
    }

    public controlViewSizeTypeChange () {
        const control: FormControl<string> = <FormControl>this.changeImageDataForm.get('newImageViewSizeType');

        if ( control.value ) control.setValidators([ Validators.required, this.imageViewSizeTypeValidator ])
        else control.setValidators(null);
    
        control.updateValueAndValidity();
    }

    public controlImageDescriptionChange () {
        const control: FormControl<string> = <FormControl>this.changeImageDataForm.get('newImageDescription');

        if ( control.value ) control.setValidators([ Validators.required, Validators.maxLength(20) ])
        else control.setValidators(null);
    
        control.updateValueAndValidity();
    }

    public uploadImage (): void {
        const { imagePhotographyType, imageViewSizeType, imageDescription } = this.uploadImageForm.value;

        const imageMetaJson: string = JSON.stringify({
            name         : this._imageFile ? this._imageFile.name : null,
            size         : this._imageFile ? this._imageFile.size : null,
            type         : this._imageFile ? this._imageFile.type : null
        }); 

        if ( this._imageFile ) {
            const newClientId: number = Math.random();

            const headers: HttpHeaders = this.appService.createRequestHeaders();
    
            this.http.post('/api/admin-panel/uploadImage', {
                client: {
                    _id: newClientId, 
                    uploadImageMeta: imageMetaJson,
                    imagePhotographyType,
                    imageViewSizeType,
                    imageDescription
                }
            }, { headers, responseType: 'text', withCredentials: true }).subscribe({
                next: result => {
                    switch ( result ) {
                        case 'START': { this.adminPanelService.uploadImage(this._imageFile, this.uploadImageForm, newClientId); break; }
                        case 'PENDING': { this.appService.createWarningModal(this.appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'FILEEXISTS': { this.appService.createWarningModal(this.appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'MAXCOUNT': { this.appService.createWarningModal(this.appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'MAXSIZE': { this.appService.createWarningModal(this.appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'MAXNAMELENGTH': { this.appService.createWarningModal(this.appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                    }
                },
                error: () => this.appService.createErrorModal()
            });
        } else this.appService.createErrorModal();
    }

    public deleteImage (event: MouseEvent) {
        const deleteImageButton: HTMLButtonElement = !(event.target instanceof HTMLButtonElement) ? (event.target as HTMLButtonElement).parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( deleteImageButton ) {
            const originalImageName: string = deleteImageButton.getAttribute('originalImageName');
            const indexNumber: number = parseInt(deleteImageButton.getAttribute('index-number'), 10);

            if ( originalImageName ) {
                this.spinnerHidden = false;

                const headers: HttpHeaders = this.appService.createRequestHeaders();

                this.http.post('/api/admin-panel/deleteImage', {
                    adminPanel: { originalImageName }
                }, { headers, responseType: 'text', withCredentials: true }).subscribe({
                    next: responseText => {
                        this.adminPanelService.switchImageControlResponses(responseText);

                        this.fullCompressedImagesList.splice(indexNumber, 1);
                    },
                    error: () => {
                        this.spinnerHidden = true;

                        this.appService.createErrorModal();
                    }
                });
            }
        } else this.appService.createErrorModal();
    }

    public changeImageDisplayTarget (event: MouseEvent) {
        const imageButton: HTMLButtonElement = !(event.target instanceof HTMLButtonElement) ? (event.target as HTMLButtonElement).parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( imageButton ) {
            const originalImageName: string = imageButton.getAttribute('originalImageName');
            const displayTargetPage: string = imageButton.getAttribute('targetPage');

            if ( originalImageName && displayTargetPage ) {
                this.spinnerHidden = false;

                const headers: HttpHeaders = this.appService.createRequestHeaders();

                this.http.post('/api/admin-panel/changeImageDisplayTarget', {
                    adminPanel: { originalImageName, displayTargetPage }
                }, { headers, responseType: 'text', withCredentials: true }).subscribe({
                    next: responseText => this.adminPanelService.switchImageControlResponses(responseText),
                    error: () => {
                        this.spinnerHidden = true;
                        
                        this.appService.createErrorModal();
                    }
                });
            }
        } else this.appService.createErrorModal();
    }

    public changeImageData (): void {
        const { newImagePhotographyType, newImageDescription, newImageViewSizeType } = this.changeImageDataForm.value;

        const originalImageName: string = this.changingOriginalImageName;

        if ( originalImageName ) {
            this.spinnerHidden = false;

            const headers: HttpHeaders = this.appService.createRequestHeaders();

            this.http.put('/api/admin-panel/changeImageData', {
                adminPanel: { originalImageName, newImagePhotographyType, newImageDescription, newImageViewSizeType }
            }, { responseType: 'text', headers, withCredentials: true }).subscribe({
                next: responseText => {
                    this.changeImageDataFormHidden = true;
                    this.spinnerHidden = true;

                    this.adminPanelService.switchImageControlResponses(responseText);

                    this.changeImageDataForm.reset();
                },
                error: () => {
                    this.spinnerHidden = true;

                    this.appService.createErrorModal();
                }
            });
        } else this.appService.createErrorModal();
    }

    public changeImageFormActivate (event: MouseEvent): void {
        const imageButton: HTMLButtonElement = !(event.target instanceof HTMLButtonElement) ? (event.target as HTMLButtonElement).parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( imageButton ) {
            this.changeImageDataFormHidden = false;

            this.changingOriginalImageName = imageButton.getAttribute('originalImageName');
        } else this.appService.createErrorModal();
    }

    public setPhotographyTypeImage (event: MouseEvent): void {
        const imageButton: HTMLButtonElement = !(event.target instanceof HTMLButtonElement) ? (event.target as HTMLButtonElement).parentElement as HTMLButtonElement : event.target as HTMLButtonElement;

        if ( imageButton ) {
            const originalImageName: string = imageButton.getAttribute('originalImageName');
            const imagePhotographyType: string = imageButton.getAttribute('imagePhotographyType');

            if ( originalImageName && imagePhotographyType ) {
                this.spinnerHidden = false;

                const headers: HttpHeaders = this.appService.createRequestHeaders();

                this.http.post('/api/admin-panel/setPhotographyTypeImage', {
                    adminPanel: { originalImageName, imagePhotographyType }
                }, { responseType: 'text', headers, withCredentials: true }).subscribe({
                    next: responseText => {
                        this.spinnerHidden = true;
    
                        this.adminPanelService.switchImageControlResponses(responseText);
                    },
                    error: () => {
                        this.spinnerHidden = true;
                        
                        this.appService.createErrorModal();
                    }
                });
            }
        }
    }

    public changePhotographyTypeDescription (event: MouseEvent): void {
        const target: HTMLButtonElement = event.target as HTMLButtonElement;

        if ( target ) {
            const photographyTypeName: string = target.getAttribute('photography-type-name');

            if ( photographyTypeName ) {
                const photographyTypeNewDescription: string = this.imagePhotographyTypeDescriptionViewRefs.find(imagePhotographyTypeDescription => {
                    return imagePhotographyTypeDescription.nativeElement.getAttribute('photography-type-name') === photographyTypeName;
                }).nativeElement.value;

                if ( photographyTypeNewDescription.length <= 40 ) {
                    this.spinnerHidden = false;
                    
                    const headers: HttpHeaders = this.appService.createRequestHeaders();

                    this.http.post<void>('/api/admin-panel/changePhotographyTypeDescription', {
                        adminPanel: { photographyTypeName, photographyTypeNewDescription }
                    }, { headers, withCredentials: true }).subscribe({
                        next: () => window.location.reload(),
                        error: () => {
                            this.spinnerHidden = true;
                            
                            this.appService.createErrorModal();
                        }
                    });
                } else this.appService.createWarningModal(this.appService.getTranslations('ADMINPANEL.CHANGEPHOTOGRAPHYTYPEDESCRIPTIONBUTTONINVALIDMESSSAGE'));
            }
        }
    }

    public imagesTableRowsAnimationStarted (event: AnimationEvent): void { 
        const target: HTMLTableRowElement = event.element;

        target.classList.add('pe-none');

        if ( this.additionalImagesButtonViewRef ) this.additionalImagesButtonViewRef.nativeElement.hidden = true;
    }

    public imagesTableRowsAnimationDone (event: AnimationEvent): void {
        const target: HTMLTableRowElement = event.element;

        target.classList.remove('pe-none');

        if ( this.additionalImagesButtonViewRef ) this.additionalImagesButtonViewRef.nativeElement.hidden = false;
    }
}