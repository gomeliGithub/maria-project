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

import { Admin, Member, ClientCompressedImage } from '../../models/client.model';

import { IClient, ICookieSerializeOptions, ISizedHomeImages, IRequest } from 'types/global';
import { IClientGetOptions, IDownloadOriginalImageOptions } from 'types/options';
import { IClientCompressedImage } from 'types/models';

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
            const compressedImageData: ClientCompressedImage = await this.compressedImageModel.findOne({ where: { name: options.compressedImageName }});

            if ( compressedImageData ) response.download(path.join(compressedImageData.originalDirPath, compressedImageData.originalName));
            else throw new BadRequestException();

            return;
        }
    }

    public async getCompressedImagesList (imagesType: 'home' | 'gallery'): Promise<string[] | ISizedHomeImages> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const imagesList: string[] = (await fsPromises.readdir(path.join(this.compressedImagesDirPath, imagesType))).filter(imageName => path.extname(imageName) !== '.txt');

        const compressedImages: IClientCompressedImage[] = await commonServiceRef.getCompressedImages({
            find: {
                searchFields: imagesList,
                includeFields: [ 'name', 'eventType', 'viewSizeType', 'description', 'uploadDate' ]
            }
        }) as unknown as IClientCompressedImage[];

        let fullReduceImages: ISizedHomeImages = null;

        if ( imagesType === 'home' ) {
            fullReduceImages = {
                small: this._reduceCompressedImages(compressedImages.filter(image => image.viewSizeType === 'small'), 4),
                medium: this._reduceCompressedImages(compressedImages.filter(image => image.viewSizeType === 'medium'), 2),
                big: this._reduceCompressedImages(compressedImages.filter(image => image.viewSizeType === 'big'), 1)
            }
        }

        console.log(fullReduceImages);
        console.log(fullReduceImages.small.length);
        console.log(fullReduceImages.medium.length);
        console.log(fullReduceImages.big.length);







        return fullReduceImages ?? imagesList;
    }

    private _reduceCompressedImages (compressedImages: IClientCompressedImage[], rowlength: number): IClientCompressedImage[][] {
        const reducedImagesList = compressedImages.reduce((previousImage: IClientCompressedImage[][], currentImage, currentIndex) => {
            if ( currentIndex === 0 ) {
                previousImage[currentIndex] = [];

                previousImage[currentIndex].push(currentImage);
            } else if ( currentIndex === 1 &&  rowlength !== 1 ) previousImage[currentIndex - 1].push(currentImage);
            else if ( currentIndex % rowlength === 0 ) {
                previousImage[previousImage.length] = [];

                previousImage[previousImage.length - 1].push(currentImage);
            } else previousImage[previousImage.length - 1].push(currentImage);

            return previousImage;
        }, []);

        return reducedImagesList;
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