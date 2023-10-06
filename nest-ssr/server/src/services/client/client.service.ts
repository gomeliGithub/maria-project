import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import sequelize, { NonNullFindOptions } from 'sequelize';

import fsPromises from 'fs/promises';
import path from 'path';

import { Response } from 'express';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { Admin, Member, ClientCompressedImage } from '../../models/client.model';

import { ICompressedImage, IRequest } from 'types/global';
import { IClientGetOptions, IDownloadOriginalImageOptions } from 'types/options';

@Injectable()
export class ClientService {
    constructor (
        private readonly appService: AppService,
        
        @InjectModel(Admin)
        private readonly adminModel: typeof Admin,
        @InjectModel(Member) 
        private readonly memberModel: typeof Member,
        @InjectModel(ClientCompressedImage)
        private readonly compressedImageModel: typeof ClientCompressedImage
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

    public async downloadOriginalImage (response: Response, options: IDownloadOriginalImageOptions): Promise<void> {
        if ( options.imagePath ) {
            response.download(options.imagePath);

            return;
        }

        if ( options.compressedImageName ) {
            const compressedImageData: ClientCompressedImage = await this.compressedImageModel.findOne({ where: { imageName: options.compressedImageName }});

            if ( compressedImageData ) response.download(path.join(compressedImageData.originalDirPath, compressedImageData.originalName));
            else throw new BadRequestException();

            return;
        }
    }

    public async getCompressedImagesList (imagesType: 'home' | 'gallery'): Promise<string[] | ICompressedImage[][]> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const imagesList: string[] = await fsPromises.readdir(path.join(this.compressedImagesDirPath, imagesType));

        const compressedImages = await commonServiceRef.getCompressedImages({
            find: {
                searchFields: imagesList,
                includeFields: [ 'imageName', 'imageEventType', 'imageDescription', 'uploadDate' ]
            }
        }) as unknown as ICompressedImage[];

        let reducedImagesList: ICompressedImage[][] = null;

        if ( imagesType === 'home' ) reducedImagesList = compressedImages.reduce((previousImage: ICompressedImage[][], currentImage, currentIndex) => {
            if ( currentIndex === 0 ) {
                previousImage[currentIndex] = [];

                previousImage[currentIndex].push(currentImage);
            } else if ( currentIndex === 1 ) previousImage[currentIndex - 1].push(currentImage);
            else if ( currentIndex % 2 === 0 ) {
                previousImage[previousImage.length] = [];

                previousImage[previousImage.length - 1].push(currentImage);
            } else previousImage[previousImage.length - 1].push(currentImage);

            return previousImage;
        }, []);

        return reducedImagesList ?? imagesList;
    }
}