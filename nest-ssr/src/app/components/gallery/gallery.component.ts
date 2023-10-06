import { Component, ComponentRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { Observable } from 'rxjs';

import { ModalComponent } from '../modal/modal.component';

import { AppService } from '../../../app/app.service';
import { ClientService } from '../../services/client/client.service';

@Component({
    selector: 'app-gallery',
    templateUrl: './gallery.component.html',
    styleUrls: ['./gallery.component.css']
})
export class GalleryComponent implements OnInit {
    constructor (
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    @ViewChild(ModalComponent) modalComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    public compressedImagesList: Observable<string[]>;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.GALLERY', true).subscribe({
                next: translation => this.appService.setTitle(translation),
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });

            this._getCompressedImagesList().subscribe({
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });
        }
    }

    private _getCompressedImagesList (): Observable<string[]> {
        return this.clientService.getCompressedImagesList('gallery').pipe(imagesList => this.compressedImagesList = imagesList);
    }
}