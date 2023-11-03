import { Component, OnInit } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

import { AnimationEvent } from 'types/global';
import { IClientCompressedImage, IImagePhotographyType } from 'types/models';

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
                animate('0.3s 100ms ease-out')
            ]),
            transition('leave => enter', [
                animate('0.3s 100ms ease-out')
            ])
        ]),
        trigger('link-button-animation', [
            state('enter', style({ display: 'block' })),
            state('leave', style({ display: 'none' })),
            transition('enter => leave', [
                animate('0.2s', style({ display: 'none' }))
            ]),
            transition('leave => enter', [
                animate('0.2s', style({ display: 'block' }))
            ])
        ])
    ]
})
export class HomeComponent implements OnInit {
    constructor (
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    public val: number = 23;
    
    public currentMouseTriggerStates: string[] = [];

    public compressedImagesList: IClientCompressedImage[];

    public imagePhotographyTypes: IImagePhotographyType[][];
    public flatImagePhotographyTypes: IImagePhotographyType[];

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.HOME', true).subscribe(translation => this.appService.setTitle(translation));

            this.clientService.getCompressedImagesList('home').subscribe(imagesList => this.compressedImagesList = imagesList);
            
            this.clientService.getImagePhotographyTypesData('home').subscribe({
                next: imagePhotographyTypesData => {
                    this.imagePhotographyTypes = imagePhotographyTypesData;

                    this.flatImagePhotographyTypes = this.imagePhotographyTypes.flat();
                    this.flatImagePhotographyTypes.forEach(() => {
                        this.currentMouseTriggerStates.push('leave');
                    });
                },
                error: () => this.appService.createErrorModal()
            });
        }
    }

    public startMouseTriggerAnimation (index: number): void {
        this.currentMouseTriggerStates[index] = this.currentMouseTriggerStates[index] === 'enter' ? 'leave' : 'enter';
    }

    public setCurrentMouseTriggerStateIndex (name: string): number { 
        return this.flatImagePhotographyTypes.findIndex(imagePhotographyTypeData => imagePhotographyTypeData.name === name);
    }

    public mouseTriggerAnimationStarted (event: AnimationEvent): void {
        const mouseTriggerElement: HTMLDivElement = event.element as HTMLDivElement;
        // const indexNumber: number = parseInt(mouseTriggerElement.getAttribute('index-number'), 10);

        const linkButtonContainer: HTMLDivElement = mouseTriggerElement.nextElementSibling as HTMLDivElement;

        if ( event.toState === 'leave' ) linkButtonContainer.style.display = 'none';
    }

    public mouseTriggerAnimationDone (event: AnimationEvent): void {
        const mouseTriggerElement: HTMLDivElement = event.element as HTMLDivElement;
        // const indexNumber: number = parseInt(mouseTriggerElement.getAttribute('index-number'), 10);

        const linkButtonContainer: HTMLDivElement = mouseTriggerElement.nextElementSibling as HTMLDivElement;

        if ( event.toState === 'enter') {
            linkButtonContainer.style.display = 'block';
            
            // this.currentMouseTriggerAnimationsDone[indexNumber] = true;
        }
    }
}