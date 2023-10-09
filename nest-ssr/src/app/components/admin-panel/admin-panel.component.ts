import { Component, ComponentRef, ElementRef, HostListener, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { Observable, map } from 'rxjs';

import { ModalComponent } from '../modal/modal.component';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { IFullCompressedImageData } from 'types/global';
import { IModalRef } from 'types/options';
import { IClientCompressedImage } from 'types/models';

@Component({
    selector: 'app-admin-panel',
    templateUrl: './admin-panel.component.html',
    styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit {
    constructor (
        private readonly http: HttpClient,

        private readonly appService: AppService,
        private readonly adminPanelService: AdminPanelService
    ) {
        this.uploadImageForm = new FormGroup({
            'imageEventType': new FormControl("", [ Validators.required, this.imageEventTypeValidator ]),
            'imageViewSizeType': new FormControl("", [ Validators.required, this.imageViewSizeTypeValidator ]),
            'image': new FormControl(null as FileList, [ Validators.required, this.imageValidator ]),
            'imageDescription': new FormControl("", Validators.maxLength(20))
        });

        this.changeImageDataForm = new FormGroup({
            'newImageEventType': new FormControl("", [ Validators.nullValidator, this.imageEventTypeValidator ]),
            'newImageViewSizeType': new FormControl("", [ Validators.nullValidator, this.imageViewSizeTypeValidator ]),
            'newImageDescription': new FormControl("", Validators.maxLength(20)) 
        });
    }

    public uploadImageForm: FormGroup<{
        imageEventType: FormControl<string>;
        imageViewSizeType: FormControl<string>;
        image: FormControl<FileList>;
        imageDescription: FormControl<string>;
    }>;

    public changeImageDataForm: FormGroup<{
        newImageEventType: FormControl<string>;
        newImageViewSizeType: FormControl<string>;
        newImageDescription: FormControl<string>;
    }>;

    @ViewChild('changeImageDataContainer', { static: false }) private readonly changeImageDataContainerViewRef: ElementRef<HTMLDivElement>;

    @HostListener('document:mousedown', [ '$event' ])
    public onGlobalClick (event): void {
       if ( !this.changeImageDataContainerViewRef.nativeElement.contains(event.target) ) {
            // clicked outside => close dropdown list
            this.changeImageDataFormHidden = true;
       }
    }

    public changeImageDataFormHidden: boolean = true;
    public changingOriginalImageName: string;

    @ViewChild(ModalComponent) modalWindowComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    private _imageFile: File;
    
    public getFullCompressedImagesDataResult: Observable<IFullCompressedImageData>;

    public fullCompressedImagesList: IClientCompressedImage[];
    public fullCompressedImagesListCount: number;

    public spinnerTitle: string;
    public spinnerHidden: boolean = true;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.ADMINPANEL', true).subscribe(translation => this.appService.setTitle(translation));

            this.adminPanelService.getFullCompressedImagesData().pipe<IFullCompressedImageData>(imagesList => this.getFullCompressedImagesDataResult = imagesList).pipe(map(imagesList => imagesList)).subscribe({
                next: imagesList => {
                    this.fullCompressedImagesList = imagesList.imagesList;
                    this.fullCompressedImagesListCount = imagesList.count;
                },
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });
        }
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

    public imageEventTypeValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        const imageEventTypes: string[] = [ 'wedding', 'holiday', 'birthday' ];

        if ( !imageEventTypes.includes(control.value) ) {
            return { 'imageEventType': true, 'newImageEventType': true };
        }

        return null;
    }

    public imageViewSizeTypeValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        const imageViewSizeTypes: string[] = [ 'small', 'medium', 'big' ];

        if ( !imageViewSizeTypes.includes(control.value) ) {
            return { 'imageViewSizeType': true, 'newImageViewSizeType': true };
        }

        return null;
    }

    public uploadImage (): void {
        const { imageEventType, imageViewSizeType, imageDescription } = this.uploadImageForm.value;

        const imageMetaJson: string = JSON.stringify({
            name         : this._imageFile ? this._imageFile.name : null,
            size         : this._imageFile ? this._imageFile.size : null,
            type         : this._imageFile ? this._imageFile.type : null
        }); 

        if ( this._imageFile ) {
            const modalRef: IModalRef = {
                modalViewRef: this.modalViewRef,
                modalComponentRef: this.modalComponentRef
            }
        
            const newClientId: number = Math.random();

            const headers: HttpHeaders = this.appService.createRequestHeaders();
    
            this.http.post('/api/admin-panel/uploadImage', {
                client: {
                    _id: newClientId, 
                    uploadImageMeta: imageMetaJson,
                    imageEventType,
                    imageViewSizeType,
                    imageDescription
                }
            }, { headers, responseType: 'text', withCredentials: true }).subscribe({
                next: result => {
                    switch ( result ) {
                        case 'START': { this.adminPanelService.uploadImage(this._imageFile, this.uploadImageForm, newClientId, modalRef); break; }
                        case 'PENDING': { this.appService.createWarningModal(this.modalViewRef, this.modalComponentRef, this.appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'FILEEXISTS': { this.appService.createWarningModal(this.modalViewRef, this.modalComponentRef, this.appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'MAXCOUNT': { this.appService.createWarningModal(this.modalViewRef, this.modalComponentRef, this.appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'MAXSIZE': { this.appService.createWarningModal(this.modalViewRef, this.modalComponentRef, this.appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                        case 'MAXNAMELENGTH': { this.appService.createWarningModal(this.modalViewRef, this.modalComponentRef, this.appService.getTranslations(`UPLOADIMAGERESPONSES.${ result }`)); break; }
                    }
                },
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });
        } else this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef);
    }

    public deleteImage (event: MouseEvent) {
        const deleteImageButton: HTMLButtonElement = event.target as HTMLButtonElement;

        if ( deleteImageButton ) {
            const originalImageName: string = deleteImageButton.getAttribute('originalImageName');

            if ( originalImageName ) {
                this.spinnerTitle = this.appService.getTranslations('SPINNERTITLES.DELETEIMAGE');
                this.spinnerHidden = false;

                const headers: HttpHeaders = this.appService.createRequestHeaders();

                this.http.post('/api/admin-panel/deleteImage', { 
                    adminPanel: { originalImageName }
                }, { headers, responseType: 'text', withCredentials: true }).subscribe({
                    next: responseText => this.adminPanelService.switchImageControlResponses(responseText, this.modalViewRef, this.modalComponentRef),
                    error: () => {
                        this.spinnerHidden = true;

                        this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef);
                    }
                });
            }
        } else this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef);
    }

    public changeImageDisplayTarget (event: MouseEvent) {
        const imageButton: HTMLButtonElement = event.target as HTMLButtonElement;

        if ( imageButton ) {
            const originalImageName: string = imageButton.getAttribute('originalImageName');
            const displayTargetPage: string = imageButton.getAttribute('targetPage');

            if ( originalImageName && displayTargetPage ) {
                this.spinnerTitle = this.appService.getTranslations('SPINNERTITLES.DISPLAYIMAGE');
                this.spinnerHidden = false;

                const headers: HttpHeaders = this.appService.createRequestHeaders();

                this.http.post('/api/admin-panel/changeImageDisplayTarget', {
                    adminPanel: { originalImageName, displayTargetPage }
                }, { headers, responseType: 'text', withCredentials: true }).subscribe({
                    next: responseText => this.adminPanelService.switchImageControlResponses(responseText, this.modalViewRef, this.modalComponentRef),
                    error: () => {
                        this.spinnerHidden = true;
                        
                        this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef);
                    }
                });
            }
        } else this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef);
    }

    public changeImageData (): void {
        const { newImageEventType, newImageDescription } = this.changeImageDataForm.value;

        const originalImageName: string = this.changingOriginalImageName;

        if ( originalImageName ) {
            this.spinnerHidden = false;

            const headers: HttpHeaders = this.appService.createRequestHeaders();

            this.http.put('/api/admin-panel/changeImageData', {
                adminPanel: { originalImageName, newImageEventType, newImageDescription }
            }, { responseType: 'text', headers, withCredentials: true }).subscribe({
                next: responseText => {
                    this.changeImageDataFormHidden = true;
                    this.spinnerHidden = true;

                    this.adminPanelService.switchImageControlResponses(responseText, this.modalViewRef, this.modalComponentRef);

                    this.changeImageDataForm.reset();
                },
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });
        } else this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef);
    }

    public changeImageFormActivate (event: MouseEvent): void {
        const imageButton: HTMLButtonElement = event.target as HTMLButtonElement;

        if ( imageButton ) {
            this.changeImageDataFormHidden = false;

            this.changingOriginalImageName = imageButton.getAttribute('originalImageName');
        } else this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef);
    }
}