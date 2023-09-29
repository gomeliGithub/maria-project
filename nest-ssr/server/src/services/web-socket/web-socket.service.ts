import { BadRequestException, Injectable } from '@nestjs/common';

import { WebSocketServer } from 'ws';

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

import { AppService } from '../../app.service';

import { IRequestBody } from 'types/global';
import { IImageMeta, IPercentUploadedOptions, IWSMessage, IWebSocketClient } from 'types/web-socket';

@Injectable()
export class WebSocketService {
    constructor (
        private readonly appService: AppService
    ) { }

    public webSocketServerPort: number = parseInt(process.env.WEBSOCKETSERVER_PORT, 10);

    public webSocketClients: IWebSocketClient[];

    public init () {
        const socketServer = new WebSocketServer({ port: this.webSocketServerPort }); 

        socketServer.on('connection', (connection, request) => {
            const webSocketClientId = parseFloat(request.url.substring(2));

            if ( isNaN(webSocketClientId) ) {
                connection.terminate();

                return;
            }

            const currentClient: IWebSocketClient = this.webSocketClients.find(client => client._id === webSocketClientId);

            if ( !currentClient ) {
                connection.terminate();

                return;
            }

            currentClient.connection = connection;

            this.appService.logLineAsync(`[${this.webSocketServerPort}] New connection established. WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}`);
                
            connection.on('message', async (data, isBinary) => this.connectionOnMessageHandler(currentClient, webSocketClientId, data, isBinary));

            connection.on('close', async () => this.connectionOnCloseHandler(currentClient, "TTTTTTTTTTTTTTTTTTTTTTTT"));

            connection.on('error', async () => this.connectionOnErrorHandler(currentClient, "TTTTTTTTTTTTTTTTTTTTTTTT"));

            this.setIntervalStart("TTTTTTTTTTTTTTTTTTTTTTTT");
        });

        this.appService.logLineAsync("Socket server running on port " + this.webSocketServerPort);
    }

    public async connectionOnMessageHandler (currentClient: IWebSocketClient, webSocketClientId: number, data: any, isBinary: boolean) {
        if ( data.toString() === "KEEP_ME_ALIVE" ) this.webSocketClients.forEach(client => client._id === webSocketClientId ? client.lastkeepalive = Date.now() : null);
        else {
            if ( isBinary ) {
                const fileData = data;

                if (currentClient.uploadedSize === 0) await this.appService.logLineAsync(`[${this.webSocketServerPort}] WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}. Upload file ${currentClient.imageMetaName}, size --- ${currentClient.imageMetaSize} is started`);

                currentClient.uploadedSize += fileData.length;

                currentClient.activeWriteStream.write(fileData, async () => {
                    const message = this.createMessage('uploadFile', 'SUCCESS', { uploadedSize: currentClient.uploadedSize, imageMetaSize: currentClient.imageMetaSize });

                    await this.appService.logLineAsync(`[${this.webSocketServerPort}] WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}. Chunk ${currentClient.currentChunkNumber} writed, size --> ${fileData.length}, allUploadedSize --> ${currentClient.uploadedSize}`);

                    currentClient.currentChunkNumber += 1;

                    if ( currentClient.uploadedSize === currentClient.imageMetaSize ) currentClient.activeWriteStream.end();
                    else currentClient.connection.send(JSON.stringify(message));
                });
            }
        }
    }

    public async connectionOnCloseHandler (currentClient: IWebSocketClient, newImagePath: string): Promise<void> {
        if (currentClient.uploadedSize !== currentClient.imageMetaSize) {
            await fsPromises.unlink(newImagePath);

            this.webSocketClients = this.webSocketClients.filter(client => client._id !== currentClient._id);
        }
    }

    public async connectionOnErrorHandler (currentClient: IWebSocketClient, newImagePath: string): Promise<void> {
        await fsPromises.unlink(newImagePath);

        this.webSocketClients = this.webSocketClients.filter(client => client._id !== currentClient._id);
    }

