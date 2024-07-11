import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

import { Client_order_type, Client_type, Image_display_type, Image_photography_type, Prisma } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';

import ms from 'ms';

import fsPromises from 'fs/promises';
import path from 'path';

import { CommonModule } from '../../modules/common.module';

import { AdminPanelModule } from '../../modules/admin-panel.module';

import { PrismaService } from '../../../prisma/prisma.service';
import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';
import { JwtControlService } from '../sign/jwt-control.service';
import { MailService } from '../mail/mail.service';
import { AdminPanelService } from '../admin-panel/admin-panel.service';

import { IClientOrdersInfoDataArr, IClientRequestBody, ICookieSerializeOptions, IDownloadingOriginalImageData, IGalleryCompressedImagesData, IRequest, IRequestBody } from 'types/global';
import { IClientGetOptions, IDownloadOriginalImageOptions, IGetClientOrdersOptions } from 'types/options';
import { IAdmin, IAdminWithoutRelationFields, IClientOrderWithoutRelationFields, ICompressedImageWithoutRelationFields, IDiscount, IImagePhotographyType, IMember, IMemberWithClientOrdersCount, IMemberWithoutRelationFields } from 'types/models';
import { IJWTPayload } from 'types/sign';

@Injectable()
export class ClientService {
    public compressedImagesDirPath: string = path.join(this._appService.staticFilesDirPath, 'images_thumbnail');

    constructor (
        private readonly _prisma: PrismaService,
        private readonly _jwtService: JwtService,
        
        private readonly _appService: AppService,
        private readonly _jwtControlService: JwtControlService,
        private readonly _mailService: MailService
    ) { }

    public async getCompressedImagesData (imagesType: 'home' | string, imageDisplayType: Image_display_type, imagesExistsCount?: number): Promise<IGalleryCompressedImagesData | ICompressedImageWithoutRelationFields[]> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const imagesPath: string = imagesType === 'home' ? path.join(this.compressedImagesDirPath, imagesType) : path.join(this.compressedImagesDirPath, 'gallery', imagesType);

        const imagesList: string[] = await commonServiceRef.managePromisesCache('getCompressedImagesData', fsPromises.readdir(imagesPath));
        const imagesLimit: number = 8;

        const compressedImagesData: ICompressedImageWithoutRelationFields[] = await commonServiceRef.getCompressedImages({
            find: {
                imageTitles: imagesList,
                selectFields: { 
                    name: true,
                    photographyType: true,
                    displayType: true,
                    description: true,
                    uploadDate: true,
                    dirPath: false,
                    originalName: false,
                    originalDirPath: false,
                    originalSize: false,
                    displayedOnHomePage: false,
                    displayedOnGalleryPage: false,
                    admin: false,
                    adminId: false
                },
                displayTypes: [ imageDisplayType ]
            },
            imagesLimit: imagesType !== 'home' ? imagesLimit : undefined,
            imagesExistsCount: imagesType !== 'home' ? imagesExistsCount : undefined
        });

        if ( imagesType !== 'home' ) {
            // const reducedCompressedImagesRaw: IClientCompressedImage[][] = [];

            /* 
            
            for ( let i = 0; i < compressedImagesRaw.length; i += 5 ) {
                reducedCompressedImagesRaw.push(compressedImagesRaw.slice(i, i + 5));
            }
            
            */

            const commonCompressedImagesCount: number = await this._prisma.compressedImage.count({ where: { name: { in: imagesList }, displayType: imageDisplayType } });


            return {
                compressedImagesRaw: compressedImagesData, // reducedCompressedImagesRaw, 
                photographyTypeDescription: ( await this.getImagePhotographyTypesData('gallery', false, imagesType) ).description as string,
                additionalImagesExists: commonCompressedImagesCount > ( imagesExistsCount as number ) + compressedImagesData.length && commonCompressedImagesCount > imagesLimit
            }
        }

