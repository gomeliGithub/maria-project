import { Component, ComponentRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { ModalComponent } from '../modal/modal.component';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

import { IClientCompressedImage, IEventType } from 'types/models';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    animations: [
        trigger("portfolioContentAnimationTrigger", [
            state('visiable', style({ 
                opacity: '1'
            })),
            state('hide', style({ 
                opacity: '0'
            })),
            transition("void => *", animate(100)),
            transition("* => void", animate(100))
        ])
    ]
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

    public compressedImagesList: IClientCompressedImage[];

    public eventTypes: IEventType[][];

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.HOME', true).subscribe({
                next: translation => this.appService.setTitle(translation),
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });

            this.clientService.getCompressedImagesList('home').subscribe({
                next: imagesList => imagesList.length !== 0 ? this.compressedImagesList = imagesList : this.compressedImagesList = null,
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });

            this.clientService.getEventTypesData('home').subscribe({
                next: eventTypesData => {
                    const nullable: boolean = eventTypesData.some(eventTypesDataArr => eventTypesDataArr.some(eventTypeData => !eventTypeData.originalImageName ));

                    this.eventTypes = nullable ? null : eventTypesData;
                },
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });
        }
    }
}