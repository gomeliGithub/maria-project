import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

import sequelize, { CountOptions, FindOptions, NonNullFindOptions, Op } from 'sequelize';
import ms from 'ms';

import fsPromises from 'fs/promises';
import path from 'path';

import { CommonModule } from '../../modules/common.module';

import { AdminPanelModule } from 'server/src/modules/admin-panel.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';
import { JwtControlService } from '../sign/jwt-control.service';
import { MailService } from '../mail/mail.service';
import { AdminPanelService } from '../admin-panel/admin-panel.service';

import { Admin, Member, ClientCompressedImage, ImagePhotographyType, ClientOrder } from '../../models/client.model';

import { IClient, IClientOrdersInfoDataArr, ICookieSerializeOptions, IGalleryCompressedImagesData, IReducedGalleryCompressedImages, IRequest, IRequestBody } from 'types/global';
import { IClientGetOptions, IDownloadOriginalImageOptions, IGetClientOrdersOptions } from 'types/options';
import { IClientCompressedImage, IDiscount, IImagePhotographyType } from 'types/models';

@Injectable()
export class ClientService {
    constructor (
        private readonly jwtService: JwtService,
        
        private readonly appService: AppService,
        private readonly jwtControlService: JwtControlService,
        private readonly mailService: MailService,
        
        @InjectModel(Admin)
        private readonly adminModel: typeof Admin,
        @InjectModel(Member) 
        private readonly memberModel: typeof Member,
        @InjectModel(ClientCompressedImage)
        private readonly compressedImageModel: typeof ClientCompressedImage,
        @InjectModel(ImagePhotographyType)
        private readonly imagePhotographyTypeModel: typeof ImagePhotographyType,
        @InjectModel(ClientOrder)
        private readonly clientOrderModel: typeof ClientOrder
    ) { }

    public compressedImagesDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_thumbnail');

    public async get (request: IRequest, loginList: string, options?: IClientGetOptions): Promise<Admin | Member>
    public async get (request: IRequest, loginList: string[], options?: IClientGetOptions): Promise<Admin[] | Member[]>
    public async get (request: IRequest, loginList: 'full', options?: IClientGetOptions): Promise<Member[]>
    public async get (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]>
    public async get (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]> {
        const findOptions: NonNullFindOptions = {
            raw: false, 
            where: loginList !== 'full' ? { login: loginList } : null,
            attributes: null,
            rejectOnEmpty: true
        }

        let clients: Admin | Member | Admin[] | Member[] = null;

        if ( options && options.includeFields ) findOptions.attributes = options.includeFields;
        if ( options && options.hasOwnProperty('rawResult') ) findOptions.raw = options.rawResult;

        if ( options && !options.clientType ) {
            try {
                if ( loginList === 'full') clients = await this.memberModel.findAll(findOptions);
                else if ( !Array.isArray(loginList) ) { 
                    clients = await Promise.any([
                        this.adminModel.findOne(findOptions),
                        this.memberModel.findOne(findOptions)
                    ]);
                } else if ( Array.isArray(loginList) ) {
                    clients = await Promise.any([
                        this.adminModel.findAll(findOptions),
                        this.memberModel.findAll(findOptions)
                    ]);
                }
            } catch {
                return null;
            }
        }

        if ( options.includeOrders && !options.rawResult && (!(clients instanceof Admin) || (Array.isArray(clients) && !clients.every(client => client instanceof Admin))) ) {
            if ( !Array.isArray(clients) ) {

            } else if ( Array.isArray(clients) ) {
                for ( const member of (clients as Member[]) ) {
                    const memberClientOrders: ClientOrder[] = await member.$get('clientOrders', { where: { status: 'new' }, raw: true });

                    const memberIndex: number = clients.indexOf(member);

                    clients[memberIndex] = member.dataValues;
                    clients[memberIndex].clientOrders = memberClientOrders;
                }
            }
        }

        return clients;
    }

