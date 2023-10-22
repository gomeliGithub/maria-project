import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

import sequelize, { NonNullFindOptions } from 'sequelize';
import ms from 'ms';

import fsPromises from 'fs/promises';
import path from 'path';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';
import { JwtControlService } from '../sign/jwt-control.service';

import { Admin, Member, ClientCompressedImage, ImagePhotographyType } from '../../models/client.model';

import { IClient, ICookieSerializeOptions, IGalleryCompressedImagesList, IReducedGalleryCompressedImages, IRequest } from 'types/global';
import { IClientGetOptions, IDownloadOriginalImageOptions } from 'types/options';
import { IClientCompressedImage, IImagePhotographyType } from 'types/models';

@Injectable()
export class ClientService {
    constructor (
        private readonly jwtService: JwtService,
        
        private readonly appService: AppService,
        private readonly jwtControlService: JwtControlService,
        
        @InjectModel(Admin)
        private readonly adminModel: typeof Admin,
        @InjectModel(Member) 
        private readonly memberModel: typeof Member,
        @InjectModel(ClientCompressedImage)
        private readonly compressedImageModel: typeof ClientCompressedImage,
        @InjectModel(ImagePhotographyType)
        private readonly imagePhotographyTypeModel: typeof ImagePhotographyType
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
            const compressedImageData: ClientCompressedImage = await this.compressedImageModel.findOne({ where: { name: options.compressedImageName }});

            if ( compressedImageData ) response.download(path.join(compressedImageData.originalDirPath, compressedImageData.originalName));
            else throw new BadRequestException();

            return;
        }
    }

    public async getCompressedImagesList (imagesType: 'home' | string): Promise<IGalleryCompressedImagesList | IClientCompressedImage[]> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const imagesPath: string = imagesType === 'home' ? path.join(this.compressedImagesDirPath, imagesType) : path.join(this.compressedImagesDirPath, 'gallery', imagesType);
        
        const imagesList: string[] = await fsPromises.readdir(imagesPath);

        const compressedImages: IClientCompressedImage[] = await commonServiceRef.getCompressedImages({
            find: {
                imageNames: imagesList,
                includeFields: [ 'name', 'photographyType', 'viewSizeType', 'description', 'uploadDate' ]
            }
        }) as unknown as IClientCompressedImage[];

        let galleryCompressedImagesList: IGalleryCompressedImagesList = null;

        if ( imagesType !== 'home' ) {
            const reducedCompressedImages: IReducedGalleryCompressedImages = {
                small: [],
                medium: [],
                big: []
            }

            const smallSizedCompressedImages: IClientCompressedImage[] = compressedImages.filter(compressedImage => compressedImage.viewSizeType === 'small');
            const mediumSizedCompressedImages: IClientCompressedImage[] = compressedImages.filter(compressedImage => compressedImage.viewSizeType === 'medium');
            const bigSizedCompressedImages: IClientCompressedImage[] = compressedImages.filter(compressedImage => compressedImage.viewSizeType === 'big');

            for (let i = 0; i < smallSizedCompressedImages.length; i += 4 ) {
                reducedCompressedImages.small.push(compressedImages.slice(i, i + 4));
            }

            for (let i = 0; i < mediumSizedCompressedImages.length; i += 2 ) {
                reducedCompressedImages.medium.push(compressedImages.slice(i, i + 2));
            }

            for (let i = 0; i < bigSizedCompressedImages.length; i += 1 ) {
                reducedCompressedImages.big.push(compressedImages.slice(i, i + 1));
            }

            galleryCompressedImagesList = {
                compressedImages: reducedCompressedImages, 
                photographyTypeDescription: (await this.getImagePhotographyTypesData(['name', 'description' ], 'gallery', imagesType)).description
            }
        }

        return imagesType === 'home' ? compressedImages : galleryCompressedImagesList;
    }

    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home'): Promise<IImagePhotographyType[][]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'admin'): Promise<IImagePhotographyType[]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin'): Promise<IImagePhotographyType[][] | IImagePhotographyType[]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin' | 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin' | 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType> {
        const photographyTypesData: IImagePhotographyType[] = await this.imagePhotographyTypeModel.findAll({ attributes: requiredFields, raw: true });

        const reducedImagePhotographyTypesData: IImagePhotographyType[][] = [];

        if ( photographyTypesData.length === 0 ) {
            for ( const photographyType of this.appService.imagePhotographyTypes) {
                await this.imagePhotographyTypeModel.create({ name: photographyType });
            }
        }

        if ( targetPage === 'home' ) for (let i = 0; i < photographyTypesData.length; i += 2 ) {
            reducedImagePhotographyTypesData.push(photographyTypesData.slice(i, i + 2));
        }

        let photographyTypesDataResult: IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType = null;

        switch ( targetPage ) {
            case 'home': { photographyTypesDataResult = reducedImagePhotographyTypesData; break; }
            case 'admin': { photographyTypesDataResult = photographyTypesData; break; }
            case 'gallery': { photographyTypesDataResult = photographyTypesData.find(photographyTypeData => photographyTypeData.name === photographyTypeName); break; }
        }

        return photographyTypesDataResult;
    }

    public async changeLocale (request: IRequest, newLocale: string, response: Response): Promise<string> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request); 

        const decodedToken: IClient = this.jwtService.decode(token) as IClient;

        const now: Date = new Date();

        const tokenExpiresAt: number = new Date(ms(`${decodedToken.exp}s`)).getTime();
        const tokenExpiresIn: number = Math.round(new Date(tokenExpiresAt - now.getTime()).getTime() / 1000);

        decodedToken.locale = newLocale;

        delete decodedToken.iat;
        delete decodedToken.exp;

        const updatedAccess_token: string = this.jwtService.sign(decodedToken, { expiresIn: tokenExpiresIn });

        const cookieSerializeOptions: ICookieSerializeOptions = this.appService.cookieSerializeOptions;

        cookieSerializeOptions.maxAge = ms(`${tokenExpiresIn}s`);

        response.cookie('locale', newLocale, this.appService.cookieSerializeOptions);

        return updatedAccess_token;
    }
}