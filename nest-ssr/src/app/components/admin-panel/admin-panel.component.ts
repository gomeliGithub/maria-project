import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) this.getFullCompressedImagesList().subscribe(imagesList => console.log(imagesList));
    }

    private _imageFile: File;

    public fileChange (event: any): void {
        const fileList: FileList = event.target.files;

        if (fileList.length < 1) {
            return;
        }

        this._imageFile = fileList[0];
    }

    public fullCompressedImagesList: Observable<ICompressedImage[]>;

    public getFullCompressedImagesList (): Observable<ICompressedImage[]> {
        return this.adminPanelService.getFullCompressedImagesList().pipe<ICompressedImage[]>(imagesList => this.fullCompressedImagesList = imagesList as Observable<ICompressedImage[]>);
    }

    public uploadImage (): void {
        return this.adminPanelService.uploadImage(this._imageFile);
    }
}