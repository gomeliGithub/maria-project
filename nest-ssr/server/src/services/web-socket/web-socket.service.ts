import { Injectable } from '@nestjs/common';
import { WebSocketServer, WebSocket } from 'ws';

import fsPromises from 'fs/promises';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../admin-panel/admin-panel.service';
import { CommonService } from '../common/common.service';

import { IWSMessage, IWebSocketClient } from 'types/web-socket';

@Injectable()
export class WebSocketService {
    public webSocketServerPort: number = parseInt(process.env.WEBSOCKETSERVER_PORT as string, 10);

    private _socketServer = new WebSocketServer({ port: this.webSocketServerPort });

    constructor (
        private readonly appService: AppService,
        private readonly adminPanelService: AdminPanelService
    ) {
        this._socketServer.on('connection', async ( connection, request ) => {
            const splittedURL: string[] = ( request.url as string ).split('/');
            const webSocketClientId: number = parseFloat(splittedURL[splittedURL.length - 1].substring(2));

            if ( isNaN(webSocketClientId) ) {
                connection.terminate();

                return;
            }

            const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);
            const currentWebSocketClient: IWebSocketClient | undefined = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId);

            if ( !currentWebSocketClient ) {
                await commonServiceRef.throwWebSocketError(commonServiceRef, ' - ', webSocketClientId, 0); // (commonServiceRef, currentWebSocketClient.imagePath, webSocketClientId, currentWebSocketClient.imageMetaSize)
                
                connection.terminate();

                return;
            }

            currentWebSocketClient.connection = connection;

            const timeoutInterval = this.setIntervalStart();

            this.appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ this.webSocketServerPort }] New connection established. WebSocketClientId --- ${ webSocketClientId }, login --- ${ currentWebSocketClient.login }`, false, 'webSocket');
                
            connection.on('message', async ( data, isBinary ) => this.connectionOnMessageHandler(currentWebSocketClient, webSocketClientId, data, isBinary));

            connection.on('close', async () => {
                this.connectionOnCloseHandler(currentWebSocketClient);
                
                clearInterval(await timeoutInterval);
            });

            connection.on('error', async () => this.connectionOnErrorHandler(currentWebSocketClient));
        });

        this.appService.logLineAsync(`${ process.env.SERVER_DOMAIN } Socket server running on port ${ this.webSocketServerPort }`, false, 'server');
    }

    public async connectionOnMessageHandler (currentWebSocketClient: IWebSocketClient, webSocketClientId: number, data: any, isBinary: boolean) {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        if ( data.toString() === "KEEP_ME_ALIVE" ) commonServiceRef.webSocketClients.forEach(client => client._id === webSocketClientId ? client.lastkeepalive = Date.now() : null);
        else {
            if ( isBinary ) {
                const fileData: string | Buffer = data;

                if ( currentWebSocketClient.uploadedSize === 0 ) await this.appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ this.webSocketServerPort }] WebSocketClientId --- ${ webSocketClientId }, 
                login --- ${ currentWebSocketClient.login }. Upload file ${ currentWebSocketClient.imageMetaName }, size --- ${ currentWebSocketClient.imageMetaSize } is started`, false, 'webSocket');

                currentWebSocketClient.uploadedSize += fileData.length;

                currentWebSocketClient.activeWriteStream.write(fileData, async () => {
                    const message = this.adminPanelService.createMessage('uploadImage', 'SUCCESS', { uploadedSize: currentWebSocketClient.uploadedSize, imageMetaSize: currentWebSocketClient.imageMetaSize });

                    await this.appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ this.webSocketServerPort }] WebSocketClientId --- ${ webSocketClientId }, 
                    login --- ${ currentWebSocketClient.login }. Chunk ${ currentWebSocketClient.currentChunkNumber } writed, size --> ${ fileData.length }`, false, 'webSocket');

                    currentWebSocketClient.currentChunkNumber += 1;

                    if ( currentWebSocketClient.uploadedSize === currentWebSocketClient.imageMetaSize ) currentWebSocketClient.activeWriteStream.end();
                    else ( currentWebSocketClient.connection as WebSocket ).send(JSON.stringify(message));
                });
            }
        }
    }

    public async connectionOnCloseHandler (currentWebSocketClient: IWebSocketClient): Promise<void> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        if ( currentWebSocketClient.uploadedSize !== currentWebSocketClient.imageMetaSize ) {
            await fsPromises.unlink(currentWebSocketClient.imagePath);
            
            commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter(client => client._id !== currentWebSocketClient._id);
        }
    }

    public async connectionOnErrorHandler (currentWebSocketClient: IWebSocketClient): Promise<void> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        await fsPromises.unlink(currentWebSocketClient.imagePath);

        commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter(client => client._id !== currentWebSocketClient._id);
    }

    public async setIntervalStart (): Promise<NodeJS.Timeout> {
        let timer: number = 0;

        return setInterval(() => {
            timer++;
        
            try {
                this.appService.getServiceRef(CommonModule, CommonService).then(commonServiceRef => {
                    commonServiceRef.webSocketClients.forEach(client => {
                        if ( ( Date.now() - client.lastkeepalive ) > 12000 ) {
                            ( client.connection as WebSocket ).terminate();
            
                            client.connection = null;
                
                            this.appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ this.webSocketServerPort }] Websocket client ${ client.login } disconnected`, false, 'webSocket');
                        } else if ( client.connection ) {
                            const message: IWSMessage = this.adminPanelService.createMessage('timer', 'timer= ' + timer);
            
                            client.connection.send(JSON.stringify(message));
                        }
                    });
            
                    commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter(client => client.connection);
                });
            } catch {
                this.appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ this.webSocketServerPort }] WebSocketServer error`, true, 'webSocket');
            }
        }, 3000);
    }
}