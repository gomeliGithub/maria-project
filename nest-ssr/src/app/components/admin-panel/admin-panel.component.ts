import { Component, ComponentRef, ElementRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs';

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
    
    public getFullCompressedImagesDataResult: Observable<IFullCompressedImageData>;

    public fullCompressedImagesList: ICompressedImage[];
    public fullCompressedImagesListCount: number;

    public responseMessage: string;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.ADMINPANEL', true).subscribe(translation => this.appService.setTitle(translation));

            this.adminPanelService.getFullCompressedImagesData().pipe<IFullCompressedImageData>(imagesList => this.getFullCompressedImagesDataResult = imagesList as Observable<IFullCompressedImageData>).subscribe(imagesList => {
                this.fullCompressedImagesList = imagesList.imagesList;
                this.fullCompressedImagesListCount = imagesList.count;
            });
        }
    }

    public fileChange (event: any): void {
        const fileList: FileList = event.target.files;

        if (fileList.length < 1) {
            return;
        }

        this._imageFile = fileList[0];
    }

    public uploadImage (): void {
        const imageMetaJson: string = JSON.stringify({
            name         : this._imageFile.name,
            size         : this._imageFile.size,
            type         : this._imageFile.type
        }); 

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
                switch (result) {
                    case 'START': { this.adminPanelService.uploadImage(this._imageFile, this.uploadImageInputElementRef.nativeElement, newClientId, modalRef); break; }
                    case 'PENDING': { this.responseMessage = "Сервер занят. Повторите попытку позже."; break; }
                    case 'FILEEXISTS': { this.responseMessage = "Файл с таким именем уже загружен."; break; }
                    case 'MAXCOUNT': { this.responseMessage = "Загружено максимальное количество файлов."; break; }
                    case 'MAXSIZE': { this.responseMessage = "Максимальный размер файла - 100 МБ."; break; }
                    case 'MAXNAMELENGTH': { this.responseMessage = "Имя файла должно содержать как минимум 4 символа."; break; }
                }
            },
            error: () => this.responseMessage = "Что-то пошло не так. Попробуйте ещё раз."
        });
    }
}