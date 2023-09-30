import { Injectable } from '@nestjs/common';
import { WebSocketServer } from 'ws';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { ClientService } from '../client/client.service';
import { CommonService } from '../common/common.service';

import { Admin, Member } from '../../models/client.model';

import { IWebSocketClient } from 'types/web-socket';

@Injectable()
export class WebSocketService {
    public webSocketServerPort: number = parseInt(process.env.WEBSOCKETSERVER_PORT, 10);

    private socketServer = new WebSocketServer({ port: this.webSocketServerPort });

    constructor (
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) {
        this.socketServer.on('connection', async (connection, request) => {
            const webSocketClientId: number = parseFloat(request.url.substring(2));

            if ( isNaN(webSocketClientId) ) {
                connection.terminate();

                return;
            }

            const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

            const currentClient: IWebSocketClient = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId);

            if ( !currentClient ) {
                connection.terminate();

                return;
            }

            currentClient.connection = connection;

            this.appService.logLineAsync(`[${this.webSocketServerPort}] New connection established. WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}`);
                
            connection.on('message', async (data, isBinary) => this.connectionOnMessageHandler(currentClient, webSocketClientId, data, isBinary));

            connection.on('close', async () => this.connectionOnCloseHandler(currentClient));

            connection.on('error', async () => this.connectionOnErrorHandler(currentClient));

            this.setIntervalStart();
        });

        this.appService.logLineAsync("Socket server running on port " + this.webSocketServerPort);
    }

    public async connectionOnMessageHandler (currentClient: IWebSocketClient, webSocketClientId: number, data: any, isBinary: boolean) {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        if ( data.toString() === "KEEP_ME_ALIVE" ) commonServiceRef.webSocketClients.forEach(client => client._id === webSocketClientId ? client.lastkeepalive = Date.now() : null);
        else {
            if ( isBinary ) {
                const fileData = data;

                if (currentClient.uploadedSize === 0) await this.appService.logLineAsync(`[${this.webSocketServerPort}] WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}. Upload file ${currentClient.imageMetaName}, size --- ${currentClient.imageMetaSize} is started`);

                currentClient.uploadedSize += fileData.length;

                currentClient.activeWriteStream.write(fileData, async () => {
                    const message = this.clientService.createMessage('uploadImage', 'SUCCESS', { uploadedSize: currentClient.uploadedSize, imageMetaSize: currentClient.imageMetaSize });

                    await this.appService.logLineAsync(`[${this.webSocketServerPort}] WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}. Chunk ${currentClient.currentChunkNumber} writed, size --> ${fileData.length}, allUploadedSize --> ${currentClient.uploadedSize}`);

                    currentClient.currentChunkNumber += 1;

                    if ( currentClient.uploadedSize === currentClient.imageMetaSize ) currentClient.activeWriteStream.end();
                    else currentClient.connection.send(JSON.stringify(message));
                });
            }
        }
    }

    public async connectionOnCloseHandler (currentClient: IWebSocketClient): Promise<void> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        if (currentClient.uploadedSize !== currentClient.imageMetaSize) {
            // const compressedImage = await commonServiceRef.getCompressedImages();

            // await commonServiceRef.removeUncompleteImages();
            
            commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter(client => client._id !== currentClient._id);
        }
    }

    public async connectionOnErrorHandler (currentClient: IWebSocketClient): Promise<void> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter(client => client._id !== currentClient._id);
    }

    public async setIntervalStart () {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        let timer: number = 0;

        setInterval(() => {
            timer++;
        
            try {
                commonServiceRef.webSocketClients.forEach(client => {
                    if ( (Date.now() - client.lastkeepalive) > 12000 ) {
                        client.connection.terminate();
        
                        client.connection = null;
            
                        this.appService.logLineAsync(`[${this.webSocketServerPort}] Один из клиентов отключился, закрываем соединение с ним`);
                    } else if ( client.connection ) {
                        const message = this.clientService.createMessage('timer', 'timer= ' + timer);
        
                        client.connection.send(JSON.stringify(message));
                    }
                });
        
                commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter(client => client.connection);
            } catch (error) {
                this.appService.logLineAsync(`[${this.webSocketServerPort}] WebSocketServer error`);
            }
        }, 3000);
    }
}