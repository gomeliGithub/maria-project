import { Component, ComponentRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';

import { EMPTY, Observable, catchError, map } from 'rxjs';

import { ModalComponent } from '../modal/modal.component';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

import { IClientCompressedImage } from 'types/models';

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

    public observableCompressedImagesList: Observable<IClientCompressedImage[][]>;
    public compressedImagesList: IClientCompressedImage[][];

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.HOME', true).subscribe({
                next: translation => this.appService.setTitle(translation),
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });

            this.observableCompressedImagesList = this.clientService.getCompressedImagesList('home').pipe(map(imagesList => {
                this.compressedImagesList = imagesList.length !== 0 ? imagesList : null;

                return imagesList;
            }), catchError(() => {
                this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef);

                return EMPTY;
            }));
        }
    }
}