import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import sequelize, { NonNullFindOptions } from 'sequelize';

import * as fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import { Response } from 'express';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { Admin, Member, СompressedImage } from '../../models/client.model';

import { IRequest, IRequestBody } from 'types/global';
import { IClientGetOptions, IDownloadOriginalImageOptions } from 'types/options';
import { IImageMeta, IPercentUploadedOptions, IWSMessage, IWebSocketClient } from 'types/web-socket';

@Injectable()
export class ClientService {
    constructor (
        private readonly appService: AppService,
        
        @InjectModel(Admin)
        private readonly adminModel: typeof Admin,
        @InjectModel(Member) 
        private readonly memberModel: typeof Member,
        @InjectModel(СompressedImage)
        private readonly compressedImageModel: typeof СompressedImage
    ) { }

    public compressedImagesDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_thumbnail');

    public async get (request: IRequest, loginList: string, options?: IClientGetOptions): Promise<Admin | Member>
    public async get (request: IRequest, loginList: string[], options?: IClientGetOptions): Promise<Admin[] | Member[]>
    public async get (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]>
    public async get (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]> {
        const findOptions: NonNullFindOptions = {
            raw: false, 
            where: { login: loginList },
            attributes: null,
            rejectOnEmpty: true
        }

        let clients: Admin | Member | Admin[] | Member[] = null;

        if ( options && options.includeFields ) findOptions.attributes = options.includeFields;
        if ( options && options.hasOwnProperty('rawResult') ) findOptions.raw = options.rawResult;

        if ( options && !options.clientType ) {
            try {
                if ( !Array.isArray(loginList) ) {
                    clients = await Promise.any([
                        this.adminModel.findOne(findOptions),
                        this.memberModel.findOne(findOptions)
                    ]);
                } else {
                    clients = (await Promise.any([
                        this.adminModel.findAll(findOptions),
                        this.memberModel.findAll(findOptions)
                    ]));
                }
            } catch {
                return null;
            }
        }

        if ( !(clients instanceof Admin) || (Array.isArray(clients) && !clients.every(client => client instanceof Admin)) ) {
            if ( !Array.isArray(clients) ) {

            } else {

            }
        }

        return clients;
    }

    public async registerClientLastActivityTime (client: Admin | Member): Promise<void> {
        await client.update({ lastActiveDate: sequelize.literal('CURRENT_TIMESTAMP') });
    }

    public async registerClientLastLoginTime (client: Admin | Member): Promise<void> {
        await client.update({ lastSignInDate: sequelize.literal('CURRENT_TIMESTAMP') });
    }

