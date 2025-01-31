import { EventEmitter, Injectable, StateKey, TransferState } from '@angular/core';

import { HomeComponent } from '../../components/home/home.component';

import { AppService } from '../../app.service';
import { ClientService } from '../client/client.service';

import { ICompressedImageWithoutRelationFields, IDiscount, IImagePhotographyType } from 'types/models';

@Injectable({
    providedIn: 'root'
})
export class HomeService {
    constructor (
        private readonly _transferState: TransferState,

        private readonly _appService: AppService,
        private readonly _clientService: ClientService
    ) { }

    public activeScrollSnapSectionChange: EventEmitter<number> = new EventEmitter();
    public discountsDataIsExistsChange: EventEmitter<boolean> = new EventEmitter();

    public setActiveScrollSnapSection (value: number): void {
        this.activeScrollSnapSectionChange.emit(value);
    }

    public setDiscountsDataIsExists (value: boolean): void {
        this.discountsDataIsExistsChange.emit(value);
    }

    public getCompressedImagesData (componentThis: HomeComponent, compressedImagesListDataStateKey: StateKey<ICompressedImageWithoutRelationFields[] | null>): void {
        this._clientService.getCompressedImagesData('home', 'horizontal').subscribe({
            next: imagesData => {
                componentThis.compressedImagesList = imagesData.length !== 0 ? imagesData : null;

                this._transferState.set(compressedImagesListDataStateKey, imagesData);
            },
            error: () => this._appService.createErrorModal()
        });
    }

    public getDiscountsData (componentThis: HomeComponent, discountsDataStateKey: StateKey<IDiscount[] | null>): void {
        this._clientService.getDiscountsData().subscribe({
            next: discountsData => {
                componentThis.discountsData = discountsData.length !== 0 ? discountsData : null;

                this._transferState.set(discountsDataStateKey, discountsData);

                if ( componentThis.discountsData !== null ) this.setDiscountsDataIsExists(true);
            },
            error: () => this._appService.createErrorModal()
        });
    }

    public getImagePhotographyTypesData (componentThis: HomeComponent, imagePhotographyTypesStateKey: StateKey<IImagePhotographyType[][] | null>): void {
        this._clientService.getImagePhotographyTypesData('home').subscribe({
            next: imagePhotographyTypesData => {
                componentThis.imagePhotographyTypes = imagePhotographyTypesData.length !== 0 ? imagePhotographyTypesData: null;

                this._transferState.set(imagePhotographyTypesStateKey, imagePhotographyTypesData);

                componentThis.setAnimationsStates();
            },
            error: () => this._appService.createErrorModal()
        });
    }
}