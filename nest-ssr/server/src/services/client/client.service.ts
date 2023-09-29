import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import sequelize, { NonNullFindOptions } from 'sequelize';

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import { Response } from 'express';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { Admin, Member, СompressedImage } from '../../models/client.model';

import { IRequest } from 'types/global';
import { IClientGetOptions, IDownloadOriginalImageOptions } from 'types/options';

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

    public async uploadImage (request: IRequest, imageName: string): Promise<void> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeClientLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });

        const currentClientOriginalImagesDir: string = path.join(this.appService.clientOriginalImagesDir, activeClientLogin);
        const newOriginalImagePath: string = path.join(currentClientOriginalImagesDir, imageName);

        try {
            await fsPromises.access(this.appService.clientOriginalImagesDir, fsPromises.constants.F_OK)
        } catch {
            await fsPromises.mkdir(this.appService.clientOriginalImagesDir);
        }

        try {
            await fsPromises.access(currentClientOriginalImagesDir, fsPromises.constants.F_OK)
        } catch {
            await fsPromises.mkdir(currentClientOriginalImagesDir);
        }

        const writeStream: fs.WriteStream = fs.createWriteStream(newOriginalImagePath);

        request.on('data', chunk => {
            console.log(chunk.length, ' is downloaded');
        });

        request.on('end', () => {
            console.log("Resource has been downloaded");

            writeStream.end()
        });

        writeStream.on('error', async error => {
            console.error(error);

            await fsPromises.unlink(newOriginalImagePath);

            throw new InternalServerErrorException();
        });

        writeStream.on('close', async () => {
            console.log("File has been written");

            const compressResult: boolean = await commonServiceRef.compressImage(request, newOriginalImagePath, path.join(this.appService.clientCompressedImagesDir), activeClientLogin);

            if ( !compressResult ) throw new InternalServerErrorException();
        });

        request.on('error', async error => {
            console.error(error);

            await fsPromises.unlink(newOriginalImagePath);

            throw new InternalServerErrorException();
        });
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