import { Component, ComponentRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { ModalComponent } from '../modal/modal.component';

import { AppService } from '../../../app/app.service';
import { ClientService } from '../../services/client/client.service';

import { IReducedGalleryCompressedImages } from 'types/global';

@Component({
    selector: 'app-gallery',
    templateUrl: './gallery.component.html',
    styleUrls: ['./gallery.component.css']
})
export class GalleryComponent implements OnInit {
    public photographyType: string;

    constructor (
        private readonly activateRoute: ActivatedRoute,
        private readonly router: Router,

        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) {
        this.photographyType = this.activateRoute.snapshot.paramMap.get('photographyType');
    }

    @ViewChild(ModalComponent) modalComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    public compressedImagesList: IReducedGalleryCompressedImages;
    public photographyTypeDescription: string;

    public url: string;

    ngOnInit (): void {
        this.router.events.subscribe((evt) => {
            if ( !(evt instanceof NavigationEnd) ) return;
            else this.url = evt.url;
            
            if ( this.url.startsWith('/gallery') ) window.location.reload();
        });

        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.GALLERY', true).subscribe({
                next: translation => this.appService.setTitle(translation),
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });

            this.clientService.getCompressedImagesList(this.photographyType).subscribe({
                next: data => {
                    if ( data.compressedImages.small.length === 0 && data.compressedImages.medium.length === 0 && data.compressedImages.big.length === 0) {
                        this.compressedImagesList = null;
                    } else this.compressedImagesList = data.compressedImages;

                    this.photographyTypeDescription = data.photographyTypeDescription ? data.photographyTypeDescription : null;
                },
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });
        }
    }
}