import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { ICompressedImage, IFullCompressedImageData } from 'types/global';

@Component({
    selector: 'app-admin-panel',
    templateUrl: './admin-panel.component.html',
    styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit {
    constructor (
        private readonly appService: AppService,
        private readonly adminPanelService: AdminPanelService
    ) { }

    private _imageFile: File;

    
    public getFullCompressedImagesDataResult: Observable<IFullCompressedImageData>;

    public fullCompressedImagesList: ICompressedImage[];
    public fullCompressedImagesListCount: number;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) this.adminPanelService.getFullCompressedImagesData().pipe<IFullCompressedImageData>(imagesList => this.getFullCompressedImagesDataResult = imagesList as Observable<IFullCompressedImageData>).subscribe(imagesList => {
            this.fullCompressedImagesList = imagesList.imagesList;
            this.fullCompressedImagesListCount = imagesList.count;
        });
    }

    public fileChange (event: any): void {
        const fileList: FileList = event.target.files;

        if (fileList.length < 1) {
            return;
        }

        this._imageFile = fileList[0];
    }

    public uploadImage (): void {
        return this.adminPanelService.uploadImage(this._imageFile);
    }
}