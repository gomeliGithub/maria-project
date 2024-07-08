import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Response } from 'express';

import { Client_order_status, Image_display_type, Image_photography_type, Prisma } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';

import * as fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import sharp from 'sharp';
import ms from 'ms';

import { PrismaService } from '../../../prisma/prisma.service';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { IAdminPanelRequestBody, IClientOrdersData, IClientOrdersInfoData, IClientOrdersInfoDataArr, IFullCompressedImageData, IImageAdditionalData, IRequest, IRequestBody} from 'types/global';
import { IImageMeta, IPercentUploadedOptions, IWSMessage, IWebSocketClient } from 'types/web-socket';
import { IClientOrderWithoutRelationFields, ICompressedImageWithoutRelationFields, IDiscount, IImagePhotographyType, IMember, IMemberWithClientOrdersCount } from 'types/models';
import { IGetClientOrdersOptions, IGetFullCompressedImagesDataOptions } from 'types/options';
import { IJWTPayload } from 'types/sign';

@Injectable()
export class AdminPanelService {
    public staticCompressedImagesDirPath: string = path.join(this._appService.staticFilesDirPath, 'images_thumbnail');
    
    constructor (
        private readonly _prisma: PrismaService,

        private readonly _appService: AppService
    ) { }

    public async checkAccess (request: IRequest, __secure_fgp: string): Promise<boolean> {
        if ( !__secure_fgp || __secure_fgp === '' ) return false;

        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const validateClientAuthResult: boolean = await commonServiceRef.validateClient(request, [ 'admin' ], false, commonServiceRef);

        return validateClientAuthResult;
    }

    public async getImageThumbnail (request: IRequest, originalName: string, response: Response, clientLocale: string): Promise<Buffer> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const activeClientLogin: string = ( await commonServiceRef.getActiveClient(request, response, clientLocale) as IJWTPayload ).login as string;
        const originalImagePath: string = path.join(this._appService.clientOriginalImagesDir, activeClientLogin, originalName);

