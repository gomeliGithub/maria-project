import { Component, ComponentRef, ElementRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
    ) { }

    @ViewChild(ModalComponent) modalWindowComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    @ViewChild('uploadImageInput', { static: false }) private readonly uploadImageInputElementRef: ElementRef<HTMLInputElement>;

    private _imageFile: File;
    public fileSelected: boolean;
    
    public getFullCompressedImagesDataResult: Observable<IFullCompressedImageData>;

    public fullCompressedImagesList: ICompressedImage[];
    public fullCompressedImagesListCount: number;

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

        if ( fileList[0].size < 104857600 || fileList[0].name.length >= 4 ) {
            this._imageFile = fileList[0];
            this.fileSelected = true;
        }
    }

    public uploadImage (): void {
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
    
            this.http.post('/api/client/uploadImage', {
                client: {
                    _id: newClientId, 
                    uploadImageMeta: imageMetaJson
                }
            }, { headers, responseType: 'text', withCredentials: true }).subscribe({
                next: result => {
                    switch ( result ) {
                        case 'START': { this.fileSelected = false; this.adminPanelService.uploadImage(this._imageFile, this.uploadImageInputElementRef.nativeElement, newClientId, modalRef); break; }
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

        const originalImageName: string = deleteImageButton.getAttribute('originalImageName'); debugger;

        if ( deleteImageButton && originalImageName ) {
            this.spinnerHidden = false;

            const headers: HttpHeaders = this.appService.createRequestHeaders();

            this.http.post('/api/admin-panel/deleteImage', { 
                adminPanel: { originalImageName }
            }, { responseType: 'text', headers, withCredentials: true }).subscribe(responseText => {
                const currentDataRow: HTMLTableRowElement = deleteImageButton.parentElement.parentElement as HTMLTableRowElement;

                switch ( responseText ) {
                    case 'SUCCESS': { 
                        currentDataRow.remove(); 

                        this.spinnerHidden = true;

                        const successModal: ComponentRef<ModalComponent> = this.appService.createSuccessModal(this.modalViewRef, this.modalComponentRef, this.appService.getTranslations('ADMINPANEL.DELETEIMAGESUCCESSMESSAGE'));

                        successModal.onDestroy(() => window.location.reload());

                        break; 
                    }
                    case 'PENDING': { 
                        this.spinnerHidden = true;

                        this.appService.createWarningModal(this.modalViewRef, this.modalComponentRef, this.appService.getTranslations('UPLOADIMAGERESPONSES.PENDING')); 
                            
                        break; 
                    }
                    case 'ERROR': { this.spinnerHidden = true; this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef); break; }
                }
            });
        }
    }
}