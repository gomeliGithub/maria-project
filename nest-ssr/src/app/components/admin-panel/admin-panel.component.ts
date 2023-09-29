import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { ICompressedImage } from 'types/global';

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

    
    public getFullCompressedImagesListResult: Observable<ICompressedImage[]>;

    public fullCompressedImagesList: ICompressedImage[];

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) this.adminPanelService.getFullCompressedImagesList().pipe<ICompressedImage[]>(imagesList => this.getFullCompressedImagesListResult = imagesList as Observable<ICompressedImage[]>).subscribe(imagesList => {
            this.fullCompressedImagesList = imagesList;
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