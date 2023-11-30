import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { ClientService } from '../../../services/client/client.service';

import { AnimationEvent, IReducedGalleryCompressedImages } from 'types/global';
import { IClientCompressedImage } from 'types/models';

@Component({
    selector: 'app-compressed-images',
    templateUrl: './compressed-images.component.html',
    styleUrl: './compressed-images.component.css',
    animations: [
        trigger('link-container-animation', [
            state('leave', style({
                opacity: 0,
                width: '0%',
            })),
            state('enter', style({
                opacity: 1,
                width: '100%',
            })),
            transition('leave => enter', [
                animate('500ms', style({ opacity: 1, width: '100%' }))
            ]),
            transition('enter => leave', [
                animate('500ms', style({ opacity: 0, width: '0%' }))
            ])
        ]),
        trigger('images-animation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(250px)' }),
                animate('1.5s ease', style({ opacity: 1, transform: 'translateY(0px)' }))
            ]),
            transition(':leave', [
                style({ opacity: 1, transform: 'translateY(0px)'}),
                animate('1.5s ease', style({ opacity: 0, transform: 'translateY(250px)' }))
            ])
        ])
    ]
})
export class CompressedImagesComponent implements AfterViewChecked {
    constructor (
        private readonly clientService: ClientService
    ) { }

    @Input() public photographyType: string;

    @Input() public compressedImagesList: IReducedGalleryCompressedImages = null;
    @Input() public compressedImagesListType: string = null;

    @Input() public mediumLinkContainerAnimationStates: string[] = [];
    @Input() public bigLinkContainerAnimationStates: string[] = [];

    @Input() public mediumLinkContainerAnimationDisplayValues: string[] = [];
    @Input() public bigLinkContainerAnimationDisplayValues: string[] = [];
    
    @Input() public flatMediumCompressedImagesList: IClientCompressedImage[];
    @Input() public flatBigCompressedImagesList: IClientCompressedImage[];

    @Output() public photographyTypeChange = new EventEmitter();
    @Output() public compressedImagesListChange = new EventEmitter();
    @Output() public compressedImagesListTypeChange = new EventEmitter();
    @Output() public mediumLinkContainerAnimationStatesChange = new EventEmitter();
    @Output() public bigLinkContainerAnimationStatesChange = new EventEmitter();
    @Output() public mediumLinkContainerAnimationDisplayValuesChange = new EventEmitter();
    @Output() public bigLinkContainerAnimationDisplayValuesChange = new EventEmitter();
    @Output() public flatMediumCompressedImagesListChange = new EventEmitter();
    @Output() public flatBigCompressedImagesListChange = new EventEmitter();

    set photographyTypeValue (value: string) {
        this.photographyType = value;
        this.photographyTypeChange.emit(this.photographyType);
    }

    set compressedImagesListValue (value: IReducedGalleryCompressedImages) {
        this.compressedImagesList = value;
        this.compressedImagesListChange.emit(this.compressedImagesList);
    }

    set compressedImagesListTypeValue (value: string) {
        this.compressedImagesListType = value;
        this.compressedImagesListTypeChange.emit(this.compressedImagesListType);
    }

    set mediumLinkContainerAnimationStatesValue (value: string[]) {
        this.mediumLinkContainerAnimationStates = value;
        this.mediumLinkContainerAnimationStatesChange.emit(this.mediumLinkContainerAnimationStates);
    }

    set bigLinkContainerAnimationStatesValue (value: string[]) {
        this.bigLinkContainerAnimationStates = value;
        this.bigLinkContainerAnimationStatesChange.emit(this.bigLinkContainerAnimationStates);
    }

    set mediumLinkContainerAnimationDisplayValuesValue (value: string[]) {
        this.mediumLinkContainerAnimationDisplayValues = value;
        this.mediumLinkContainerAnimationDisplayValuesChange.emit(this.mediumLinkContainerAnimationDisplayValues);
    }

    set bigLinkContainerAnimationDisplayValuesValue (value: string[]) {
        this.bigLinkContainerAnimationDisplayValues = value;
        this.bigLinkContainerAnimationDisplayValuesChange.emit(this.bigLinkContainerAnimationDisplayValues);
    }

    set flatMediumCompressedImagesListValue (value: IClientCompressedImage[]) {
        this.flatMediumCompressedImagesList = value;
        this.flatMediumCompressedImagesListChange.emit(this.flatMediumCompressedImagesList);
    }

    set flatBigCompressedImagesListValue (value: IClientCompressedImage[]) {
        this.flatBigCompressedImagesList = value;
        this.flatBigCompressedImagesListChange.emit(this.flatBigCompressedImagesList);
    }

    @ViewChildren('imageContainer', { read: ElementRef<HTMLDivElement> }) public imageContainerViewRefs: QueryList<ElementRef<HTMLDivElement>>;

    ngAfterViewChecked (): void {
        this.clientService.setGalleryImageContainerViewRefs(this.imageContainerViewRefs);
    }

    public setCurrentLinkContainerAnimationStateIndex (name: string, viewSizeType: string): number { 
        if ( viewSizeType === 'medium' ) return this.flatMediumCompressedImagesList.findIndex(compressedImageData => compressedImageData.name === name);
        if ( viewSizeType === 'big' ) return this.flatBigCompressedImagesList.findIndex(compressedImageData => compressedImageData.name === name);
    }

    public startLinkContainerAnimation (index: number, viewSizeType: string): void {
        switch ( viewSizeType ) {
            case 'medium': { 
                this.mediumLinkContainerAnimationStates[index] = this.mediumLinkContainerAnimationStates[index] === 'leave' ? 'enter' : 'leave';
                
                break;
            }

            case 'big': { 
                this.bigLinkContainerAnimationStates[index] = this.bigLinkContainerAnimationStates[index] === 'leave' ? 'enter' : 'leave';
                
                break;
            }
        }
    }

    public linkContainerAnimationStarted (event: AnimationEvent, index: number, viewSizeType: string): void {
        if ( event.toState === 'enter' ) switch ( viewSizeType ) {
            case 'medium': { this.mediumLinkContainerAnimationDisplayValues[index] = 'block'; break; }
            case 'big': { this.bigLinkContainerAnimationDisplayValues[index] = 'block'; break; }
        }
    }

    public linkContainerAnimationDone (event: AnimationEvent, index: number, viewSizeType: string): void {
        if ( event.toState === 'leave' ) switch ( viewSizeType ) {
            case 'medium': { this.mediumLinkContainerAnimationDisplayValues[index] = 'none'; break; }
            case 'big': { this.bigLinkContainerAnimationDisplayValues[index] = 'none'; break; }
        }
    }

    public imagesAnimationStarted (event: AnimationEvent): void {
        const target: HTMLDivElement = event.element;

        target.classList.add('pe-none');
    }

    public imagesAnimationDone (event: AnimationEvent): void {
        const target: HTMLDivElement = event.element;

        target.classList.remove('pe-none');
    }
}