        if ( !commonServiceRef.checkFileExists(originalImagePath) ) throw new BadRequestException(`${ request.url } "GetImageThumbnail - original image does not exists"`);
        else {
            const originalImageThumbnail: Buffer = await commonServiceRef.managePromisesCache('resizeImageThumbnail', sharp(originalImagePath).resize(1500, 1500).toBuffer());

            return originalImageThumbnail;
        }
    }

    public async uploadImage (request: IRequest, requestBody: IRequestBody, response: Response, clientLocale: string): Promise<string> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const activeClientLogin: string = ( await commonServiceRef.getActiveClient(request, response, clientLocale) as IJWTPayload ).login as string;

        let imageMeta: IImageMeta | null = null;

        try {
            imageMeta = JSON.parse(requestBody?.client?.uploadImageMeta as string);
        } catch {
            throw new BadRequestException(`${ request.url } "UploadImage - not valid imageMeta, login --- ${ activeClientLogin }"`);
        }

        if ( !this._appService.supportedImageFileTypes.includes(imageMeta?.type as string) ) throw new BadRequestException(`${ request.url } "UploadImage - not supported image file type, login --- ${ activeClientLogin }"`);

        const imageAdditionalData: IImageAdditionalData = {
            photographyType: requestBody?.client?.imagePhotographyType as Image_photography_type,
            displayType: requestBody?.client?.imageDisplayType as Image_display_type,
            description: requestBody?.client?.imageDescription
        }

        const { originalImagesDirPath, originalImagesDirClientPath, compressedImagesDirPath, compressedImagesDirClientPath } = this._getCompressedImageDirPaths(activeClientLogin);

        const newOriginalImageExt: string = path.extname(imageMeta?.name as string) === '.jpeg' ? '.jpg' : path.extname(imageMeta?.name as string);
        const newOriginalImagePath: string = path.join(originalImagesDirClientPath, path.basename(imageMeta?.name as string, path.extname(imageMeta?.name as string)) + newOriginalImageExt);

        await commonServiceRef.createImageDirs({
            originalImages: { dirPath: originalImagesDirPath, clientDirPath: originalImagesDirClientPath },
            compressedImages: { dirPath: compressedImagesDirPath, clientDirPath: compressedImagesDirClientPath }
        });

        const webSocketClientId: number = requestBody?.client?._id as number;

        const activeUploadClientIsExists: boolean = commonServiceRef.webSocketClients.some(client => client._id === webSocketClientId);
    
        let activeUploadsClientNumber: number = 0;
    
        commonServiceRef.webSocketClients.forEach(client => client.activeWriteStream ? activeUploadsClientNumber += 1 : null);
    
        if ( activeUploadClientIsExists ) {
            throw new BadRequestException(`${ request.url } "UploadImage - webSocketClient with the same id is exists, login --- ${ activeClientLogin }"`);
        }

        const validateRequestResult: 'PENDING' | 'FILEEXISTS' | 'MAXCOUNT' | 'MAXSIZE' | 'MAXNAMELENGTH' | null = await this._validateUploadImageRequest(
            activeUploadsClientNumber, commonServiceRef, request.activeClientData as IJWTPayload, newOriginalImagePath, originalImagesDirClientPath, imageMeta as IImageMeta
        );

        if ( validateRequestResult !== null ) return validateRequestResult;
    
        const currentChunkNumber: number = 0;
        const uploadedSize: number = 0;
    
        const writeStream: fs.WriteStream = fs.createWriteStream(newOriginalImagePath);

        const uploadImageTimeout = setTimeout(async () => {
            const currentUploadImageStats: fs.Stats = await fsPromises.stat(newOriginalImagePath);

            if ( currentUploadImageStats.size === 0 ) {
                const currentClient: IWebSocketClient = await this.throwWebSocketError(commonServiceRef, newOriginalImagePath, webSocketClientId, imageMeta?.size as number);

                if ( currentClient.connection ) {
                    currentClient.connection.terminate();
                    currentClient.connection = null;
        
                    commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter((client => client.connection));
                }

                clearTimeout(uploadImageTimeout);
            }
        }, 2000);
    
        writeStream.on('error', async () => {
            const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

            this.throwWebSocketError(commonServiceRef, newOriginalImagePath, webSocketClientId, imageMeta?.size as number);
        });
    
        writeStream.on('finish', async () => {
            const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

            const currentWebSockeClient: IWebSocketClient = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId) as IWebSocketClient;
    
            const successMessage: IWSMessage = this.createMessage('uploadImage', 'FINISH', { 
                uploadedSize: currentWebSockeClient.uploadedSize, 
                imageMetaSize: imageMeta?.size as number 
            });
    
            await this._appService.logLineAsync(
                `${ process.env.SERVER_DOMAIN } [${ process.env.WEBSOCKETSERVER_PORT }] 
                WebSocketClientId --- ${ webSocketClientId }, login --- ${ currentWebSockeClient.login }. All chunks writed, overall size --> ${ currentWebSockeClient.uploadedSize }. Image ${ imageMeta?.name as string } uploaded`, 
                false,
                'webSocket'
            );

            const compressImageResult: boolean = await commonServiceRef.compressImage(request, {
                inputImagePath: newOriginalImagePath, 
                outputDirPath: compressedImagesDirClientPath, 
                originalImageSize: imageMeta?.size as number, 
                imageAdditionalData: imageAdditionalData
            });

            if ( !compressImageResult ) {
                const errorMessage: IWSMessage = this.createMessage('uploadImage', 'ERROR');

                await this._appService.logLineAsync(
                    `${ process.env.SERVER_DOMAIN } [${ process.env.WEBSOCKETSERVER_PORT }] 
                    WebSocketClientId --- ${ webSocketClientId }, login --- ${ activeClientLogin }. Compress Image - error`,
                    true, 'webSocket'
                );

                currentWebSockeClient.connection?.send(JSON.stringify(errorMessage));
            } else currentWebSockeClient.connection?.send(JSON.stringify(successMessage));

            clearTimeout(currentWebSockeClient.uploadImageTimeout);
            
            currentWebSockeClient.connection?.terminate();
            currentWebSockeClient.connection = null;
    
            commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter((client => client.connection));
        });

        commonServiceRef.webSocketClients.push({ 
            _id: webSocketClientId, 
            login: activeClientLogin,
            activeWriteStream: writeStream,
            currentChunkNumber, 
            uploadedSize, 
            imageMetaName: imageMeta?.name as string, 
            imageMetaSize: imageMeta?.size as number,
            imagePath: newOriginalImagePath,
            lastkeepalive: Date.now(),
            connection: null,
            uploadImageTimeout
        });

        return 'START';
    }

    private _getCompressedImageDirPaths (activeClientLogin: string) {
        const originalImagesDirPath: string = this._appService.clientOriginalImagesDir;
        const originalImagesDirClientPath: string = path.join(this._appService.clientOriginalImagesDir, activeClientLogin);
        const compressedImagesDirPath: string = this._appService.clientCompressedImagesDir;
        const compressedImagesDirClientPath: string = path.join(this._appService.clientCompressedImagesDir, activeClientLogin);

        return {
            originalImagesDirPath,
            originalImagesDirClientPath,
            compressedImagesDirPath,
            compressedImagesDirClientPath
        }
    }

    private async _validateUploadImageRequest (
        activeUploadsClientNumber: number,
        commonServiceRef: CommonService, 
        activeClientData: IJWTPayload,
        newOriginalImagePath: string, 
        originalImagesDirClientPath: string, 
        imageMeta: IImageMeta
    ): Promise<'PENDING' | 'FILEEXISTS' | 'MAXCOUNT' | 'MAXSIZE' | 'MAXNAMELENGTH' | null> {
        if ( activeUploadsClientNumber > 3 ) return 'PENDING';

        const compressedImagesData: ICompressedImageWithoutRelationFields[] = await commonServiceRef.getCompressedImages({ clientData: activeClientData });
        const existingCompressedImageData: ICompressedImageWithoutRelationFields | undefined = compressedImagesData.find(image => image.originalName === path.basename(newOriginalImagePath));

        if ( existingCompressedImageData ) return 'FILEEXISTS';

        if ( await commonServiceRef.checkFileExists(newOriginalImagePath) ) return 'FILEEXISTS';
    
        const uploadedFilesCount: number = ( await fsPromises.readdir(originalImagesDirClientPath) ).length;

        const TWENTY_MEGABYTES: number = 20000000;
    
        if ( uploadedFilesCount >= 100 ) return 'MAXCOUNT';
        else if ( imageMeta.size > TWENTY_MEGABYTES ) return 'MAXSIZE';
        else if ( imageMeta.name.length < 4 ) return 'MAXNAMELENGTH';

        return null;
    }

    public async throwWebSocketError (commonServiceRef: CommonService, newOriginalImagePath: string, webSocketClientId: number, imageMetaSize: number): Promise<IWebSocketClient> {
        await fsPromises.unlink(newOriginalImagePath);

        const currentClient: IWebSocketClient = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId) as IWebSocketClient;

        await this._appService.logLineAsync(
            `${ process.env.SERVER_DOMAIN } [${ process.env.WEBSOCKETSERVER_PORT }] WebSocketClientId --- ${ webSocketClientId }, login --- ${ currentClient.login }. Stream error`,
            true, 'webSocket'
        );

        const message: IWSMessage = this.createMessage('uploadImage', 'ERROR', { uploadedSize: currentClient.uploadedSize, imageMetaSize });

        if ( currentClient.connection ) currentClient.connection.send(JSON.stringify(message));

        return currentClient;
    }

    public createMessage (eventType: string, eventText: string, percentUploadedOptions?: IPercentUploadedOptions) {
        const message: IWSMessage = {
            event: eventType,
            text: eventText
        }
    
        if ( percentUploadedOptions ) message.percentUploaded = Math.round((percentUploadedOptions.uploadedSize / percentUploadedOptions.imageMetaSize) * 100);
    
        return message;
    }

    public async getFullCompressedImagesList (request: IRequest, options: IGetFullCompressedImagesDataOptions): Promise<IFullCompressedImageData> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        if ( !options.imagesExistsCount ) options.imagesExistsCount = 0;
        if ( !options.imagesLimit ) options.imagesLimit = 5;

        const compressedImagesData: ICompressedImageWithoutRelationFields[] = await commonServiceRef.getCompressedImages({
            clientData: request.activeClientData,
            find: {
                selectFields: {
                    originalName: true,
                    originalSize: true,
                    name: true,
                    photographyType: true,
                    displayType: true,
                    description: true,
                    uploadDate: true,
                    displayedOnHomePage: true,
                    displayedOnGalleryPage: true,
                    dirPath: false,
                    originalDirPath: false,
                    admin: false,
                    adminId: false
                },
                photographyTypes: options.photographyTypes && options.photographyTypes.length !== 0 ? options.photographyTypes as Image_photography_type[] : undefined,
                displayTypes: options.displayTypes && options.displayTypes.length !== 0 ? options.displayTypes as Image_display_type[] : undefined
            },
            imagesLimit: options.imagesLimit,
            imagesExistsCount: options.imagesExistsCount,
            dateFrom: options.dateUntil,
            dateUntil: options.dateUntil,
        });

        const commonCompressedImagesCount: number = await this._prisma.compressedImage.count({
            where: {
                photographyType: options.photographyTypes ? {
                    in: options.photographyTypes as Image_photography_type[]
                } : undefined,
                displayType: options.displayTypes ? {
                    in: options.displayTypes as Image_display_type[]
                } : undefined,
                uploadDate: options.dateFrom && options.dateUntil ? {
                    gte: options.dateFrom,
                    lte: options.dateUntil
                } : undefined
            },
        });

        const imagesData: IFullCompressedImageData = {
            imagesList: compressedImagesData, 
            count: compressedImagesData.length,
            additionalImagesIsExists: commonCompressedImagesCount > options.imagesExistsCount + compressedImagesData.length && commonCompressedImagesCount > options.imagesLimit
        }

        return imagesData;
    }

    public async getClientOrders (options: IGetClientOrdersOptions): Promise<IClientOrdersData> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const existingClientData: IMemberWithClientOrdersCount = ( await commonServiceRef.getClientsData('member', options.memberLogin as string, {
            orders: {
                include: true,
                includeCount: true,
                whereStatus: options.status as Client_order_status
            }
        }) as IMemberWithClientOrdersCount );

        options = this._setGetClientOrdersDefaultOptions(options);

        const clientOrdersFindManyArgs: Prisma.ClientOrderFindManyArgs<DefaultArgs> = {
            select: {
                id: true,
                photographyType: true,
                type: true,
                phoneNumber: true,
                comment: true,
                createdDate: true,
                status: true,
                member: false,
                memberId: false
            },
            where: {
                status: options.status,
                createdDate: {
                    gte: options.fromDate,
                    lte: options.untilDate
                }
            }
        };

        let clientOrders: IClientOrdersData | null = null;

        let ordersData: IClientOrderWithoutRelationFields[] | null = null;
        let commonOrdersCount: number | null = null;

        if ( existingClientData ) {
            ordersData = ( await commonServiceRef.getClientsData('member', existingClientData.login, {
                selectFields: {
                    login: false,
                    password: false,
                    type: false,
                    fullName: false,
                    email: false,
                    signUpDate: false,
                    lastSignInDate: false,
                    lastActiveDate: false
                },
                orders: {
                    include: true
                }
            }) as IMember ).clientOrders;

            commonOrdersCount = existingClientData._count.clientOrders;
        } else {
            ( clientOrdersFindManyArgs.where as Prisma.ClientOrderWhereInput)['memberId'] = { equals: null }

            ordersData = await this._prisma.clientOrder.findMany(clientOrdersFindManyArgs);
            commonOrdersCount = await this._prisma.clientOrder.count({
                where: {
                    status: options.status,
                    memberId: { equals: null }
                }
            });
        }

        clientOrders = {
            orders: ordersData,
            additionalOrdersExists: commonOrdersCount > ( options.existsCount as number ) + ordersData.length && commonOrdersCount > ( options.ordersLimit as number )
        }

        return clientOrders;
    }

    public async getClientOrdersInfoData (options: IGetClientOrdersOptions): Promise<IClientOrdersInfoData> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        options = this._setGetClientOrdersDefaultOptions(options);

        let clientOrdersInfoData: IClientOrdersInfoData | null = null;

        const clientOrdersInfoDataArr: IClientOrdersInfoDataArr[] = await commonServiceRef.getClientOrdersInfo(null, {
            status: options.status,
            fromDate: options.fromDate,
            untilDate: options.untilDate,
            existsCount: options.existsCount,
            ordersLimit: options.ordersLimit
        });

        const commonClientsCount: number = await this._prisma.member.count();

        clientOrdersInfoData = {
            infoData: clientOrdersInfoDataArr,
            additionalOrdersInfoDataExists: commonClientsCount > ( options.existsCount as number ) + clientOrdersInfoDataArr.length && commonClientsCount > ( options.ordersLimit as number )
        }

        return clientOrdersInfoData;
    }

    private _setGetClientOrdersDefaultOptions (options: IGetClientOrdersOptions): IGetClientOrdersOptions {
        if ( !options.status ) options.status = 'new';
        if ( !options.fromDate ) options.fromDate = new Date( Date.now() - ms('14d') );
        if ( !options.untilDate ) options.untilDate = new Date();
        if ( !options.existsCount ) options.existsCount = 0;
        if ( !options.ordersLimit ) options.ordersLimit = 2;

        return options
    }

    public async getDiscountsData (forClient = true): Promise<IDiscount[]> {
        const discountFindManyArgs: Prisma.DiscountFindManyArgs<DefaultArgs> = { };
        const dateNow: Date = new Date(Date.now());

        if ( forClient ) {
            discountFindManyArgs.select = {
                id: true,
                content: true,
                expirationFromDate: false,
                expirationToDate: false
            };

            discountFindManyArgs.where = {
                expirationFromDate: { lte: dateNow },
                expirationToDate: { gte: dateNow }
            };
        }

        const discountsData: IDiscount[] = await this._prisma.discount.findMany(discountFindManyArgs);

        return discountsData;
    }

    public async createDiscount (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonDiscountsCount: number = await this._prisma.discount.count();

        if ( commonDiscountsCount >= 3 ) return 'MAXCOUNT'; 

        const { discountContent, fromDate, toDate } = requestBody.adminPanel as IAdminPanelRequestBody;

        const dateNow: Date = new Date(Date.now());

        const id: number = parseInt(`${ dateNow.getFullYear() }${ dateNow.getMonth() }${ dateNow.getHours() }${ dateNow.getMinutes() }${ dateNow.getSeconds() }`, 10);

        const discountData: IDiscount | null = await this._prisma.discount.findUnique({ where: { id }});

        if ( discountData !== null ) throw new BadRequestException(`${ request.url } "CreateDiscount - discount instance is exists"`);

        await this._prisma.discount.create({
            data: {
                id,
                content: discountContent as string,
                expirationFromDate: fromDate as Date,
                expirationToDate: toDate as Date
            }
        });

        return 'SUCCESS';
    }

    public async changeDiscountData (request: IRequest, requestBody: IRequestBody): Promise<void> {
        const { newDiscountContent, newFromDate, newToDate, discountId } = requestBody.adminPanel as IAdminPanelRequestBody;

        const discountData: IDiscount | null = await this._prisma.discount.findUnique({ where: { id: discountId as number }});

        if ( discountData === null ) throw new BadRequestException(`${ request.url } "ChangeDiscountData - discount instance does not exists"`);

        let discountUpdateArgs: Prisma.DiscountUpdateArgs<DefaultArgs> | null = null

        if ( newDiscountContent || newFromDate || newToDate ) {
            discountUpdateArgs = {
                data: { },
                where: { id: discountData.id }
            }

            if ( newDiscountContent ) discountUpdateArgs.data.content = newDiscountContent;
            if ( newFromDate && newToDate ) {
                discountUpdateArgs.data.expirationFromDate = newFromDate;
                discountUpdateArgs.data.expirationToDate = newToDate;
            }

            await this._prisma.discount.update(discountUpdateArgs);
        }
    }

    public async deleteDiscount (request: IRequest, discountId: number): Promise<void> {
        const discountData: IDiscount | null = await this._prisma.discount.findUnique({ where: { id: discountId } });

        if ( discountData === null ) throw new BadRequestException(`${ request.url } "DeleteDiscount - discount instance does not exists"`);

        await this._prisma.discount.delete({ where: { id: discountData.id } });
    }

    public async changeClientOrderStatus (request: IRequest, requestBody: IRequestBody): Promise<void> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const clientOrderData: IClientOrderWithoutRelationFields | null = await this._prisma.clientOrder.findUnique({ where: { id: requestBody.adminPanel?.clientOrderId as number } });

        if ( clientOrderData === null ) throw new BadRequestException(`${ request.url } "ChangeClientOrderStatus - client order instance does not exists"`);

        const clientData: IMember | null = ( await commonServiceRef.getClientsData('member', requestBody.adminPanel?.clientLogin as string, { orders: { include: true } }) as IMember | null );

        if ( clientData !== null ) {
            if ( clientData.clientOrders.every(data => data.id !== clientOrderData.id) ) {
                throw new BadRequestException(`${ request.url } "ChangeClientOrderStatus - client order instance of client '${ requestBody.adminPanel?.clientLogin as string }' does not exists"`);
            }
        }

        await this._prisma.clientOrder.update({ data: { status: 'processed' }, where: { id: clientOrderData.id } });
    }

    public async deleteImage (request: IRequest, requestBody: IRequestBody, response: Response, clientLocale: string): Promise<string> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const activeAdminLogin: string = ( await commonServiceRef.getActiveClient(request, response, clientLocale) as IJWTPayload ).login as string;

        const originalImageName: string = requestBody.adminPanel?.originalImageName as string;
        const originalImagePath: string = path.join(this._appService.clientOriginalImagesDir, activeAdminLogin, originalImageName);

        const compressedImagesData: ICompressedImageWithoutRelationFields[] = await commonServiceRef.getCompressedImages({
            clientData: request.activeClientData,
            find: {
                selectFields: {
                    originalName: true,
                    originalSize: false,
                    name: false,
                    photographyType: false,
                    displayType: false,
                    description: false,
                    uploadDate: false,
                    displayedOnHomePage: false,
                    displayedOnGalleryPage: false,
                    dirPath: false,
                    originalDirPath: false,
                    admin: false,
                    adminId: false
                }
            }
        })

        const existingCompressedImageData: ICompressedImageWithoutRelationFields | undefined = compressedImagesData.find(compressedImage => compressedImage.originalName === originalImageName);
        const imageIsExists: boolean = await commonServiceRef.checkFileExists(path.join(this._appService.clientOriginalImagesDir, activeAdminLogin, originalImageName));

        if ( !existingCompressedImageData || !imageIsExists ) {
            throw new BadRequestException(`${ request.url } "DeleteImage - ${ !existingCompressedImageData ? 'compressed image does not exists' : 'original image does not exists'}"`);
        }

        const deleteImageResult: boolean = await commonServiceRef.managePromisesCache('deleteImage', commonServiceRef.deleteImage(commonServiceRef, request, originalImagePath, activeAdminLogin));

        if ( deleteImageResult ) return 'SUCCESS';
        else throw new InternalServerErrorException(`${ request.url } "DeleteImage - delete error"`);
    }

    public async changeImageDisplayTarget (request: IRequest, requestBody: IRequestBody, response: Response, clientLocale: string): Promise<string> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const { originalImagePath, activeAdminLogin } = await this._getOriginalImagePathWithActiveAdminLogin(commonServiceRef, request, requestBody, response, clientLocale);

        const existingCompressedImageData: ICompressedImageWithoutRelationFields | null = await this._prisma.compressedImage.findFirst({ where: { originalName: path.basename(originalImagePath) } });

        if ( existingCompressedImageData === null ) throw new BadRequestException(`${ request.url } "ChangeImageDisplayTarget - 'compressed image does not exists'"`);

        const displayTargetPage: 'home' | 'gallery' | 'original' = requestBody.adminPanel?.displayTargetPage as 'home' | 'gallery' | 'original';

        if ( displayTargetPage === 'home' ) {
            const homeImagesCount: number = ( await fsPromises.readdir(path.join(this.staticCompressedImagesDirPath, 'home')) ).length;

            if ( homeImagesCount >= 10 ) return 'MAXCOUNT';
        } else if ( displayTargetPage === 'gallery' ) {
            const galleryImagesCount: number = ( await fsPromises.readdir(path.join(this.staticCompressedImagesDirPath, 'gallery', existingCompressedImageData.photographyType)) ).length;

            if ( galleryImagesCount >= 15 ) return 'MAXCOUNT';
        }

        const compressedImageUpdateArgs: Prisma.CompressedImageUpdateArgs<DefaultArgs> = {
            data: {},
            where: { name: existingCompressedImageData.name }
        };

        if ( displayTargetPage === 'home') {
                compressedImageUpdateArgs.data.displayedOnHomePage = true;
    
            if ( existingCompressedImageData.displayedOnHomePage ) compressedImageUpdateArgs.data.displayedOnHomePage = false;
            else if ( existingCompressedImageData.displayedOnGalleryPage ) compressedImageUpdateArgs.data.displayedOnGalleryPage = false;
        } else if ( displayTargetPage === 'gallery' ) {
            compressedImageUpdateArgs.data.displayedOnGalleryPage = true;
    
            if ( existingCompressedImageData.displayedOnGalleryPage ) compressedImageUpdateArgs.data.displayedOnGalleryPage = false;
            else if ( existingCompressedImageData.displayedOnHomePage ) compressedImageUpdateArgs.data.displayedOnHomePage = false;
        } else if ( displayTargetPage === 'original' ) {
            if ( existingCompressedImageData.displayedOnHomePage ) compressedImageUpdateArgs.data.displayedOnHomePage = false;
            else if ( existingCompressedImageData.displayedOnGalleryPage ) compressedImageUpdateArgs.data.displayedOnGalleryPage = false;
        }

        const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', existingCompressedImageData.name);
        const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', existingCompressedImageData.photographyType, existingCompressedImageData.name);
        const compressedImageOriginalPath: string = path.join(this._appService.clientCompressedImagesDir, activeAdminLogin, existingCompressedImageData.name);

        let newPath: string = '';

        const oldPath: string = await this.getFulfilledAccessPath([
            compressedImageOriginalPath, 
            staticFilesHomeImagePath, 
            staticFilesGalleryImagePath
        ]);

        if ( displayTargetPage === 'home' ) {
            if ( existingCompressedImageData.displayType !== 'horizontal' ) return 'WRONGDISPLAYTYPE';
    
            newPath = staticFilesHomeImagePath;
            }
        else if ( displayTargetPage === 'gallery' ) {
            if ( existingCompressedImageData.displayType !== 'vertical' ) return 'WRONGDISPLAYTYPE';
    
            newPath = staticFilesGalleryImagePath;
        } else if ( displayTargetPage === 'original' ) newPath = compressedImageOriginalPath;
    
        await commonServiceRef.managePromisesCache('changeImageDisplayTargetRename', fsPromises.rename(oldPath, newPath));
        await this._prisma.compressedImage.update(compressedImageUpdateArgs);

        return 'SUCCESS';
    }

    public async changeImageData (request: IRequest, requestBody: IRequestBody, response: Response, clientLocale: string): Promise<string> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const { originalImagePath, activeAdminLogin } = await this._getOriginalImagePathWithActiveAdminLogin(commonServiceRef, request, requestBody, response, clientLocale);
        const { newImagePhotographyType, newImageDescription, newImageDisplayType } = requestBody.adminPanel as IAdminPanelRequestBody;

        if ( newImagePhotographyType || newImageDescription !== undefined || newImageDisplayType ) {
            const existingCompressedImageData: ICompressedImageWithoutRelationFields | null = await this._prisma.compressedImage.findFirst({ where: { originalName: path.basename(originalImagePath) } });

            if ( existingCompressedImageData === null ) throw new BadRequestException(`${ request.url } "ChangeImageData - 'compressed image does not exists'"`);

            const compressedImageUpdateArgs: Prisma.CompressedImageUpdateArgs<DefaultArgs> = {
                data: { },
                where: { name: existingCompressedImageData.name }
            };
            if ( newImagePhotographyType ) {
                compressedImageUpdateArgs.data.photographyType = newImagePhotographyType;

                const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', existingCompressedImageData.name);
                const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', existingCompressedImageData.photographyType, existingCompressedImageData.name);
                const compressedImageOriginalPath: string = path.join(this._appService.clientCompressedImagesDir, activeAdminLogin, existingCompressedImageData.name);

                const currentPath: string = await this.getFulfilledAccessPath([
                    staticFilesHomeImagePath, 
                    staticFilesGalleryImagePath, 
                    compressedImageOriginalPath
                ]);

                if ( currentPath !== staticFilesHomeImagePath && currentPath !== compressedImageOriginalPath ) {
                    const staticFilesGalleryImageNewPath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', newImagePhotographyType, existingCompressedImageData.name);

                    await commonServiceRef.managePromisesCache('changeImageData', fsPromises.rename(staticFilesGalleryImagePath, staticFilesGalleryImageNewPath));
                }
            }

            if ( newImageDescription !== undefined && newImageDescription !== '' ) compressedImageUpdateArgs.data.description = newImageDescription;
            if ( newImageDisplayType ) compressedImageUpdateArgs.data.displayType = newImageDisplayType;

            await this._prisma.compressedImage.update(compressedImageUpdateArgs);
        }

        return 'SUCCESS';
    }

    public async setPhotographyTypeImage (request: IRequest, requestBody: IRequestBody, response: Response, clientLocale: string): Promise<string> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const { originalImagePath, activeAdminLogin } = await this._getOriginalImagePathWithActiveAdminLogin(commonServiceRef, request, requestBody, response, clientLocale);

        const existingCompressedImageData: ICompressedImageWithoutRelationFields | null = await this._prisma.compressedImage.findFirst({ where: { originalName: path.basename(originalImagePath) } });

        if ( existingCompressedImageData === null ) throw new BadRequestException(`${ request.url } "SetPhotographyTypeImage - 'compressed image does not exists'"`);

        if ( existingCompressedImageData.displayType !== 'horizontal' ) return 'WRONGDISPLAYTYPE';

        const imagePhotographyType: string = requestBody.adminPanel?.imagePhotographyType as Image_photography_type;

        const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', existingCompressedImageData.name);
        const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', existingCompressedImageData.photographyType, existingCompressedImageData.name);
        const compressedImageOriginalPath: string = path.join(this._appService.clientCompressedImagesDir, activeAdminLogin, existingCompressedImageData.name);

        const newPath: string = path.join(this.staticCompressedImagesDirPath, 'home', 'imagePhotographyTypes', existingCompressedImageData.name);

        const currentPath = await this.getFulfilledAccessPath([
            compressedImageOriginalPath, 
            staticFilesHomeImagePath, 
            staticFilesGalleryImagePath
        ]);

        const currentPhotographyType: IImagePhotographyType = ( await this._prisma.imagePhotographyType.findUnique({ where: { name: imagePhotographyType } }) as IImagePhotographyType );

        if ( currentPhotographyType && currentPhotographyType.compressedImageOriginalName && path.extname(currentPhotographyType.compressedImageOriginalName) !== '' ) {
            const deletePhotographyTypeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', 'imagePhotographyTypes', currentPhotographyType.compressedImageOriginalName);

            if ( await commonServiceRef.checkFileExists(deletePhotographyTypeImagePath) ) {
                await commonServiceRef.managePromisesCache('setPhotographyTypeImageUnlink', fsPromises.unlink(deletePhotographyTypeImagePath));
            }
        }

        await commonServiceRef.managePromisesCache('setPhotographyTypeImageCopy', fsPromises.copyFile(currentPath, newPath));
        
        await this._prisma.imagePhotographyType.update({ 
            data: { 
                compressedImageOriginalName: existingCompressedImageData.originalName,
                compressedImageName: existingCompressedImageData.name
            }, where: { name: imagePhotographyType } 
        });

        return 'SUCCESS';
    }

    public async changePhotographyTypeDescription (requestBody: IRequestBody): Promise<void> {
        const { photographyTypeName, photographyTypeNewDescription } = requestBody.adminPanel as IAdminPanelRequestBody;

        await this._prisma.imagePhotographyType.update({ data: { description: photographyTypeNewDescription }, where: { name: photographyTypeName } });
    }

    private async _getOriginalImagePathWithActiveAdminLogin (commonServiceRef: CommonService, request: IRequest, requestBody: IRequestBody, response: Response, clientLocale: string): Promise<{ originalImagePath: string, activeAdminLogin: string }> {
        const activeAdminLogin: string = ( await commonServiceRef.getActiveClient(request, response, clientLocale) as IJWTPayload ).login as string;
        const originalImagePath: string = await this._validateImageControlRequests(commonServiceRef, request, requestBody, activeAdminLogin);

        return { originalImagePath, activeAdminLogin };
    }

    private async _validateImageControlRequests (commonServiceRef: CommonService, request: IRequest, requestBody: IRequestBody, activeAdminLogin: string): Promise<string> {
        const originalImageName: string = requestBody.adminPanel?.originalImageName as string;
        const originalImagePath: string = path.join(this._appService.clientOriginalImagesDir, activeAdminLogin, originalImageName);

        const compressedImagesData: ICompressedImageWithoutRelationFields[] = await commonServiceRef.getCompressedImages({
            clientData: request.activeClientData,
            find: {
                selectFields: {
                    name: true,
                    originalName: true,
                    photographyType: true,
                    displayedOnGalleryPage: true,
                    originalSize: false,
                    displayType: false,
                    description: false,
                    uploadDate: false,
                    displayedOnHomePage: false,
                    dirPath: false,
                    originalDirPath: false,
                    admin: false,
                    adminId: false
                }
            }
        });

        const existingCompressedImageData: ICompressedImageWithoutRelationFields | undefined = compressedImagesData.find(data => data.originalName === originalImageName);
        const imageIsExists: boolean = await commonServiceRef.checkFileExists(path.join(this._appService.clientOriginalImagesDir, activeAdminLogin, originalImageName));

        const compressedImageIsExists: boolean = !existingCompressedImageData;
        const originalImageRawIsExists: boolean = !imageIsExists;

        if ( compressedImageIsExists || originalImageRawIsExists ) {
            throw new BadRequestException(`${ request.url } "ValidateImageControlRequests - ${ !compressedImageIsExists ? 'compressed image does not exists' : 'original image does not exists' }"`);
        }

        if ( ( existingCompressedImageData as ICompressedImageWithoutRelationFields ).displayedOnGalleryPage && ( requestBody.adminPanel?.displayTargetPage as 'home' | 'gallery' | 'original' 
            || requestBody.adminPanel?.newImagePhotographyType as Image_photography_type
        ) ) { 
            const galleryImagePaths: string[] = [ ];

            for ( const data in Image_photography_type ) {
                galleryImagePaths.push(path.join(this.staticCompressedImagesDirPath, 'gallery', data, ( existingCompressedImageData as ICompressedImageWithoutRelationFields ).name));
            }

            const existingPath: string = await this.getFulfilledAccessPath(galleryImagePaths);
            const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', ( existingCompressedImageData as ICompressedImageWithoutRelationFields ).photographyType, 
            ( existingCompressedImageData as ICompressedImageWithoutRelationFields ).name);

            if ( existingPath !== staticFilesGalleryImagePath ) throw new InternalServerErrorException(`${ request.url } "ValidateImageControlRequests - compressed image does not exists in directory"`);
        }
        
        return originalImagePath;
    }

    public async getFulfilledAccessPath (paths: string[]): Promise<string> {
        const accessResults: PromiseSettledResult<void>[] = await Promise.allSettled(paths.map(path => fsPromises.access(path, fsPromises.constants.F_OK)));

        const fulfilledResultIndex: number = accessResults.findIndex(data => data.status === 'fulfilled');
        const fulfilledPath = paths[fulfilledResultIndex];

        return fulfilledPath;
    }
}