        return compressedImagesData;
    }

    public async getDiscountsData (): Promise<IDiscount[]> {
        const adminPanelRef: AdminPanelService = await this._appService.getServiceRef(AdminPanelModule, AdminPanelService);

        return adminPanelRef.getDiscountsData();
    }

    public async downloadOriginalImage (request: IRequest, options: IDownloadOriginalImageOptions): Promise<IDownloadingOriginalImageData> {
        const downloadingOriginalImageData: IDownloadingOriginalImageData = { 
            name: '',
            path: '',
            extension: ''
        };

        if ( options.imagePath ) {
            const existingCompressedImageData: ICompressedImageWithoutRelationFields | null = await this._prisma.compressedImage.findUnique({ where: { name: path.basename(options.imagePath) } });

            if ( existingCompressedImageData !== null ) {
                downloadingOriginalImageData.name = existingCompressedImageData.originalName;
                downloadingOriginalImageData.path = options.imagePath;
                downloadingOriginalImageData.extension = path.extname(path.basename(existingCompressedImageData.originalName)).replace('.', '');
            } else throw new BadRequestException(`${ request.url } "DownloadOriginalImage - original image does not exists"`);
        } else if ( options.compressedImageName ) {
            const existingCompressedImageData: ICompressedImageWithoutRelationFields | null = await this._prisma.compressedImage.findUnique({ where: { name: options.compressedImageName } });

            if ( existingCompressedImageData !== null ) {
                downloadingOriginalImageData.name = existingCompressedImageData.originalName;
                downloadingOriginalImageData.path = path.join(existingCompressedImageData.originalDirPath, existingCompressedImageData.originalName);
                downloadingOriginalImageData.extension = path.extname(path.basename(existingCompressedImageData.originalName)).replace('.', '');
            } else throw new BadRequestException(`${ request.url } "DownloadOriginalImage - compressed image does not exists"`);
        }

        return downloadingOriginalImageData;
    }

    public async getImagePhotographyTypesData (targetPage: 'home', includeDescription: boolean): Promise<IImagePhotographyType[][]>
    public async getImagePhotographyTypesData (targetPage: 'admin', includeDescription: boolean): Promise<IImagePhotographyType[]>
    public async getImagePhotographyTypesData (targetPage: 'home' | 'admin', includeDescription: boolean): Promise<IImagePhotographyType[][] | IImagePhotographyType[]>
    public async getImagePhotographyTypesData (targetPage: 'gallery', includeDescription: boolean, photographyTypeName?: string): Promise<IImagePhotographyType>
    public async getImagePhotographyTypesData (targetPage: 'home' | 'admin' | 'gallery', includeDescription: boolean, photographyTypeName?: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType>
    public async getImagePhotographyTypesData (targetPage: 'home' | 'admin' | 'gallery', includeDescription: boolean, photographyTypeName?: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType> {
        const photographyTypesData: IImagePhotographyType[] = await this._prisma.imagePhotographyType.findMany({ 
            select: {
                name: true,
                compressedImageOriginalName: true,
                compressedImageName: true,
                description: includeDescription
            }
        });

        const reducedPhotographyTypesData: IImagePhotographyType[][] = [];

        if ( targetPage === 'home' ) for ( let i = 0; i < photographyTypesData.length; i += 2 ) {
            reducedPhotographyTypesData.push(photographyTypesData.slice(i, i + 2));
        }

        let photographyTypesDataRawDataFinalResult: IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType | undefined = undefined;

        switch ( targetPage ) {
            case 'home': { photographyTypesDataRawDataFinalResult = reducedPhotographyTypesData; break; }
            case 'admin': { photographyTypesDataRawDataFinalResult = photographyTypesData; break; }
            case 'gallery': { photographyTypesDataRawDataFinalResult = photographyTypesData.find(data => data.name === photographyTypeName) as IImagePhotographyType; break; }
        }

        return photographyTypesDataRawDataFinalResult;
    }

    public async changeLocale (request: IRequest, newLocale: string, response: Response): Promise<string | null> {
        const token: string | undefined = this._jwtControlService.extractTokenFromHeader(request, false);

        let decodedToken: IJWTPayload | null = null;
        let tokenExpiresIn: number | null = null;
        let updatedAccess_token: string | null = null;

        let tokenIsValid: boolean = false;

        if ( await this._jwtControlService.tokenValidate(request, token as string, false) ) tokenIsValid = true;
        
        const cookieSerializeOptions: ICookieSerializeOptions = this._appService.cookieSerializeOptions;

        if ( request.activeClientData ) {
            if ( tokenIsValid ) { 
                decodedToken = this._jwtService.decode(token as string) as IJWTPayload;

                const dateNow: Date = new Date(Date.now());

                const tokenExpiresAt: number = new Date(ms(`${ decodedToken.exp }s`)).getTime();
                tokenExpiresIn = Math.round(new Date(tokenExpiresAt - dateNow.getTime()).getTime() / 1000);

                decodedToken.locale = newLocale;

                delete decodedToken.iat;
                delete decodedToken.exp;

                updatedAccess_token = this._jwtService.sign(decodedToken, { expiresIn: tokenExpiresIn });
                cookieSerializeOptions.maxAge = request.activeClientData ? ms(`${ tokenExpiresIn as number }s`) : cookieSerializeOptions.maxAge;
            } else throw new BadRequestException(`${ request.url } "ChangeLocale - token is invalid"`);
        }

        response.cookie('locale', newLocale, cookieSerializeOptions);

        return updatedAccess_token as string | null;
    }

    public async createOrder (request: IRequest, requestBody: IRequestBody, response: Response, clientLocale: string): Promise<void> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const activeClientLogin: string | null = ( await commonServiceRef.getActiveClient(request, response, clientLocale) ).login;

        const { clientPhoneNumber, comment } = requestBody.client as IClientRequestBody;
        let { imagePhotographyType, orderType } = requestBody.client as IClientRequestBody;

        const dateNow: Date = new Date(Date.now());
        const id: number = parseInt(`${ dateNow.getFullYear() }${ dateNow.getMonth() }${ dateNow.getHours() }${ dateNow.getMinutes() }${ dateNow.getSeconds() }`, 10);

        const existingClientOrderData: IClientOrderWithoutRelationFields | null = await this._prisma.clientOrder.findUnique({ where: { id } });

        if ( existingClientOrderData !== null ) throw new BadRequestException(`${ request.url } "CreateOrder - order instance with same id is exists, login --- ${ activeClientLogin ?? '-' }"`);

        const createdClientOrder: IClientOrderWithoutRelationFields = await this._prisma.clientOrder.create({
            data: {
                id,
                photographyType: imagePhotographyType,
                type: orderType,
                phoneNumber: clientPhoneNumber,
                comment: comment
            }
        });

        if ( request.activeClientData && request.activeClientData.type === 'member' ) {
            await this._prisma.member.update({
                data: { clientOrders: { connect: { id: createdClientOrder.id } } },
                where: { id: request.activeClientData.id as number }
            });
        }

        ////////////////////////////////////////////////////////////// SEND EMAIL //////////////////////////////////////////////////////////////
        
        switch ( imagePhotographyType ) {
            case 'individual': { imagePhotographyType = "Индивидуальная съёмка" as Image_photography_type; break; }
            case 'children': { imagePhotographyType = "Детская съёмка" as Image_photography_type; break; }
            case 'wedding': { imagePhotographyType = "Свадебная съёмка" as Image_photography_type; break; }
            case 'family': { imagePhotographyType = "Семейная съёмка" as Image_photography_type; break; }
        }

        switch ( orderType ) {
            case 'consultation': { orderType = "Консультация" as Client_order_type; break; }
            case 'full': { orderType = "Полноценный заказ" as Client_order_type; break; }
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

        await this._mailService.sendEmail(process.env.CLIENT_ORDERS_RECIPIENTEMAIL as string, 'Новый заказ', mailBody);
        
        ////////////////////////////////////////////////////////////// SEND EMAIL //////////////////////////////////////////////////////////////

        if ( request.activeClientData ) await this.registerClientLastActivityTime(request.activeClientData);
    }

    public async getClientsData (clientType: 'member'): Promise<IMember | IMemberWithClientOrdersCount | IMemberWithoutRelationFields | IMember[] | IMemberWithClientOrdersCount[] | IMemberWithoutRelationFields[] | null>
    public async getClientsData (clientType: 'admin'): Promise<IAdmin | IAdminWithoutRelationFields | IAdmin[] | IAdminWithoutRelationFields[] | null>
    public async getClientsData (clientType: 'member', loginList?: string): Promise<IMember | IMemberWithClientOrdersCount | IMemberWithoutRelationFields | null>
    public async getClientsData (clientType: 'admin', loginList?: string): Promise<IAdmin | IAdminWithoutRelationFields | null>
    public async getClientsData (clientType: 'member', loginList?: string[]): Promise<IMember[] | IMemberWithClientOrdersCount[] | IMemberWithoutRelationFields[]>
    public async getClientsData (clientType: 'admin', loginList?: string[]): Promise<IAdmin[] | IAdminWithoutRelationFields[]>
    public async getClientsData (clientType: 'member', loginList?: string, options?: IClientGetOptions): Promise<IMember | IMemberWithClientOrdersCount | IMemberWithoutRelationFields | null>
    public async getClientsData (clientType: 'admin', loginList?: string, options?: IClientGetOptions): Promise<IAdmin | IAdminWithoutRelationFields | null>
    public async getClientsData (clientType: 'member', loginList?: string[], options?: IClientGetOptions): Promise<IMember[] | IMemberWithClientOrdersCount[] | IMemberWithoutRelationFields[]>
    public async getClientsData (clientType: 'admin', loginList?: string[], options?: IClientGetOptions): Promise<IAdmin[] | IAdminWithoutRelationFields[]>
    public async getClientsData (clientType: Client_type, loginList?: string | string[], options?: IClientGetOptions)
    : Promise<IMember | IMemberWithClientOrdersCount | IMemberWithoutRelationFields | IAdmin | IAdminWithoutRelationFields | IMember[] | IMemberWithClientOrdersCount[] | IMemberWithoutRelationFields[] | IAdmin[] | IAdminWithoutRelationFields[] | null>
    public async getClientsData (clientType: Client_type, loginList?: string | string[], options?: IClientGetOptions)
    : Promise<IMember | IMemberWithClientOrdersCount | IMemberWithoutRelationFields | IAdmin | IAdminWithoutRelationFields | IMember[] | IMemberWithClientOrdersCount[] | IMemberWithoutRelationFields[] | IAdmin[] | IAdminWithoutRelationFields[] | null> {
        const findArgs: Prisma.MemberFindManyArgs<DefaultArgs> | Prisma.MemberFindFirstArgs<DefaultArgs> | Prisma.AdminFindManyArgs<DefaultArgs> | Prisma.AdminFindFirstArgs<DefaultArgs> = {
            skip: options ? options.skip : undefined,
            take: options ? options.take : undefined,
            select: options ? options.selectFields : undefined
        };

        let clients: IMember | IMemberWithoutRelationFields | IAdmin | IAdminWithoutRelationFields | IMember[] | IMemberWithoutRelationFields[] | IAdmin[] | IAdminWithoutRelationFields[] | null = null;

        if ( clientType === 'member' ) {
            if ( options ) {
                if ( options.orders ) {
                    if ( options.orders.include && options.orders.include === true ) {
                        ( findArgs as Prisma.MemberFindManyArgs<DefaultArgs> | Prisma.MemberFindFirstArgs<DefaultArgs> ).select = { 
                            clientOrders: undefined
                        } as Prisma.MemberSelect<DefaultArgs>;

                        ( ( findArgs as Prisma.MemberFindManyArgs<DefaultArgs> | Prisma.MemberFindFirstArgs<DefaultArgs> ).select as Prisma.MemberSelect<DefaultArgs> ).clientOrders = true;
                    }

                    if ( options.orders.includeCount && options.orders.includeCount === true ) {
                        ( findArgs as Prisma.MemberFindManyArgs<DefaultArgs> | Prisma.MemberFindFirstArgs<DefaultArgs> ).select = { 
                            _count: undefined
                        } as Prisma.MemberSelect<DefaultArgs>;

                        ( ( findArgs as Prisma.MemberFindManyArgs<DefaultArgs> | Prisma.MemberFindFirstArgs<DefaultArgs> ).select as Prisma.MemberSelect<DefaultArgs> )._count = {
                            select: {
                                clientOrders: {
                                    where: { status: options.orders.whereStatus }
                                }
                            }
                        };
                    }
                }
            }

            if ( loginList ) {
                if ( !Array.isArray(loginList) ) {
                    if ( !( ( findArgs as Prisma.MemberFindFirstArgs<DefaultArgs> ).where as Prisma.MemberWhereInput ) ) {
                        ( ( findArgs as Prisma.MemberFindFirstArgs<DefaultArgs> ).where as Prisma.MemberWhereInput ) = {
                            login: loginList
                        };
                    }

                    clients = await this._prisma.member.findFirst(findArgs as Prisma.MemberFindFirstArgs<DefaultArgs>);
                } else {
                    ( ( ( findArgs as Prisma.MemberFindManyArgs<DefaultArgs> ).where as Prisma.MemberWhereInput ).login as Prisma.StringFilter<"Member"> ) = {
                        in: loginList
                    };
                    
                    clients = await this._prisma.member.findMany(findArgs as Prisma.MemberFindManyArgs<DefaultArgs>);
                }
            } else clients = await this._prisma.member.findMany(findArgs as Prisma.MemberFindManyArgs<DefaultArgs>);
        } else if ( clientType === 'admin' ) {
            if ( options ) {
                if ( options.compressedImages ) {
                    if ( options.compressedImages.include && options.compressedImages.include === true ) {
                        ( findArgs as Prisma.AdminFindManyArgs<DefaultArgs> | Prisma.AdminFindFirstArgs<DefaultArgs> ).select = { 
                            compressedImages: undefined
                        } as Prisma.AdminSelect<DefaultArgs>;

                        ( ( findArgs as Prisma.AdminFindManyArgs<DefaultArgs> | Prisma.AdminFindFirstArgs<DefaultArgs> ).select as Prisma.AdminSelect<DefaultArgs> ).compressedImages = {
                            select: options.compressedImages.selectFields,
                            where: {
                                name: { in: options.compressedImages.whereNameArr },
                                photographyType: { in: options.compressedImages.wherePhotographyTypes },
                                displayType: { in: options.compressedImages.whereDisplayTypes },
                                uploadDate: options.compressedImages.dateFrom && options.compressedImages.dateUntil ? {
                                    gte: options.compressedImages.dateFrom,
                                    lte: options.compressedImages.dateUntil
                                } : undefined
                            },
                            orderBy: { uploadDate: 'desc' },
                            skip: options.compressedImages.skip,
                            take: options.compressedImages.take
                        };
                    }
                }
            }

            if ( loginList ) {
                if ( !Array.isArray(loginList) ) {
                    if ( !( ( findArgs as Prisma.AdminFindFirstArgs<DefaultArgs> ).where as Prisma.AdminWhereInput ) ) {
                        ( ( findArgs as Prisma.AdminFindFirstArgs<DefaultArgs> ).where as Prisma.AdminWhereInput ) = {
                            login: loginList
                        };
                    }

                    clients = await this._prisma.admin.findFirst(findArgs as Prisma.AdminFindFirstArgs<DefaultArgs>);
                }
                else {
                    ( ( ( findArgs as Prisma.AdminFindManyArgs<DefaultArgs> ).where as Prisma.AdminWhereInput ).login as Prisma.StringFilter<"Admin"> ) = {
                        in: loginList
                    };

                    clients = await this._prisma.admin.findMany(findArgs as Prisma.AdminFindManyArgs<DefaultArgs>);
                }
            } else clients = await this._prisma.admin.findMany(findArgs as Prisma.AdminFindManyArgs<DefaultArgs>);
        }

        return clients;
    }

    public async checkAnyClientDataExists (login: string | null): Promise<IAdminWithoutRelationFields | IMemberWithoutRelationFields | null> {
        let clientData: IAdminWithoutRelationFields | IMemberWithoutRelationFields | null = null;

        if ( login === null ) login = '';

        clientData = await this.getClientsData('member', login);

        if ( clientData === null ) clientData = await this.getClientsData('admin', login);

        return clientData;
    }

    public async getClientOrdersInfo (loginList: string, options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr>
    public async getClientOrdersInfo (loginList: string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: null, options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: string | string[] | null, options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: string | string[] | null, options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr | IClientOrdersInfoDataArr[]> {
        const memberIncludeClientOrderCount: Prisma.MemberInclude<DefaultArgs> = {
            _count: {
                select: {
                    clientOrders: {
                        where: {
                            status: options.status,
                            createdDate: {
                                gte: options.fromDate,
                                lte: options.untilDate
                            }
                        }
                    }
                }
            }
        };

        const clientFindManyArgs: Prisma.MemberFindManyArgs<DefaultArgs> = {
            skip: options.existsCount,
            take: options.ordersLimit,
            include: memberIncludeClientOrderCount
        }

        let clientsOrdersInfoData: IClientOrdersInfoDataArr | IClientOrdersInfoDataArr[] | null = null;

        if ( loginList === null ) {
            const clientsData: IMemberWithClientOrdersCount[] = ( await this._prisma.member.findMany(clientFindManyArgs) as IMemberWithClientOrdersCount[] );

            if ( clientsOrdersInfoData === null ) clientsOrdersInfoData = [];

            if ( !options.existsCount || options.existsCount === 0 ) {
                ( ( ( ( clientFindManyArgs.include as Prisma.MemberInclude<DefaultArgs> )._count as Prisma.MemberCountOutputTypeDefaultArgs<DefaultArgs> )
                .select?.clientOrders as Prisma.MemberCountOutputTypeCountClientOrdersArgs<DefaultArgs> ).where?.memberId as Prisma.IntNullableFilter<"ClientOrder"> ).equals = null;

                ( clientsOrdersInfoData as IClientOrdersInfoDataArr[] ).push({
                    login: 'guest',
                    ordersCount: await this._prisma.clientOrder.count({
                        where: {
                            status: options.status,
                            createdDate: {
                                gte: options.fromDate,
                                lte: options.untilDate
                            }
                        }
                    })
                });

                delete ( ( ( clientFindManyArgs.include as Prisma.MemberInclude<DefaultArgs> )._count as Prisma.MemberCountOutputTypeDefaultArgs<DefaultArgs> )
                .select?.clientOrders as Prisma.MemberCountOutputTypeCountClientOrdersArgs<DefaultArgs> ).where?.memberId;
            }

            for ( const client of clientsData ) {
                try {
                    ( clientsOrdersInfoData as IClientOrdersInfoDataArr[] ).push({
                        login: client.login,
                        ordersCount: client._count.clientOrders
                    });
                } catch { }
            }
        } else if ( typeof loginList === 'string' ) {
            const clientData: IMemberWithClientOrdersCount = ( await this._prisma.member.findUnique({ 
                where: { login: loginList },
                include: memberIncludeClientOrderCount
            }) as IMemberWithClientOrdersCount );

            try {
                clientsOrdersInfoData = {
                    login: loginList,
                    ordersCount: clientData._count.clientOrders
                } as IClientOrdersInfoDataArr;
            } catch { }
        } else if ( Array.isArray(loginList) ) {
            for ( const login of loginList ) {
                const clientData: IMemberWithClientOrdersCount = ( await this._prisma.member.findUnique({ 
                    where: { login: login },
                    include: memberIncludeClientOrderCount
                }) as IMemberWithClientOrdersCount );

                if ( !clientsOrdersInfoData ) clientsOrdersInfoData = [];

                try {
                    ( clientsOrdersInfoData as IClientOrdersInfoDataArr[] ).push({
                        login,
                        ordersCount: clientData._count.clientOrders
                    });
                } catch { }
            }
        }

        return clientsOrdersInfoData as IClientOrdersInfoDataArr | IClientOrdersInfoDataArr[];
    }

    public async registerClientLastActivityTime (clientData: IJWTPayload): Promise<void> {
        if ( clientData.type === 'member' ) await this._prisma.member.update({
            data: { lastActiveDate: new Date(Date.now()) },
            where: { id: clientData.id as number }
        });
        else if ( clientData.type === 'admin' ) await this._prisma.admin.update({
            data: { lastActiveDate: new Date(Date.now()) },
            where: { id: clientData.id as number }
        });
    }

    public async registerClientLastLoginTime (clientData: IJWTPayload): Promise<void> {
        if ( clientData.type === 'member' ) await this._prisma.member.update({
            data: { lastSignInDate: new Date(Date.now()) },
            where: { id: clientData.id as number }
        });
        else if ( clientData.type === 'admin' ) await this._prisma.admin.update({
            data: { lastSignInDate: new Date(Date.now()) },
            where: { id: clientData.id as number }
        });
    }
}