    public async getClientOrdersInfo (request: IRequest, loginList: string, options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr>
    public async getClientOrdersInfo (request: IRequest, loginList: string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (request: IRequest, loginList: 'all', options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (request: IRequest, loginList: string | string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (request: IRequest, loginList: string | string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr | IClientOrdersInfoDataArr[]> {
        const getOrdersOptions: FindOptions<any> = {
            offset: options.existsCount,
            limit: options.ordersLimit, 
            raw: false
        }

        const getClientsOrdersCountOptions: CountOptions = {
            where: { 
                status: options.status,
                createdDate: {
                    [Op.gte]: options.fromDate,
                    [Op.lte]: options.untilDate
                }
            } 
        }

        let clientsOrdersInfoData: IClientOrdersInfoDataArr | IClientOrdersInfoDataArr[] = null;

        if ( loginList === 'all' ) {
            const clients: Member[] = await this.memberModel.findAll(getOrdersOptions);

            if ( !clientsOrdersInfoData ) clientsOrdersInfoData = [];

            if ( options.existsCount === 0 ) {
                getClientsOrdersCountOptions.where['memberLoginId'] = null;

                (clientsOrdersInfoData as IClientOrdersInfoDataArr[]).push({
                    login: 'guest',
                    ordersCount: await this.clientOrderModel.count(getClientsOrdersCountOptions)
                });

                delete getClientsOrdersCountOptions.where['memberLoginId'];
            }

            for ( const client of clients ) {
                try {
                    (clientsOrdersInfoData as IClientOrdersInfoDataArr[]).push({
                        login: client.dataValues.login,
                        ordersCount: await client.$count('clientOrders', getClientsOrdersCountOptions)
                    });
                } catch { }
            }
        } else if ( typeof loginList === 'string' ) {
            const client: Member = await this.get(request, loginList, { rawResult: false }) as Member;

            try {
                clientsOrdersInfoData = {
                    login: loginList,
                    ordersCount: await client.$count('clientOrders', getClientsOrdersCountOptions)
                } as IClientOrdersInfoDataArr;
            } catch { }
        } else if ( Array.isArray(loginList) ) {
            for ( const login of loginList ) {
                const client: Member = await this.get(request, login, { rawResult: false }) as Member;

                if ( !clientsOrdersInfoData ) clientsOrdersInfoData = [];

                try {
                    (clientsOrdersInfoData as IClientOrdersInfoDataArr[]).push({
                        login,
                        ordersCount: await client.$count('clientOrders', getClientsOrdersCountOptions)
                    });
                } catch { }
            }
        }

        return clientsOrdersInfoData;
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
        }

        if ( options.compressedImageName ) {
            const compressedImageData: ClientCompressedImage = await this.compressedImageModel.findOne({ where: { name: options.compressedImageName } });

            if ( compressedImageData ) response.download(path.join(compressedImageData.originalDirPath, compressedImageData.originalName));
            else throw new BadRequestException();
        }
    }

    public async checkCompressedBigImagesIsExists (photographyType: string): Promise<boolean> {
        const bigViewSizeCompressedImagesCount: number = await this.compressedImageModel.count({ 
            where: { photographyType, viewSizeType: 'big' }   
        });

        if ( bigViewSizeCompressedImagesCount !== 0 ) return true;
        else return false;
    }

    public async getCompressedImagesList (imagesType: 'home' | string, imageViewSize: 'medium' | 'big', imagesExistsCount?: number): Promise<IGalleryCompressedImagesData | IClientCompressedImage[]> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const imagesPath: string = imagesType === 'home' ? path.join(this.compressedImagesDirPath, imagesType) 
        : path.join(this.compressedImagesDirPath, 'gallery', imagesType);

        const imagesList: string[] = await fsPromises.readdir(imagesPath);
        const imagesLimit: number = 8;

        const compressedImages: IClientCompressedImage[] = await commonServiceRef.getCompressedImages({
            find: {
                imageNames: imagesList,
                includeFields: [ 'name', 'photographyType', 'viewSizeType', 'description', 'uploadDate' ],
                imageViewSize: imagesType !== 'home' ? imageViewSize : null
            },
            imagesLimit: imagesType !== 'home' ? imagesLimit : null,
            imagesExistsCount: imagesType !== 'home' ? imagesExistsCount : null
        }) as unknown as IClientCompressedImage[];

        let galleryCompressedImagesList: IGalleryCompressedImagesData = null;

        if ( imagesType !== 'home' ) {
            const reducedCompressedImages: IReducedGalleryCompressedImages = {
                medium: [],
                big: []
            }

            if ( imageViewSize === 'medium' ) for (let i = 0; i < compressedImages.length; i += 4 ) {
                reducedCompressedImages.medium.push(compressedImages.slice(i, i + 4));
            } else if ( imageViewSize === 'big' ) for (let i = 0; i < compressedImages.length; i += 2 ) {
                reducedCompressedImages.big.push(compressedImages.slice(i, i + 2));
            }

            const commonCompressedImagesCount: number = await this.compressedImageModel.count({ where: { name: imagesList, viewSizeType: imageViewSize }});

            galleryCompressedImagesList = {
                compressedImages: reducedCompressedImages, 
                photographyTypeDescription: (await this.getImagePhotographyTypesData([ 'name', 'description' ], 'gallery', imagesType)).description,
                additionalImagesExists: commonCompressedImagesCount > imagesExistsCount + compressedImages.length && commonCompressedImagesCount > imagesLimit
            }
        }

        return galleryCompressedImagesList ?? compressedImages;
    }

    public async getDiscountsData (): Promise<IDiscount[]> {
        const adminPanelRef = await this.appService.getServiceRef(AdminPanelModule, AdminPanelService);

        const requiredFields: string[] = [ 'content', 'expirationFromDate', 'expirationToDate' ];

        return adminPanelRef.getDiscountsData(requiredFields);
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

    public async createOrder (request: IRequest, requestBody: IRequestBody): Promise<void> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeClientLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });
        const client: Member = await this.get(request, activeClientLogin, { rawResult: false }) as Member;

        let { imagePhotographyType, orderType } = requestBody.client;
        const { clientPhoneNumber, comment } = requestBody.client;

        if ( orderType === 'full' && !client ) throw new UnauthorizedException();

        const dateNow: Date = new Date();

        const id: number = parseInt(`${ dateNow.getFullYear() }${ dateNow.getMonth() }${ dateNow.getHours() }${ dateNow.getMinutes() }${ dateNow.getSeconds() }`, 10);

        const existingOrder: ClientOrder = await this.clientOrderModel.findByPk(id);

        if ( existingOrder ) throw new BadRequestException();

        const newOrder: ClientOrder = await this.clientOrderModel.create({
            id,
            photographyType: imagePhotographyType,
            type: orderType,
            phoneNumber: clientPhoneNumber,
            comment: comment
        });

        if ( client ) await client.$add('clientOrders', newOrder);

        ////////////////////////////////////////////////////////////// SEND EMAIL //////////////////////////////////////////////////////////////
        
        switch ( imagePhotographyType ) {
            case 'individual': { imagePhotographyType = "Индивидуальная съёмка"; break; }
            case 'children': { imagePhotographyType = "Детская съёмка"; break; }
            case 'wedding': { imagePhotographyType = "Свадебная съёмка"; break; }
            case 'family': { imagePhotographyType = "Семейная съёмка"; break; }
            case 'event': { imagePhotographyType = "Съёмка мероприятий"; break; }
        }

        switch ( orderType ) {
            case 'consultation': { orderType = "Консультация"; break; }
            case 'full': { orderType = "Полноценный заказ"; break; }
        }

        const mailBody: string = `
            <div>
                <div>
                    <p>Тип съёмки - <span style="font-weight: 600;">${ imagePhotographyType }</span></p>
                </div>
                <div>
                    <p>Тип заказа - <span style="font-weight: 600;">${ orderType }</span></p>
                </div>
                <div>
                    <p>Номер телефона клиента - <span style="font-weight: 600;">${ clientPhoneNumber }</span></p>
                </div>
                <div>
                    <p>Логин клиента - <span style="font-weight: 600;">${ activeClientLogin ?? 'Гость' }</span></p>
                </div>
                <div>
                    <p>Дополнительная информация от клиента - ${ comment }</p>
                </div>
            </div>
        `;

        await this.mailService.sendEmail('irina01041971@mail.ru', 'Новый заказ', mailBody);
        
        ////////////////////////////////////////////////////////////// SEND EMAIL //////////////////////////////////////////////////////////////

        if ( client ) await commonServiceRef.registerClientLastActivityTime(client);
    }
}