    public async uploadImage (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeClientLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });

        let imageMeta: IImageMeta = null;

        try {
            imageMeta = JSON.parse(requestBody.client.uploadImageMeta);
        } catch {
            await this.appService.logLineAsync(`[${ process.env.SERVER_PORT }] UploadImage - not valid imageMeta`);
    
            throw new BadRequestException();
        }

        const originalImagesDirPath: string = this.appService.clientOriginalImagesDir;
        const originalImagesDirClientPath: string = path.join(this.appService.clientOriginalImagesDir, activeClientLogin);
        const compressedImagesDirPath: string = this.appService.clientCompressedImagesDir;
        const compressedImagesDirClientPath: string = path.join(this.appService.clientCompressedImagesDir, activeClientLogin);

        const newOriginalImagePath: string = path.join(originalImagesDirClientPath, imageMeta.name);

        await commonServiceRef.createImageDirs({
            originalImages: { dirPath: originalImagesDirPath, clientDirPath: originalImagesDirClientPath },
            compressedImages: { dirPath: compressedImagesDirPath, clientDirPath: compressedImagesDirClientPath }
        });

        const webSocketClientId = requestBody.client._id;

        const activeUploadClient = commonServiceRef.webSocketClients.some(client => client._id === webSocketClientId);
    
        let activeUploadsClientNumber = 0;
    
        commonServiceRef.webSocketClients.forEach(client => client.activeWriteStream ? activeUploadsClientNumber += 1 : null);
    
        if ( activeUploadClient ) {
            await this.appService.logLineAsync(`[${ process.env.SERVER_PORT }] UploadImage - webSocketClient with the same id is exists`);
    
            throw new BadRequestException();
        }
    
        if ( activeUploadsClientNumber > 3 ) return 'PENDING';

        const client: Admin | Member = await commonServiceRef.getClients(request, activeClientLogin, { rawResult: false });
        const compressedImage: СompressedImage[] = (await commonServiceRef.getCompressedImages(client, client.dataValues.type)).rows;

        if ( compressedImage ) return 'FILEEXISTS';
    
        try {
            await fsPromises.access(newOriginalImagePath, fsPromises.constants.F_OK);
    
            return 'FILEEXISTS';
        } catch { }
    
        const uploadedFilesNumber = (await fsPromises.readdir(originalImagesDirClientPath)).length;
    
        if ( uploadedFilesNumber >= 10 ) return 'MAXCOUNT';
        else if ( imageMeta.size > 104857600 ) return 'MAXSIZE';
        else if ( imageMeta.name.length < 4 ) return 'MAXNAMELENGTH';
    
        const currentChunkNumber: number = 0;
        const uploadedSize: number = 0;
    
        const writeStream = fs.createWriteStream(newOriginalImagePath);
    
        writeStream.on('error', async () => {
            const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

            await fsPromises.unlink(newOriginalImagePath);
    
            const currentClient = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId);
    
            await this.appService.logLineAsync(`[${ process.env.WEBSOCKETSERVER_PORT }] WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}. Stream error`);
    
            const message = this.createMessage('uploadImage', 'ERROR', { uploadedSize: currentClient.uploadedSize, imageMetaSize: imageMeta.size });
    
            currentClient.connection.send(JSON.stringify(message));
        });
    
        writeStream.on('finish', async () => {
            const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

            const currentClient: IWebSocketClient = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId);
    
            const successMessage: IWSMessage = this.createMessage('uploadImage', 'FINISH', { 
                uploadedSize: currentClient.uploadedSize, 
                imageMetaSize: imageMeta.size 
            });
    
            await this.appService.logLineAsync(`[${ process.env.WEBSOCKETSERVER_PORT }] WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}. All chunks writed, overall size --> ${currentClient.uploadedSize}. Image ${imageMeta.name} uploaded`);

            const compressResult: boolean = await commonServiceRef.compressImage(request, newOriginalImagePath, compressedImagesDirClientPath, imageMeta.size, activeClientLogin);

            if ( !compressResult ) {
                const errorMessage: IWSMessage = this.createMessage('uploadImage', 'ERROR');

                currentClient.connection.send(JSON.stringify(errorMessage));
            } else currentClient.connection.send(JSON.stringify(successMessage));

            currentClient.connection.terminate();
            currentClient.connection = null;
    
            commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter((client => client.connection));
        });

        commonServiceRef.webSocketClients.push({ 
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

        return 'START';
    }
    
    public createMessage (eventType: string, eventText: string, percentUploadedOptions?: IPercentUploadedOptions) {
        const message: IWSMessage = {
            event: eventType,
            text: eventText
        }
    
        if ( percentUploadedOptions ) message.percentUploaded = Math.round((percentUploadedOptions.uploadedSize / percentUploadedOptions.imageMetaSize) * 100);
    
        return message;
    }

    public async downloadOriginalImage (response: Response, options: IDownloadOriginalImageOptions): Promise<void> {
        if ( options.imagePath ) {
            response.download(options.imagePath);

            return;
        }

        if ( options.compressedImageName ) {
            const compressedImageData: СompressedImage = await this.compressedImageModel.findOne({ where: { imageName: options.compressedImageName }});

            if ( compressedImageData ) response.download(path.join(compressedImageData.originalImageDirPath, compressedImageData.originalImageName));
            else throw new BadRequestException();

            return;
        }
    }

    public async getCompressedImagesList (imagesType: string): Promise<string[]> {
        const compressedImagesDirPaths: string[] = [ 'main' ];

        if ( !compressedImagesDirPaths.includes(imagesType) ) throw new BadRequestException();

        const imagesList: string[] = await fsPromises.readdir(path.join(this.compressedImagesDirPath, imagesType));

        return imagesList;
    }
}