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
import { IAdmin, IClientCompressedImage, IDiscount, IImagePhotographyType, IMember } from 'types/models';

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

    public async get (loginList: string, options?: {
        includeFields?: string[];
        rawResult?: false;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<Admin | Member>
    public async get (loginList: string, options?: {
        includeFields?: string[];
        rawResult?: true;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<IAdmin | IMember>
    public async get (loginList: string[], options?: {
        includeFields?: string[];
        rawResult?: false;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<Admin[] | Member[]>
    public async get (loginList: string[], options?: {
        includeFields?: string[];
        rawResult?: true;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<IAdmin[] | IMember[]>
    public async get (loginList: 'full', options?: {
        includeFields?: string[];
        rawResult?: false;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<Member[]>
    public async get (loginList: 'full', options?: {
        includeFields?: string[];
        rawResult?: true;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<IMember[]>
    public async get (loginList: string | string[], options?: {
        includeFields?: string[];
        rawResult?: false;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<Admin | Member | Admin[] | Member[]>
    public async get (loginList: string | string[], options?: {
        includeFields?: string[];
        rawResult?: true;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<IAdmin | IMember | IAdmin[] | IMember[]>
    public async get (loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[] | IAdmin | IMember | IAdmin[] | IMember[]>
    public async get (loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[] | IAdmin | IMember | IAdmin[] | IMember[]> {
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

    public async getClientOrdersInfo (loginList: string, options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr>
    public async getClientOrdersInfo (loginList: string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: 'all', options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: string | string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: string | string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr | IClientOrdersInfoDataArr[]> {
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
            const clientInstances: Member[] = await this.memberModel.findAll(getOrdersOptions);

            if ( !clientsOrdersInfoData ) clientsOrdersInfoData = [];

            if ( options.existsCount === 0 ) {
                getClientsOrdersCountOptions.where['memberLoginId'] = null;

                (clientsOrdersInfoData as IClientOrdersInfoDataArr[]).push({
                    login: 'guest',
                    ordersCount: await this.clientOrderModel.count(getClientsOrdersCountOptions)
                });

                delete getClientsOrdersCountOptions.where['memberLoginId'];
            }

            for ( const client of clientInstances ) {
                try {
                    (clientsOrdersInfoData as IClientOrdersInfoDataArr[]).push({
                        login: client.dataValues.login,
                        ordersCount: await client.$count('clientOrders', getClientsOrdersCountOptions)
                    });
                } catch { }
            }
        } else if ( typeof loginList === 'string' ) {
            const clientInstance: Member = await this.get(loginList, { rawResult: false }) as Member;

            try {
                clientsOrdersInfoData = {
                    login: loginList,
                    ordersCount: await clientInstance.$count('clientOrders', getClientsOrdersCountOptions)
                } as IClientOrdersInfoDataArr;
            } catch { }
        } else if ( Array.isArray(loginList) ) {
            for ( const login of loginList ) {
                const clientInstance: Member = await this.get(login, { rawResult: false }) as Member;

                if ( !clientsOrdersInfoData ) clientsOrdersInfoData = [];

                try {
                    (clientsOrdersInfoData as IClientOrdersInfoDataArr[]).push({
                        login,
                        ordersCount: await clientInstance.$count('clientOrders', getClientsOrdersCountOptions)
                    });
                } catch { }
            }
        }

        return clientsOrdersInfoData;
    }

    public async registerClientLastActivityTime (clientInstance: Admin | Member): Promise<void> {
        await clientInstance.update({ lastActiveDate: sequelize.literal('CURRENT_TIMESTAMP') });
    }

    public async registerClientLastLoginTime (clientInstance: Admin | Member): Promise<void> {
        await clientInstance.update({ lastSignInDate: sequelize.literal('CURRENT_TIMESTAMP') });
    }

    public async downloadOriginalImage (response: Response, options: IDownloadOriginalImageOptions): Promise<void> {
        if ( options.imagePath ) {
            response.download(options.imagePath);
        } else if ( options.compressedImageName ) {
            const compressedImageDataRaw: IClientCompressedImage = await this.compressedImageModel.findOne({ where: { name: options.compressedImageName } }) as unknown as IClientCompressedImage;

            if ( compressedImageDataRaw ) response.download(path.join(compressedImageDataRaw.originalDirPath, compressedImageDataRaw.originalName));
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

    public async getCompressedImagesData (imagesType: 'home' | string, imageViewSize: 'medium' | 'big', imagesExistsCount?: number): Promise<IGalleryCompressedImagesData | IClientCompressedImage[]> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const imagesPath: string = imagesType === 'home' ? path.join(this.compressedImagesDirPath, imagesType) : path.join(this.compressedImagesDirPath, 'gallery', imagesType);

        const imagesList: string[] = await commonServiceRef.managePromisesCache('getCompressedImagesData', fsPromises.readdir(imagesPath));
        const imagesLimit: number = 8;

        const compressedImagesRaw: IClientCompressedImage[] = await commonServiceRef.getCompressedImages({
            find: {
                imageTitles: imagesList,
                includeFields: [ 'name', 'photographyType', 'viewSizeType', 'description', 'uploadDate' ],
                imageViewSize: imagesType !== 'home' ? imageViewSize : null,
                rawResult: true
            },
            imagesLimit: imagesType !== 'home' ? imagesLimit : null,
            imagesExistsCount: imagesType !== 'home' ? imagesExistsCount : null
        });

        if ( imagesType !== 'home' ) {
            const reducedCompressedImagesRaw: IReducedGalleryCompressedImages = {
                medium: [],
                big: []
            }

            if ( imageViewSize === 'medium' ) for ( let i = 0; i < compressedImagesRaw.length; i += 4 ) {
                reducedCompressedImagesRaw.medium.push(compressedImagesRaw.slice(i, i + 4));
            } else if ( imageViewSize === 'big' ) for ( let i = 0; i < compressedImagesRaw.length; i += 2 ) {
                reducedCompressedImagesRaw.big.push(compressedImagesRaw.slice(i, i + 2));
            }

            const commonCompressedImagesCount: number = await this.compressedImageModel.count({ where: { name: imagesList, viewSizeType: imageViewSize }});

            return {
                compressedImagesRaw: reducedCompressedImagesRaw, 
                photographyTypeDescription: (await this.getImagePhotographyTypesData([ 'name', 'description' ], 'gallery', imagesType)).description,
                additionalImagesExists: commonCompressedImagesCount > imagesExistsCount + compressedImagesRaw.length && commonCompressedImagesCount > imagesLimit
            }
        }

        return compressedImagesRaw;
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
        const photographyTypesDataRaw: IImagePhotographyType[] = await this.imagePhotographyTypeModel.findAll({ attributes: requiredFields, raw: true });

        const reducedPhotographyTypesDataRaw: IImagePhotographyType[][] = [];

        if ( photographyTypesDataRaw.length === 0 ) {
            for ( const photographyType of this.appService.imagePhotographyTypes) {
                await this.imagePhotographyTypeModel.create({ name: photographyType });
            }
        }

        if ( targetPage === 'home' ) for ( let i = 0; i < photographyTypesDataRaw.length; i += 2 ) {
            reducedPhotographyTypesDataRaw.push(photographyTypesDataRaw.slice(i, i + 2));
        }

        let photographyTypesDataRawFinalResult: IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType = null;

        switch ( targetPage ) {
            case 'home': { photographyTypesDataRawFinalResult = reducedPhotographyTypesDataRaw; break; }
            case 'admin': { photographyTypesDataRawFinalResult = photographyTypesDataRaw; break; }
            case 'gallery': { photographyTypesDataRawFinalResult = photographyTypesDataRaw.find(photographyTypeData => photographyTypeData.name === photographyTypeName); break; }
        }

        return photographyTypesDataRawFinalResult;
    }

    public async changeLocale (request: IRequest, newLocale: string, response: Response): Promise<string> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request); 

        const decodedToken: IClient = this.jwtService.decode(token) as IClient;

        const dateNow: Date = new Date();

        const tokenExpiresAt: number = new Date(ms(`${decodedToken.exp}s`)).getTime();
        const tokenExpiresIn: number = Math.round(new Date(tokenExpiresAt - dateNow.getTime()).getTime() / 1000);

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
        const clientInstance: Member = await this.get(activeClientLogin, { rawResult: false }) as Member;

        let { imagePhotographyType, orderType } = requestBody.client;
        const { clientPhoneNumber, comment } = requestBody.client;

        if ( orderType === 'full' && !clientInstance ) throw new UnauthorizedException();

        const dateNow: Date = new Date();
        const id: number = parseInt(`${ dateNow.getFullYear() }${ dateNow.getMonth() }${ dateNow.getHours() }${ dateNow.getMinutes() }${ dateNow.getSeconds() }`, 10);

        const orderInstance: ClientOrder = await this.clientOrderModel.findByPk(id);

        if ( orderInstance ) throw new BadRequestException();

        const newOrderInstance: ClientOrder = await this.clientOrderModel.create({
            id,
            photographyType: imagePhotographyType,
            type: orderType,
            phoneNumber: clientPhoneNumber,
            comment: comment
        });

        if ( clientInstance ) await clientInstance.$add('clientOrders', newOrderInstance);

        ////////////////////////////////////////////////////////////// SEND EMAIL //////////////////////////////////////////////////////////////
        
        switch ( imagePhotographyType ) {
            case 'individual': { imagePhotographyType = "Индивидуальная съёмка"; break; }
            case 'children': { imagePhotographyType = "Детская съёмка"; break; }
            case 'wedding': { imagePhotographyType = "Свадебная съёмка"; break; }
            case 'family': { imagePhotographyType = "Семейная съёмка"; break; }
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

        if ( clientInstance ) await commonServiceRef.registerClientLastActivityTime(clientInstance);
    }
}