    public setIntervalStart (newImagePath: string) {
        let timer: number = 0;
        
        setInterval(() => {
            timer++;
        
            try {
                this.webSocketClients.forEach(client => {
                    if ( (Date.now() - client.lastkeepalive) > 12000 ) {
                        fsPromises.unlink(newImagePath).then(() => {
                            client.connection.terminate();
        
                            client.connection = null;
            
                            this.appService.logLineAsync(`[${this.webSocketServerPort}] Один из клиентов отключился, закрываем соединение с ним`);
                        });
                    } else if ( client.connection ) {
                        const message = this.createMessage('timer', 'timer= ' + timer);
        
                        client.connection.send(JSON.stringify(message));
                    }
                });
        
                this.webSocketClients = this.webSocketClients.filter(client => client.connection);
            } catch (error) {
                this.appService.logLineAsync(`[${this.webSocketServerPort}] WebSocketServer error`);
            }
        }, 3000);
    }

    public createMessage (eventType: string, eventText: string, percentUploadedOptions?: IPercentUploadedOptions) {
        const message: IWSMessage = {
            event: eventType,
            text: eventText
        }
    
        if ( percentUploadedOptions ) message.percentUploaded = Math.round((percentUploadedOptions.uploadedSize / percentUploadedOptions.imageMetaSize) * 100);
    
        return message;
    }

    public async uploadImage (requestBody: IRequestBody, activeClientLogin: string, imageMeta: IImageMeta, currentClientOriginalImagesDir: string, newOriginalImagePath: string): Promise<string> {
        const webSocketClientId = requestBody.client._id;

        const activeUploadClient = this.webSocketClients.some(client => client._id === webSocketClientId);
    
        let activeUploadsClientNumber = 0;
    
        this.webSocketClients.forEach(client => client.activeWriteStream ? activeUploadsClientNumber += 1 : null);
    
        if ( activeUploadClient ) {
            await this.appService.logLineAsync(`[${ process.env.SERVER_PORT }] UploadImage - webSocketClient with the same id is exists`);
    
            throw new BadRequestException();
        }
    
        if (activeUploadsClientNumber > 3) return 'PENDING';
    
        try {
            await fsPromises.access(newOriginalImagePath, fsPromises.constants.F_OK);
    
            return 'FILEEXISTS';
        } catch { }
    
        const uploadedFilesNumber = (await fsPromises.readdir(currentClientOriginalImagesDir)).length;
    
        if (uploadedFilesNumber >= 10) return 'MAXCOUNT';
        else if (imageMeta.size > 104857600) return 'MAXSIZE';
        else if (imageMeta.name.length < 4) return 'MAXNAMELENGTH';
    
        const currentChunkNumber: number = 0;
        const uploadedSize: number = 0;
    
        const writeStream = fs.createWriteStream(newOriginalImagePath);
    
        writeStream.on('error', async () => {
            await fsPromises.unlink(newOriginalImagePath);
    
            const currentClient = this.webSocketClients.find(client => client._id === webSocketClientId);
    
            await this.appService.logLineAsync(`[${ process.env.WEBSOCKETSERVER_PORT }] WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}. Stream error`);
    
            const message = this.createMessage('uploadImage', 'ERROR', { uploadedSize: currentClient.uploadedSize, imageMetaSize: imageMeta.size });
    
            currentClient.connection.send(JSON.stringify(message));
        });
    
        writeStream.on('finish', async () => {
            const currentClient = this.webSocketClients.find(client => client._id === webSocketClientId);
    
            const message = this.createMessage('uploadImage', 'FINISH', { uploadedSize: currentClient.uploadedSize, imageMetaSize: imageMeta.size });
    
            await this.appService.logLineAsync(`[${ process.env.WEBSOCKETSERVER_PORT }] WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}. All chunks writed, overall size --> ${currentClient.uploadedSize}. Image ${imageMeta.name} uploaded`);
    
            currentClient.connection.send(JSON.stringify(message));
            currentClient.connection.terminate();
            currentClient.connection = null;
    
            this.webSocketClients = this.webSocketClients.filter((client => client.connection));
        });
    
        this.webSocketClients.push({ 
            _id: webSocketClientId, 
            login: activeClientLogin,
            activeWriteStream: writeStream,
            currentChunkNumber, 
            uploadedSize, 
            imageMetaName: imageMeta.name, 
            imageMetaSize: imageMeta.size,
            lastkeepalive: Date.now(),
            connection: null
        });

        this.init();

        return 'START';
    }
}