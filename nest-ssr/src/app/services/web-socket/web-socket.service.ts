import { Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { AppService } from '../../app.service';

import { IWSMessage } from 'types/web-socket';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    private _connection: WebSocket | null;

    private _keepAliveTimer: any;

    private _currentChunkNumber: number;
    private _slicedImageData: ArrayBuffer[];

    public progressBarVisible: boolean = false;
    public progressBarValue: number = 0;
    public componentClass: string;

    constructor (
        private readonly _appService: AppService
    ) { }

    public on (host: string, uploadImageForm: FormGroup<{
        imagePhotographyType: FormControl<string | null>;
        imageDisplayType: FormControl<string | null>;
        image: FormControl<FileList | null>;
        imageDescription: FormControl<string | null>;
    }>, slicedImageData: ArrayBuffer[], newClientId: number): void {
        // this._connection = new WebSocket(host + `/:${newClientId}`);
        this._connection = new WebSocket(`${ host }/:${ newClientId }`);

        this._connection.onopen = () => {
            this._keepAliveTimer = setInterval(() => {
                this.send('KEEP_ME_ALIVE');
            }, 5000);

            this.progressBarVisible = true;
            this.componentClass = 'pointerEventsNone2';

            this.sendImage(slicedImageData, 0);
        };

        this._connection.onmessage = (event: MessageEvent<IWSMessage>) => {
            const message: IWSMessage = JSON.parse(event.data as unknown as string);

            if ( message.event === 'uploadImage' ) {
                if ( message.text === 'ERROR' ) {
                    this._clearUploadImageData(uploadImageForm);

                    setTimeout(() => {
                        this.progressBarValue = 0;
                        this.progressBarVisible = false;
                        this.componentClass = '';

                        ( this._connection as WebSocket ).close();

                        this._appService.createErrorModal();
                    }, 2000);
                } else if ( message.text === 'FINISH' ) {
                    ( this._connection as WebSocket ).close();

                    this.progressBarValue = message.percentUploaded as number;

                    this._clearUploadImageData(uploadImageForm);

                    setTimeout(() => {
                        this.progressBarValue = 0;

                        this.progressBarVisible = false;
                        this.componentClass = '';

                        this._appService.createSuccessModal(this._appService.getTranslations('UPLOADIMAGERESPONSES.FINISH'));

                        window.location.reload();
                    }, 1000);
                } else if ( message.text === 'SUCCESS' ) {
                    this.progressBarValue = message.percentUploaded as number;

                    this.sendImage(this._slicedImageData, this._currentChunkNumber += 1);
                }
            }
        }

        this._connection.onerror = error => {
            console.log('WebSocket error: ', error);
        };

        this._connection.onclose = () => {
            this._connection = null;

            clearInterval(this._keepAliveTimer);
        };
    }

    public send (data: string | Blob | ArrayBuffer): void {
        if ( this._connection ) this._connection.send(data);
    }

    public sendImage (slicedImageData: ArrayBuffer[], chunkNumber: number): void {
        if ( !this._slicedImageData || this._slicedImageData.length === 0 ) this._slicedImageData = slicedImageData;
        
        this._currentChunkNumber = chunkNumber;

        this.send(slicedImageData[chunkNumber]);
    }

    private _clearUploadImageData (uploadImageForm: FormGroup<{
        imagePhotographyType: FormControl<string | null>;
        imageDisplayType: FormControl<string | null>;
        image: FormControl<FileList | null>;
        imageDescription: FormControl<string | null>;
    }>) {
        uploadImageForm.reset();

        this._slicedImageData = [];
        this._currentChunkNumber = 0;
    }
}