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

import { IClient, IClientOrdersInfoDataArr, ICookieSerializeOptions, IDownloadingOriginalImageData, IGalleryCompressedImagesData, IRequest, IRequestBody } from 'types/global';
import { IClientGetOptions, IDownloadOriginalImageOptions, IGetClientOrdersOptions } from 'types/options';
import { IAdmin, IClientCompressedImage, IClientOrder, IDiscount, IImagePhotographyType, IMember } from 'types/models';

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

    public async get (loginList: string, rawResult?: false, options?: IClientGetOptions): Promise<Admin | Member>
    public async get (loginList: string, rawResult?: true, options?: IClientGetOptions): Promise<IAdmin | IMember>
    public async get (loginList: string[], rawResult?: false, options?: IClientGetOptions): Promise<Admin[] | Member[]>
    public async get (loginList: string[], rawResult?: true, options?: IClientGetOptions): Promise<IAdmin[] | IMember[]>
    public async get (loginList: 'full', rawResult?: false, options?: IClientGetOptions): Promise<Member[]>
    public async get (loginList: 'full', rawResult?: true, options?: IClientGetOptions): Promise<IMember[]>
    public async get (loginList: string | string[], rawResult?: false, options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]>
    public async get (loginList: string | string[], rawResult?: true, options?: IClientGetOptions): Promise<IAdmin | IMember | IAdmin[] | IMember[]>
    public async get (loginList: string | string[], rawResult?: boolean, options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[] | IAdmin | IMember | IAdmin[] | IMember[]>
    public async get (loginList: string | string[], rawResult = false, options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[] | IAdmin | IMember | IAdmin[] | IMember[]> {
        const findOptions: NonNullFindOptions = {
            where: loginList !== 'full' ? { login: loginList } : null,
            attributes: null,
            rejectOnEmpty: true,
            raw: rawResult
        }

        let clients: Admin | Member | Admin[] | Member[] = null;

        if ( options && options.includeFields ) findOptions.attributes = options.includeFields;

        if ( !options || !options.clientType ) {
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

        if ( options && options.includeOrders && !findOptions.raw && ( !( clients instanceof Admin ) || ( Array.isArray(clients) && !clients.every(client => client instanceof Admin) ) ) ) {
            if ( !Array.isArray(clients) ) {

            } else if ( Array.isArray(clients) ) {
                for ( const member of ( clients as Member[] ) ) {
                    const memberClientOrdersRawData: IClientOrder[] = await member.$get('clientOrders', { where: { status: 'new' }, raw: true });

                    const memberIndex: number = clients.indexOf(member);

                    clients[memberIndex] = member.dataValues;
                    clients[memberIndex].clientOrders = memberClientOrdersRawData;
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
        const getClientOrdersOptions: FindOptions<any> = {
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
            const clientInstances: Member[] = await this.memberModel.findAll(getClientOrdersOptions);

            if ( !clientsOrdersInfoData ) clientsOrdersInfoData = [];

            if ( options.existsCount === 0 ) {
                getClientsOrdersCountOptions.where['memberLoginId'] = null;

                ( clientsOrdersInfoData as IClientOrdersInfoDataArr[] ).push({
                    login: 'guest',
                    ordersCount: await this.clientOrderModel.count(getClientsOrdersCountOptions)
                });

                delete getClientsOrdersCountOptions.where['memberLoginId'];
            }

            for ( const client of clientInstances ) {
                try {
                    ( clientsOrdersInfoData as IClientOrdersInfoDataArr[] ).push({
                        login: client.dataValues.login,
                        ordersCount: await client.$count('clientOrders', getClientsOrdersCountOptions)
                    });
                } catch { }
            }
        } else if ( typeof loginList === 'string' ) {
            const clientInstance: Member = await this.get(loginList, false) as Member;

            try {
                clientsOrdersInfoData = {
                    login: loginList,
                    ordersCount: await clientInstance.$count('clientOrders', getClientsOrdersCountOptions)
                } as IClientOrdersInfoDataArr;
            } catch { }
        } else if ( Array.isArray(loginList) ) {
            for ( const login of loginList ) {
                const clientInstance: Member = await this.get(login, false) as Member;

                if ( !clientsOrdersInfoData ) clientsOrdersInfoData = [];

                try {
                    ( clientsOrdersInfoData as IClientOrdersInfoDataArr[] ).push({
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

    public async downloadOriginalImage (request: IRequest, options: IDownloadOriginalImageOptions): Promise<IDownloadingOriginalImageData> {
        if ( options.imagePath ) {
            const compressedImageDataRawData: IClientCompressedImage = await this.compressedImageModel.findOne({ where: { name: path.basename(options.imagePath) } }) as unknown as IClientCompressedImage;

            if ( compressedImageDataRawData ) return {
                name: compressedImageDataRawData.originalName,
                path: options.imagePath,
                extension: path.extname(path.basename(compressedImageDataRawData.originalName)).replace('.', '')
            };
            else throw new BadRequestException(`${ request.url } "DownloadOriginalImage - original image does not exists"`);
        } else if ( options.compressedImageName ) {
            const compressedImageDataRawData: IClientCompressedImage = await this.compressedImageModel.findOne({ where: { name: options.compressedImageName } }) as unknown as IClientCompressedImage;

            if ( compressedImageDataRawData ) return {
                name: compressedImageDataRawData.originalName,
                path: path.join(compressedImageDataRawData.originalDirPath, compressedImageDataRawData.originalName),
                extension: path.extname(path.basename(compressedImageDataRawData.originalName)).replace('.', '')
            };
            else throw new BadRequestException(`${ request.url } "DownloadOriginalImage - compressed image does not exists"`);
        }
    }

    public async getCompressedImagesData (imagesType: 'home' | string, imageViewSize: 'horizontal' | 'vertical', imagesExistsCount?: number): Promise<IGalleryCompressedImagesData | IClientCompressedImage[]> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const imagesPath: string = imagesType === 'home' ? path.join(this.compressedImagesDirPath, imagesType) : path.join(this.compressedImagesDirPath, 'gallery', imagesType);

        const imagesList: string[] = await commonServiceRef.managePromisesCache('getCompressedImagesData', fsPromises.readdir(imagesPath));
        const imagesLimit: number = 8;

        const compressedImagesRawData: IClientCompressedImage[] = await commonServiceRef.getCompressedImages({
            find: {
                imageTitles: imagesList,
                includeFields: [ 'name', 'photographyType', 'viewSizeType', 'description', 'uploadDate' ],
                imageViewSize: imageViewSize
            },
            imagesLimit: imagesType !== 'home' ? imagesLimit : null,
            imagesExistsCount: imagesType !== 'home' ? imagesExistsCount : null
        }, true);

        if ( imagesType !== 'home' ) {
            // const reducedCompressedImagesRaw: IClientCompressedImage[][] = [];

            /* 
            
            for ( let i = 0; i < compressedImagesRaw.length; i += 5 ) {
                reducedCompressedImagesRaw.push(compressedImagesRaw.slice(i, i + 5));
            }
            
            */

            const commonCompressedImagesCount: number = await this.compressedImageModel.count({ where: { name: imagesList, viewSizeType: imageViewSize }});

            return {
                compressedImagesRaw: compressedImagesRawData, // reducedCompressedImagesRaw, 
                photographyTypeDescription: ( await this.getImagePhotographyTypesData([ 'name', 'description' ], 'gallery', imagesType) ).description,
                additionalImagesExists: commonCompressedImagesCount > imagesExistsCount + compressedImagesRawData.length && commonCompressedImagesCount > imagesLimit
            }
        }

        return compressedImagesRawData;
    }

    public async getDiscountsData (): Promise<IDiscount[]> {
        const adminPanelRef: AdminPanelService = await this.appService.getServiceRef(AdminPanelModule, AdminPanelService);

        const requiredFields: string[] = [ 'content', 'expirationFromDate', 'expirationToDate' ];

        return adminPanelRef.getDiscountsData(requiredFields);
    }

    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home'): Promise<IImagePhotographyType[][]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'admin'): Promise<IImagePhotographyType[]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin'): Promise<IImagePhotographyType[][] | IImagePhotographyType[]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin' | 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin' | 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType> {
        const photographyTypesDataRawData: IImagePhotographyType[] = await this.imagePhotographyTypeModel.findAll({ attributes: requiredFields, raw: true });

        const reducedPhotographyTypesDataRaw: IImagePhotographyType[][] = [];

        if ( photographyTypesDataRawData.length === 0 ) {
            for ( const photographyType of this.appService.imagePhotographyTypes) {
                await this.imagePhotographyTypeModel.create({ name: photographyType });
            }
        }

        if ( targetPage === 'home' ) for ( let i = 0; i < photographyTypesDataRawData.length; i += 2 ) {
            reducedPhotographyTypesDataRaw.push(photographyTypesDataRawData.slice(i, i + 2));
        }

        let photographyTypesDataRawDataFinalResult: IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType = null;

        switch ( targetPage ) {
            case 'home': { photographyTypesDataRawDataFinalResult = reducedPhotographyTypesDataRaw; break; }
            case 'admin': { photographyTypesDataRawDataFinalResult = photographyTypesDataRawData; break; }
            case 'gallery': { photographyTypesDataRawDataFinalResult = photographyTypesDataRawData.find(photographyTypeData => photographyTypeData.name === photographyTypeName); break; }
        }

        return photographyTypesDataRawDataFinalResult;
    }

    public async changeLocale (request: IRequest, newLocale: string, response: Response): Promise<string> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request, false);

        let decodedToken: IClient = null;
        let tokenExpiresIn: number = null;
        let updatedAccess_token: string = null;

        let tokenIsValid: boolean = false;

        if ( await this.jwtControlService.tokenValidate(request, token, false) ) tokenIsValid = true;

        if ( token && tokenIsValid ) {
            decodedToken = this.jwtService.decode(token) as IClient;

            const dateNow: Date = new Date();

            const tokenExpiresAt: number = new Date(ms(`${ decodedToken.exp }s`)).getTime();
            tokenExpiresIn = Math.round(new Date(tokenExpiresAt - dateNow.getTime()).getTime() / 1000);

            decodedToken.locale = newLocale;

            delete decodedToken.iat;
            delete decodedToken.exp;

            updatedAccess_token = this.jwtService.sign(decodedToken, { expiresIn: tokenExpiresIn });
        }

        const cookieSerializeOptions: ICookieSerializeOptions = this.appService.cookieSerializeOptions;

        cookieSerializeOptions.maxAge = ms(token && tokenIsValid ? `${ tokenExpiresIn }s` : process.env.COOKIE_MAXAGE_TIME);

        response.cookie('locale', newLocale, cookieSerializeOptions);

        return updatedAccess_token;
    }

    public async createOrder (request: IRequest, requestBody: IRequestBody): Promise<void> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeClientLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });

        let { imagePhotographyType, orderType } = requestBody.client;
        const { clientPhoneNumber, comment } = requestBody.client;

        if ( orderType === 'full' && !request.activeClientInstance ) throw new UnauthorizedException(`${ request.url } "CreateOrder - clientInstance does not exists, login --- ${ activeClientLogin }"`);

        const dateNow: Date = new Date();
        const id: number = parseInt(`${ dateNow.getFullYear() }${ dateNow.getMonth() }${ dateNow.getHours() }${ dateNow.getMinutes() }${ dateNow.getSeconds() }`, 10);

        const clientOrderInstance: ClientOrder = await this.clientOrderModel.findByPk(id);

        if ( clientOrderInstance ) throw new BadRequestException(`${ request.url } "CreateOrder - order instance with same id is exists, login --- ${ activeClientLogin }"`);

        const newOrderInstance: ClientOrder = await this.clientOrderModel.create({
            id,
            photographyType: imagePhotographyType,
            type: orderType,
            phoneNumber: clientPhoneNumber,
            comment: comment
        });

        if ( request.activeClientInstance ) await request.activeClientInstance.$add('clientOrders', newOrderInstance);

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
                    <p>Дополнительная информация от клиента - ${ comment ?? '<span style="font-weight: 600;">Отсутствует</span>' }</p>
                </div>
            </div>
        `;

        await this.mailService.sendEmail('irina01041971@mail.ru', 'Новый заказ', mailBody);
        
        ////////////////////////////////////////////////////////////// SEND EMAIL //////////////////////////////////////////////////////////////

        if ( request.activeClientInstance ) await commonServiceRef.registerClientLastActivityTime(request.activeClientInstance);
    }
}