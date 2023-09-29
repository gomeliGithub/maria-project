import { Injectable } from '@angular/core';

import { IWSMessage } from 'types/web-socket';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    constructor () { }

    private _connection: WebSocket | null;

    private _keepAliveTimer: any;

    private _currentChunkNumber: number;
    private _slicedImageData: ArrayBuffer[];

    private _progressElement: HTMLDivElement;

    public on (host: string, uploadImageInput: HTMLInputElement, slicedImageData: ArrayBuffer[], newClientId: number): void {
        this._connection = new WebSocket(host + `/:${newClientId}`);

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
                    this._clearUploadImageData(uploadImageInput);

                    this._changeProgressBar(message.percentUploaded, true);

                    setTimeout(() => this._changeProgressBar(0), 2000);
                } else if ( message.text === 'FINISH' ) { console.log(message.percentUploaded);
                    this._changeProgressBar(message.percentUploaded);

                    this._clearUploadImageData(uploadImageInput);

                    setTimeout(() => {
                        this._changeProgressBar(0);

                        const responseMessageElement: HTMLSpanElement = document.getElementById('responseMessage') as HTMLSpanElement;

                        responseMessageElement.textContent = "Файл успешно загружен.";
                    }, 1000);
                } else if ( message.text === 'SUCCESS' ) { console.log(message.percentUploaded);
                    this._changeProgressBar(message.percentUploaded);

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

    private _changeProgressBar (percentUploaded: number, error = false): void {
        this._progressElement.setAttribute('aria-valuenow', percentUploaded.toString());

        const progressBarElement: HTMLDivElement = this._progressElement.children[0] as HTMLDivElement;

        progressBarElement.style.width = `${percentUploaded}%`;
        progressBarElement.textContent = `${percentUploaded}%`;

        if ( error ) {
            progressBarElement.classList.add('bg-danger');
            progressBarElement.textContent = "Произошла ошибка при загрузке файла на сервер";
        }
    }

    private _clearUploadImageData (uploadImageInput: HTMLInputElement) {
        uploadImageInput.value = '';

        this._slicedImageData = [];
        this._currentChunkNumber = 0;
    }
}