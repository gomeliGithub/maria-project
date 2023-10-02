import { Component, ComponentRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { Observable, map } from 'rxjs';

import { ModalComponent } from '../modal/modal.component';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { ICompressedImage, IFullCompressedImageData } from 'types/global';
import { IModalRef } from 'types/options';

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
            'imageEventType': new FormControl(null, Validators.required),
            'image': new FormControl(null as FileList, [ Validators.required, this.imageValidator ]),
            'imageDescription': new FormControl(null)
        });
    }

    public uploadImageForm: FormGroup<{
        imageEventType: FormControl<string>;
        image: FormControl<FileList>;
        imageDescription: FormControl<string>;
    }>;

    @ViewChild(ModalComponent) modalWindowComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    private _imageFile: File;
    
    public getFullCompressedImagesDataResult: Observable<IFullCompressedImageData>;

    public fullCompressedImagesList: ICompressedImage[];
    public fullCompressedImagesListCount: number;

    public spinnerTitle: string;
    public spinnerHidden: boolean = true;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.ADMINPANEL', true).subscribe(translation => this.appService.setTitle(translation));

            this.adminPanelService.getFullCompressedImagesData().pipe<IFullCompressedImageData>(imagesList => this.getFullCompressedImagesDataResult = imagesList).pipe(map(imagesList => imagesList)).subscribe(imagesList => {
                this.fullCompressedImagesList = imagesList.imagesList;
                this.fullCompressedImagesListCount = imagesList.count;
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

    public uploadImage (): void {
        const { imageEventType, imageDescription } = this.uploadImageForm.value;

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
                }, { responseType: 'text', headers, withCredentials: true }).subscribe(responseText => {
                    this.adminPanelService.switchImageControlResponses(responseText, this.modalViewRef, this.modalComponentRef);
                });
            }
        }
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
                }, { responseType: 'text', headers, withCredentials: true }).subscribe({
                    next: responseText => this.adminPanelService.switchImageControlResponses(responseText, this.modalViewRef, this.modalComponentRef),
                    error: () => {
                        this.spinnerHidden = true;
                        
                        this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef);
                    }
                });
            }
        }
    }
}