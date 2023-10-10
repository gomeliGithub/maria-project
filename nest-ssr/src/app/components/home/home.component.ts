import { Component, ComponentRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';

import { Observable } from 'rxjs';

import { ModalComponent } from '../modal/modal.component';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

import { IClientCompressedImage } from 'types/models';
import { ISizedHomeImages } from 'types/global';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
    constructor (
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    @ViewChild(ModalComponent) modalComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    public observableCompressedImagesList: Observable<ISizedHomeImages>;
    public compressedImagesList: IClientCompressedImage[][][] = [];

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.HOME', true).subscribe({
                next: translation => this.appService.setTitle(translation),
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });

            this.clientService.getCompressedImagesList('home').subscribe({
                next: imagesList => {
                    if ( imagesList.small.length !== 0 || imagesList.medium.length !== 0 || imagesList.big.length !== 0 ) {
                        this.compressedImagesList.push(imagesList.small, imagesList.medium, imagesList.big);

                    } else this.compressedImagesList = null;
                },
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            })
        }
    }
}