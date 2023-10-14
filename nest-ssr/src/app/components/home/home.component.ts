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
        trigger('mouseTrigger', [
            state('enter', style({
                opacity: 0.4,
                transform: 'rotate3d(0, -5, 0, -0.5turn) scale(0.8)'
            })),
            state('leave', style({
                opacity: 1
            })),
            transition('enter => leave', [
                animate('0.4s ease-in-out')
            ]),
            transition('leave => enter', [
                animate('0.4s ease-in-out')
            ])
        ]),
    ]
})
export class HomeComponent implements OnInit {
    constructor (
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }
    
    public currentMouseTriggerStates: string[] = [];

    @ViewChild(ModalComponent) modalComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    public compressedImagesList: IClientCompressedImage[];

    public eventTypes: IEventType[][];
    public flatEventTypes: IEventType[];

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

                    this.flatEventTypes = eventTypesData.flat();
                    this.flatEventTypes.forEach(() => this.currentMouseTriggerStates.push('leave'));

                    this.eventTypes = nullable ? null : eventTypesData;
                },
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });
        }
    }

    public startMouseTriggerAnimation (index: number): void {
        this.currentMouseTriggerStates[index] = this.currentMouseTriggerStates[index] === 'enter' ? 'leave' : 'enter';
    }

    public stopMouseTriggerAnimation (index: number): void {
        this.currentMouseTriggerStates[index] = this.currentMouseTriggerStates[index] === 'leave' ? 'enter' : 'leave';
    }

    public setCurrentMouseTriggerStateIndex (name: string): number {
        return this.flatEventTypes.findIndex(eventTypeData => eventTypeData.name === name);
    }
}