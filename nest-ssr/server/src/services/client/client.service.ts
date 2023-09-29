import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import sequelize, { NonNullFindOptions } from 'sequelize';

import fsPromises from 'fs/promises';
import path from 'path';

import { Response } from 'express';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';
import { WebSocketService } from '../web-socket/web-socket.service';

import { Admin, Member, СompressedImage } from '../../models/client.model';

import { IRequest, IRequestBody } from 'types/global';
import { IClientGetOptions, IDownloadOriginalImageOptions } from 'types/options';
import { IImageMeta } from 'types/web-socket';

@Injectable()
export class ClientService {
    constructor (
        private readonly appService: AppService,
        private readonly webSocketService: WebSocketService,
        
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

        const currentClientOriginalImagesDir: string = path.join(this.appService.clientOriginalImagesDir, activeClientLogin);
        const newOriginalImagePath: string = path.join(currentClientOriginalImagesDir, imageMeta.name);

        try {
            fsPromises.access(currentClientOriginalImagesDir, fsPromises.constants.F_OK)
        } catch {
            fsPromises.mkdir(currentClientOriginalImagesDir);
        }

        try {
            fsPromises.access(this.appService.clientOriginalImagesDir, fsPromises.constants.F_OK)
        } catch {
            fsPromises.mkdir(this.appService.clientOriginalImagesDir);
        }
        
        return this.webSocketService.uploadImage(requestBody, activeClientLogin, imageMeta, currentClientOriginalImagesDir, newOriginalImagePath);
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