import { ComponentRef, Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { ModalComponent } from '../../components/modal/modal.component';

import { AppService } from '../../app.service';
import { ModalService } from '../modal/modal.service';

import { IModalRef } from 'types/options';
import { IWSMessage } from 'types/web-socket';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    constructor (
        private readonly appService: AppService,
        private readonly modalService: ModalService
    ) { }

    private _connection: WebSocket | null;

    private _keepAliveTimer: any;

    private _currentChunkNumber: number;
    private _slicedImageData: ArrayBuffer[];

    private _modal: ComponentRef<ModalComponent>;
    private _progressElement: HTMLDivElement;

    public on (host: string, uploadImageForm: FormGroup<{
        imageEventType: FormControl<string>;
        image: FormControl<FileList>;
        imageDescription: FormControl<string>;
    }>, slicedImageData: ArrayBuffer[], newClientId: number, modalRef: IModalRef): void {
        this._connection = new WebSocket(host + `/:${newClientId}`);

        this._modal = this.appService.createModalInstance(modalRef.modalViewRef, {
            title: this.appService.getTranslations('PROGRESSBAR.TITLE'),
            type: 'progressBar',
            confirmButton: false
        });

        this._modal.onDestroy(() => this._connection ? this._connection.close() : null);

        this._keepAliveTimer = setInterval(() => {
            this.send('KEEP_ME_ALIVE');
        }, 5000);

        this._connection.onopen = () => {
            this._progressElement = document.getElementById('progressBar') as HTMLDivElement;

            this.sendImage(slicedImageData, 0);
        };

        this._connection.onmessage = (event: MessageEvent<IWSMessage>) => {
            const message: IWSMessage = JSON.parse(event.data as unknown as string);
            
            // console.log(`Клиентом получено сообщение от сервера: ${message.event} ----- ${message.text}`);

            if ( message.event === 'uploadImage' ) {
                if ( message.text === 'ERROR' ) {
                    this._clearUploadImageData(uploadImageForm);

                    setTimeout(() => {
                        this.modalService.changeProgressBar(this._progressElement, 0)

                        this._modal.instance.hideModal().then(() => {
                            this._modal.destroy();

                            this.appService.createErrorModal(modalRef.modalViewRef, modalRef.modalComponentRef);
                        });
                    }, 2000);
                } else if ( message.text === 'FINISH' ) { // console.log(message.percentUploaded);
                    this.modalService.changeProgressBar(this._progressElement, message.percentUploaded);

                    this._clearUploadImageData(uploadImageForm);

                    setTimeout(() => {
                        this.modalService.changeProgressBar(this._progressElement, 0);

                        this._modal.instance.hideModal().then(() => {
                            this._modal.destroy();

                            this.appService.createSuccessModal(modalRef.modalViewRef, modalRef.modalComponentRef, this.appService.getTranslations('UPLOADIMAGERESPONSES.FINISH'));
                        });
                    }, 1000);
                } else if ( message.text === 'SUCCESS' ) { // console.log(message.percentUploaded);
                    this.modalService.changeProgressBar(this._progressElement, message.percentUploaded);

                    this.sendImage(this._slicedImageData, this._currentChunkNumber += 1);
                }
            }
        }

        this._connection.onerror = error => {
            console.log('WebSocket error: ', error);
        };

        this._connection.onclose = () => {
            console.log("Соединение с сервером закрыто");
            
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
        imageEventType: FormControl<string>;
        image: FormControl<FileList>;
        imageDescription: FormControl<string>;
    }>) {
        uploadImageForm.reset();

        this._slicedImageData = [];
        this._currentChunkNumber = 0;
    }
}