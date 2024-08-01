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
        private readonly _appService: AppService,
        private readonly _adminPanelService: AdminPanelService
    ) {
        this._socketServer.on('connection', async ( connection, request ) => {
            const splittedURL: string[] = ( request.url as string ).split('/');
            const webSocketClientId: number = parseFloat(splittedURL[splittedURL.length - 1].substring(2));

            if ( isNaN(webSocketClientId) ) {
                connection.terminate();

                return;
            }

            const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);
            const currentWebSocketClient: IWebSocketClient | undefined = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId);

            if ( !currentWebSocketClient ) {
                await commonServiceRef.throwWebSocketError(commonServiceRef, ' - ', webSocketClientId, 0); // (commonServiceRef, currentWebSocketClient.imagePath, webSocketClientId, currentWebSocketClient.imageMetaSize)
                
                connection.terminate();

                return;
            }

            currentWebSocketClient.connection = connection;

            let timer: number = 0;

            const timeoutInterval = setInterval(() => {
                timer++;
            
                try {
                    if ( ( Date.now() - currentWebSocketClient.lastkeepalive ) > 12000 ) {
                        this._connectionOnCloseErrorHandler(commonServiceRef, currentWebSocketClient, true);

                        clearInterval(timeoutInterval);
                    } else if ( currentWebSocketClient.connection ) {
                        const message: IWSMessage = this._adminPanelService.createMessage('timer', 'timer= ' + timer);
                
                        currentWebSocketClient.connection.send(JSON.stringify(message));
                    }
                    commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter(client => client.connection);
                } catch {
                    this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ this.webSocketServerPort }] WebSocket error`, true, 'webSocket');
                }
            }, 3000);

            this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ this.webSocketServerPort }] New connection established. WebSocketClientId --- ${ webSocketClientId }, login --- ${ currentWebSocketClient.login }`, false, 'webSocket');
                
            connection.on('message', async ( data, isBinary ) => await this._connectionOnMessageHandler(commonServiceRef, currentWebSocketClient, webSocketClientId, data, isBinary));

            connection.on('close', async () => {
                await this._connectionOnCloseErrorHandler(commonServiceRef, currentWebSocketClient, false);
                
                clearInterval(timeoutInterval);
            });

            connection.on('error', async () => await this._connectionOnCloseErrorHandler(commonServiceRef, currentWebSocketClient, true));
        });

        this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } Socket server running on port ${ this.webSocketServerPort }`, false, 'server');
    }

    private async _connectionOnMessageHandler (commonServiceRef: CommonService, currentWebSocketClient: IWebSocketClient, webSocketClientId: number, data: any, isBinary: boolean) {
        if ( data.toString() === "KEEP_ME_ALIVE" ) commonServiceRef.webSocketClients.forEach(client => client._id === webSocketClientId ? client.lastkeepalive = Date.now() : null);
        else {
            if ( isBinary ) {
                const fileData: string | Buffer = data;

                if ( currentWebSocketClient.uploadedSize === 0 ) await this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ this.webSocketServerPort }] WebSocketClientId --- ${ webSocketClientId }, 
                login --- ${ currentWebSocketClient.login }. Upload file ${ currentWebSocketClient.imageMetaName }, size --- ${ currentWebSocketClient.imageMetaSize } is started`, false, 'webSocket');

                currentWebSocketClient.uploadedSize += fileData.length;

                currentWebSocketClient.activeWriteStream.write(fileData, async () => {
                    const message = this._adminPanelService.createMessage('uploadImage', 'SUCCESS', { uploadedSize: currentWebSocketClient.uploadedSize, imageMetaSize: currentWebSocketClient.imageMetaSize });

                    await this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ this.webSocketServerPort }] WebSocketClientId --- ${ webSocketClientId }, 
                    login --- ${ currentWebSocketClient.login }. Chunk ${ currentWebSocketClient.currentChunkNumber } writed, size --> ${ fileData.length }`, false, 'webSocket');

                    currentWebSocketClient.currentChunkNumber += 1;

                    if ( currentWebSocketClient.uploadedSize === currentWebSocketClient.imageMetaSize ) currentWebSocketClient.activeWriteStream.end();
                    else ( currentWebSocketClient.connection as WebSocket ).send(JSON.stringify(message));
                });
            }
        }
    }

    private async _connectionOnCloseErrorHandler (commonServiceRef: CommonService, currentWebSocketClient: IWebSocketClient, error: boolean): Promise<void> {
        currentWebSocketClient.connection?.terminate();
        currentWebSocketClient.connection = null;

        if ( error || currentWebSocketClient.uploadedSize !== currentWebSocketClient.imageMetaSize ) {
            currentWebSocketClient.activeWriteStream.destroy();

            await fsPromises.unlink(currentWebSocketClient.imagePath);
            
            await this._appService.logLineAsync(
                `${ process.env.SERVER_DOMAIN } [${ process.env.WEBSOCKETSERVER_PORT }] WebSocket error. WebSocketClientId --- ${ currentWebSocketClient._id }, login --- ${ currentWebSocketClient.login }`,
                true, 'webSocket'
            );
        }

        commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter(client => client._id !== currentWebSocketClient._id);

        await this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ this.webSocketServerPort }] Connection disconnected. WebSocketClientId --- ${ currentWebSocketClient._id }, login --- ${ currentWebSocketClient.login }`, false, 'webSocket');
    }
}