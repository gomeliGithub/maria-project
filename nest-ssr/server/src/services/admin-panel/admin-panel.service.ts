import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Op, literal } from 'sequelize';

import * as fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import sharp from 'sharp';
import ms from 'ms';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { Admin, Member, ClientCompressedImage, ImagePhotographyType, ClientOrder } from '../../models/client.model';
import { Discount } from '../../models/admin-panel.model';

import { IClientOrdersData, IClientOrdersInfoData, IClientOrdersInfoDataArr, IFullCompressedImageData, IImageAdditionalData, IRequest, IRequestBody} from 'types/global';
import { IImageMeta, IPercentUploadedOptions, IWSMessage, IWebSocketClient } from 'types/web-socket';
import { IClientCompressedImage, IDiscount } from 'types/models';
import { IGetClientOrdersOptions } from 'types/options';

@Injectable()
export class AdminPanelService {
    constructor (
        private readonly appService: AppService,

        @InjectModel(ClientCompressedImage)
        private readonly compressedImageModel: typeof ClientCompressedImage,
        @InjectModel(ImagePhotographyType)
        private readonly imagePhotographyTypeModel: typeof ImagePhotographyType,
        @InjectModel(ClientOrder)
        private readonly clientOrderModel: typeof ClientOrder,
        @InjectModel(Discount)
        private readonly discountModel: typeof Discount,
        @InjectModel(Member)
        private readonly memberModel: typeof Member
    ) { }

    public staticCompressedImagesDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_thumbnail');

    public async checkAccess (request: IRequest, __secure_fgp: string): Promise<boolean> {
        if ( !__secure_fgp || __secure_fgp === '' ) return false;

        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const validateClientAuthResult: boolean = await commonServiceRef.validateClient(request, [ 'admin' ], false, commonServiceRef);

        return validateClientAuthResult;
    }

    public async getImageThumbnail (request: IRequest, originalName: string): Promise<Buffer> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeClientLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });
        const originalImagePath: string = path.join(this.appService.clientOriginalImagesDir, activeClientLogin, originalName);

        if ( !commonServiceRef.checkFileExists(originalImagePath) ) throw new BadRequestException(`${ request.url } "GetImageThumbnail - original image does not exists"`);
        else {
            const originalImageThumbnail: Buffer = await commonServiceRef.managePromisesCache('resizeImageThumbnail', sharp(originalImagePath).resize(1500, 1500).toBuffer());

            return originalImageThumbnail;
        }
    }

    public async uploadImage (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeClientLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });

        let imageMeta: IImageMeta = null;

        try {
            imageMeta = JSON.parse(requestBody.client.uploadImageMeta);
        } catch {
            throw new BadRequestException(`${ request.url } "UploadImage - not valid imageMeta, login --- ${ activeClientLogin }"`);
        }

        if ( !this.appService.supportedImageFileTypes.includes(imageMeta.type) ) throw new BadRequestException(`${ request.url } "UploadImage - not supported image file type, login --- ${ activeClientLogin }"`);

        const imageAdditionalData: IImageAdditionalData = {
            photographyType: requestBody.client.imagePhotographyType,
            viewSizeType: requestBody.client.imageViewSizeType,
            description: requestBody.client.imageDescription
        }

        const originalImagesDirPath: string = this.appService.clientOriginalImagesDir;
        const originalImagesDirClientPath: string = path.join(this.appService.clientOriginalImagesDir, activeClientLogin);
        const compressedImagesDirPath: string = this.appService.clientCompressedImagesDir;
        const compressedImagesDirClientPath: string = path.join(this.appService.clientCompressedImagesDir, activeClientLogin);

        const newOriginalImageExt: string = path.extname(imageMeta.name) === '.jpeg' ? '.jpg' : path.extname(imageMeta.name);
        const newOriginalImagePath: string = path.join(originalImagesDirClientPath, path.basename(imageMeta.name, path.extname(imageMeta.name)) + newOriginalImageExt);

        await commonServiceRef.createImageDirs({
            originalImages: { dirPath: originalImagesDirPath, clientDirPath: originalImagesDirClientPath },
            compressedImages: { dirPath: compressedImagesDirPath, clientDirPath: compressedImagesDirClientPath }
        });

        const webSocketClientId: number = requestBody.client._id;

        const activeUploadClientIsExists: boolean = commonServiceRef.webSocketClients.some(client => client._id === webSocketClientId);
    
        let activeUploadsClientNumber: number = 0;
    
        commonServiceRef.webSocketClients.forEach(client => client.activeWriteStream ? activeUploadsClientNumber += 1 : null);
    
        if ( activeUploadClientIsExists ) {
            throw new BadRequestException(`${ request.url } "UploadImage - webSocketClient with the same id is exists, login --- ${ activeClientLogin }"`);
        }
    
        if ( activeUploadsClientNumber > 3 ) return 'PENDING';

        const compressedImagesRawData: IClientCompressedImage[] = await commonServiceRef.getCompressedImages({ clientInstance: request.activeClientInstance as Admin }, true);
        const compressedImageRawData: IClientCompressedImage = compressedImagesRawData.length !== 0 ? compressedImagesRawData.find(image => image.originalName === path.basename(newOriginalImagePath)) : null;

        if ( compressedImageRawData ) return 'FILEEXISTS';

        if ( await commonServiceRef.checkFileExists(newOriginalImagePath) ) return 'FILEEXISTS';
    
        const uploadedFilesCount: number = ( await fsPromises.readdir(originalImagesDirClientPath) ).length;

        const TWENTY_MEGABYTES: number = 20000000;
    
        if ( uploadedFilesCount >= 100 ) return 'MAXCOUNT';
        else if ( imageMeta.size > TWENTY_MEGABYTES ) return 'MAXSIZE';
        else if ( imageMeta.name.length < 4 ) return 'MAXNAMELENGTH';
    
        const currentChunkNumber: number = 0;
        const uploadedSize: number = 0;
    
        const writeStream: fs.WriteStream = fs.createWriteStream(newOriginalImagePath);

        const uploadImageTimeout = setTimeout(async () => {
            const currentUploadImageStats: fs.Stats = await fsPromises.stat(newOriginalImagePath);

            if ( currentUploadImageStats.size === 0 ) {
                const currentClient: IWebSocketClient = await this.throwWebSocketError(commonServiceRef, newOriginalImagePath, webSocketClientId, imageMeta.size);

                if ( currentClient.connection ) {
                    currentClient.connection.terminate();
                    currentClient.connection = null;
                }
        
                commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter((client => client.connection));

                clearTimeout(uploadImageTimeout);
            }
        }, 2000);
    
        writeStream.on('error', async () => {
            const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

            this.throwWebSocketError(commonServiceRef, newOriginalImagePath, webSocketClientId, imageMeta.size);
        });
    
        writeStream.on('finish', async () => {
            const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

            const currentWebSockeClient: IWebSocketClient = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId);
    
            const successMessage: IWSMessage = this.createMessage('uploadImage', 'FINISH', { 
                uploadedSize: currentWebSockeClient.uploadedSize, 
                imageMetaSize: imageMeta.size 
            });
    
            await this.appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.WEBSOCKETSERVER_PORT }] 
                WebSocketClientId --- ${ webSocketClientId }, login --- ${ currentWebSockeClient.login }. All chunks writed, overall size --> ${ currentWebSockeClient.uploadedSize }. Image ${ imageMeta.name } uploaded`, 
                false, 'webSocket'
            );

            const compressImageResult: boolean = await commonServiceRef.compressImage(request, {
                inputImagePath: newOriginalImagePath, 
                outputDirPath: compressedImagesDirClientPath, 
                originalImageSize: imageMeta.size, 
                imageAdditionalData: imageAdditionalData
            });

            if ( !compressImageResult ) {
                const errorMessage: IWSMessage = this.createMessage('uploadImage', 'ERROR');

                await this.appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.WEBSOCKETSERVER_PORT }] 
                    WebSocketClientId --- ${ webSocketClientId }, login --- ${ activeClientLogin }. Compress Image - error`,
                    true, 'webSocket'
                );

                currentWebSockeClient.connection.send(JSON.stringify(errorMessage));
            } else currentWebSockeClient.connection.send(JSON.stringify(successMessage));

            clearTimeout(currentWebSockeClient.uploadImageTimeout);
            
            currentWebSockeClient.connection.terminate();
            currentWebSockeClient.connection = null;
    
            commonServiceRef.webSocketClients = commonServiceRef.webSocketClients.filter((client => client.connection));
        });

        commonServiceRef.webSocketClients.push({ 
            _id: webSocketClientId, 
            login: activeClientLogin,
            activeWriteStream: writeStream,
            currentChunkNumber, 
            uploadedSize, 
            imageMetaName: imageMeta.name, 
            imageMetaSize: imageMeta.size,
            imagePath: newOriginalImagePath,
            lastkeepalive: Date.now(),
            connection: null,
            uploadImageTimeout
        });

        return 'START';
    }

    public async throwWebSocketError (commonServiceRef: CommonService, newOriginalImagePath: string, webSocketClientId: number, imageMetaSize: number): Promise<IWebSocketClient> {
        await fsPromises.unlink(newOriginalImagePath);

        const currentClient: IWebSocketClient = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId);

        await this.appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.WEBSOCKETSERVER_PORT }] WebSocketClientId --- ${ webSocketClientId }, login --- ${ currentClient.login }. Stream error`,
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

    public async getFullCompressedImagesList (request: IRequest, imagesLimit?: number, imagesExistsCount?: number): Promise<IFullCompressedImageData> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        if ( !imagesExistsCount ) imagesExistsCount = 0;
        if ( !imagesLimit ) imagesLimit = 5;

        const compressedImagesRaw: IClientCompressedImage[] = await commonServiceRef.getCompressedImages({ 
            clientInstance: request.activeClientInstance as Admin,
            find: {
                includeFields: [ 
                    'originalName', 
                    'originalSize',
                    'name',
                    'photographyType', 
                    'viewSizeType', 
                    'description', 
                    'uploadDate', 
                    'displayedOnHomePage', 
                    'displayedOnGalleryPage' 
                ]
            },
            imagesLimit,
            imagesExistsCount
        }, true);

        const commonCompressedImagesCount: number = await this.compressedImageModel.count();

        const imagesData: IFullCompressedImageData = { 
            imagesList: compressedImagesRaw, 
            count: compressedImagesRaw.length,
            additionalImagesIsExists: commonCompressedImagesCount > imagesExistsCount + compressedImagesRaw.length && commonCompressedImagesCount > imagesLimit
        }

        return imagesData;
    }

    public async getClientOrders (options: IGetClientOrdersOptions, getInfoData: true): Promise<IClientOrdersInfoData>
    public async getClientOrders (options: IGetClientOrdersOptions, getInfoData: false): Promise<IClientOrdersData>
    public async getClientOrders (options: IGetClientOrdersOptions, getInfoData: boolean): Promise<IClientOrdersInfoData | IClientOrdersData>
    public async getClientOrders (options: IGetClientOrdersOptions, getInfoData: boolean): Promise<IClientOrdersInfoData | IClientOrdersData> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const clientInstance: Member = await commonServiceRef.getClients(options.memberLogin, false) as Member;

        if ( !options.status ) options.status = 'new';
        if ( !options.fromDate ) options.fromDate = (Date.now() - ms('14d')) as unknown as Date;
        if ( !options.untilDate ) options.untilDate = literal('CURRENT_TIMESTAMP') as unknown as Date;
        if ( !options.existsCount ) options.existsCount = 0;
        if ( !options.ordersLimit ) options.ordersLimit = 2;

        const ordersFindOptions: FindOptions<any> = {
            where: { 
                status: options.status,
                createdDate: {
                    [Op.gte]: options.fromDate,
                    [Op.lte]: options.untilDate
                }
            },
            attributes: { exclude: [ 'memberLoginId' ] },
            offset: options.existsCount,
            limit: options.ordersLimit,
            order: [ [ 'createdDate', 'DESC' ] ],
            raw: true
        }

        let clientOrdersInfoData: IClientOrdersInfoData = null;
        let clientOrders: IClientOrdersData = null;

        if ( !getInfoData ) {
            let orders: ClientOrder[] = null;
            let commonOrdersCount: number = null;

            if ( clientInstance ) {
                orders = await clientInstance.$get('clientOrders', ordersFindOptions);
                commonOrdersCount = await clientInstance.$count('clientOrders', { where: { status: options.status } });
            } else {
                ordersFindOptions.attributes = null;
                ordersFindOptions.where['memberLoginId'] = { [Op.eq]: null }

                orders = await this.clientOrderModel.findAll(ordersFindOptions);
                commonOrdersCount = await this.clientOrderModel.count({ 
                    where: { 
                        status: options.status,
                        memberLoginId: { [Op.eq]: null }
                    } 
                });
            }

            clientOrders = {
                orders: orders,
                additionalOrdersExists: commonOrdersCount > options.existsCount + orders.length && commonOrdersCount > options.ordersLimit
            }
        } else {
            const clientOrdersInfoDataArr: IClientOrdersInfoDataArr[] = await commonServiceRef.getClientOrdersInfo('all', {
                status: options.status,
                fromDate: options.fromDate,
                untilDate: options.untilDate,
                existsCount: options.existsCount,
                ordersLimit: options.ordersLimit
            });

            const commonClientsCount: number = await this.memberModel.count();

            clientOrdersInfoData = {
                infoData: clientOrdersInfoDataArr,
                additionalOrdersInfoDataExists: commonClientsCount > options.existsCount + clientOrdersInfoDataArr.length && commonClientsCount > options.ordersLimit 
            }
        }

        return clientOrdersInfoData ?? clientOrders;
    }

    public async getDiscountsData (requiredFields?: string[]): Promise<IDiscount[]> {
        const options: FindOptions<any> = {
            raw: true
        }

        if ( requiredFields ) options.attributes = requiredFields;

        const dateNow: number = Date.now();

        let discountsRawData: IDiscount[] = await this.discountModel.findAll(options);

        if ( requiredFields ) {
            discountsRawData = discountsRawData.filter(discountData => discountData.expirationFromDate.getTime() <= dateNow && discountData.expirationToDate.getTime() >= dateNow);
            discountsRawData.forEach(discountData => {
                delete discountData.expirationFromDate;
                delete discountData.expirationToDate;
            });
        }

        return discountsRawData;
    }

    public async createDiscount (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonDiscountsCount: number = await this.discountModel.count();

        if ( commonDiscountsCount >= 3 ) return 'MAXCOUNT'; 

        const { discountContent, fromDate, toDate } = requestBody.adminPanel;

        const dateNow: Date = new Date();

        const id: number = parseInt(`${ dateNow.getFullYear() }${ dateNow.getMonth() }${ dateNow.getHours() }${ dateNow.getMinutes() }${ dateNow.getSeconds() }`, 10);

        const discountInstance: Discount = await this.discountModel.findByPk(id);

        if ( discountInstance ) throw new BadRequestException(`${ request.url } "CreateDiscount - discount instance is exists"`);

        await this.discountModel.create({
            id,
            content: discountContent,
            expirationFromDate: fromDate,
            expirationToDate: toDate
        });

        return 'SUCCESS';
    }

    public async changeDiscountData (request: IRequest, requestBody: IRequestBody): Promise<void> {
        const { newDiscountContent, newFromDate, newToDate, discountId } = requestBody.adminPanel;

        const discountInstance: Discount = await this.discountModel.findByPk(discountId);

        if ( !discountInstance ) throw new BadRequestException(`${ request.url } "ChangeDiscountData - discount instance does not exists"`);

        const updateValues: { [ x: string ]: any } = {};

        if ( newDiscountContent ) updateValues.content = newDiscountContent;
        if ( newFromDate && newToDate ) {
            updateValues.expirationFromDate = newFromDate;
            updateValues.expirationToDate = newToDate;
        }

        if ( Object.keys(updateValues).length !== 0 ) await discountInstance.update(updateValues);
    }

    public async deleteDiscount (request: IRequest, discountId: number): Promise<void> {
        const discountInstance: Discount = await this.discountModel.findByPk(discountId);

        if ( !discountInstance ) throw new BadRequestException(`${ request.url } "DeleteDiscount - discount instance does not exists"`);

        await discountInstance.destroy();
    }

    public async changeClientOrderStatus (request: IRequest, requestBody: IRequestBody): Promise<void> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const clientOrderInstance: ClientOrder = await this.clientOrderModel.findByPk(requestBody.adminPanel.clientOrderId);

        if ( !clientOrderInstance ) throw new BadRequestException(`${ request.url } "ChangeClientOrderStatus - client order instance does not exists"`);

        const clientInstance: Member = await commonServiceRef.getClients(requestBody.adminPanel.clientLogin, false) as Member;

        if ( clientInstance ) {
            if ( !( await clientInstance.$has('clientOrders', clientOrderInstance) ) ) {
                throw new BadRequestException(`${ request.url } "ChangeClientOrderStatus - client order instance of client '${ requestBody.adminPanel.clientLogin }' does not exists"`);
            }
        }

        await clientOrderInstance.update({ status: 'processed' });
    }

    public async deleteImage (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const activeAdminLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });

        const originalImageName: string = requestBody.adminPanel.originalImageName;
        const originalImagePath: string = path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName);

        const compressedImages: IClientCompressedImage[] = await commonServiceRef.getCompressedImages({
            clientInstance: request.activeClientInstance as Admin,
            find: { includeFields: ['originalName'] }
        }, true) as unknown as IClientCompressedImage[];

        const compressedImageRawData: IClientCompressedImage = compressedImages.find(compressedImage => compressedImage.originalName === originalImageName);
        const imageIsExists: boolean = await commonServiceRef.checkFileExists(path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName));

        if ( !compressedImageRawData || !imageIsExists ) {
            throw new BadRequestException(`${ request.url } "DeleteImage - ${ !compressedImageRawData ? 'compressed image does not exists' : 'original image does not exists'}"`);
        }

        const deleteImageResult: boolean = await commonServiceRef.managePromisesCache('deleteImage', commonServiceRef.deleteImage(commonServiceRef, request, originalImagePath, activeAdminLogin));

        if ( deleteImageResult ) return 'SUCCESS';
        else throw new InternalServerErrorException(`${ request.url } "DeleteImage - delete error"`);
    }

    public async changeImageDisplayTarget (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const { originalImagePath, activeAdminLogin } = await this._getOriginalImagePathWithActiveAdminLogin(commonServiceRef, request, requestBody);

        const compressedImageRawData: IClientCompressedImage = await this.compressedImageModel.findOne({ where: { originalName: path.basename(originalImagePath) }, raw: true }) as unknown as IClientCompressedImage;

        const displayTargetPage: 'home' | 'gallery' | 'original' = requestBody.adminPanel.displayTargetPage;

        if ( displayTargetPage === 'home' ) {
            const homeImagesCount: number = ( await fsPromises.readdir(path.join(this.staticCompressedImagesDirPath, 'home')) ).length;

            if ( homeImagesCount >= 10 ) return 'MAXCOUNT';
        } else if ( displayTargetPage === 'gallery' ) {
            const galleryImagesCount: number = ( await fsPromises.readdir(path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImageRawData.photographyType)) ).length;

            if ( galleryImagesCount >= 15 ) return 'MAXCOUNT';
        }

        const updateValues: { [ x: string ]: any } = { };

        if ( displayTargetPage === 'home') {
            updateValues.displayedOnHomePage = true;

            if ( compressedImageRawData.displayedOnHomePage ) updateValues.displayedOnHomePage = false;
            else if ( compressedImageRawData.displayedOnGalleryPage ) updateValues.displayedOnGalleryPage = false;
        } else if ( displayTargetPage === 'gallery' ) {
            updateValues.displayedOnGalleryPage = true;

            if ( compressedImageRawData.displayedOnGalleryPage ) updateValues.displayedOnGalleryPage = false;
            else if ( compressedImageRawData.displayedOnHomePage ) updateValues.displayedOnHomePage = false;
        } else if ( displayTargetPage === 'original' ) {
            if ( compressedImageRawData.displayedOnHomePage ) updateValues.displayedOnHomePage = false;
            else if ( compressedImageRawData.displayedOnGalleryPage ) updateValues.displayedOnGalleryPage = false;
        }

        const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', compressedImageRawData.name);
        const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImageRawData.photographyType, compressedImageRawData.name);
        const compressedImageOriginalPath: string = path.join(this.appService.clientCompressedImagesDir, activeAdminLogin, compressedImageRawData.name);

        let newPath: string = '';

        const oldPath: string = await this.getFulfilledAccessPath([
            compressedImageOriginalPath, 
            staticFilesHomeImagePath, 
            staticFilesGalleryImagePath
        ]);

        const clientCompressedImageInstance: ClientCompressedImage = await this.compressedImageModel.findOne({ where: { originalName: path.basename(originalImagePath) } });

        if ( displayTargetPage === 'home' ) {
            if ( clientCompressedImageInstance.viewSizeType !== 'horizontal' ) return 'WRONGVIEWSIZETYPE';

            newPath = staticFilesHomeImagePath;
        }
        else if ( displayTargetPage === 'gallery' ) {
            if ( clientCompressedImageInstance.viewSizeType !== 'vertical' ) return 'WRONGVIEWSIZETYPE';

            newPath = staticFilesGalleryImagePath;
        } else if ( displayTargetPage === 'original' ) newPath = compressedImageOriginalPath;

        await commonServiceRef.managePromisesCache('changeImageDisplayTargetRename', fsPromises.rename(oldPath, newPath));
        await clientCompressedImageInstance.update(updateValues);

        return 'SUCCESS';
    }

    public async changeImageData (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const { originalImagePath, activeAdminLogin } = await this._getOriginalImagePathWithActiveAdminLogin(commonServiceRef, request, requestBody);

        const originalImageName: string = requestBody.adminPanel.originalImageName;

        const updateValues: { [ x: string ]: any } = { };
        const { newImagePhotographyType, newImageDescription, newImageViewSizeType } = requestBody.adminPanel;

        if ( newImagePhotographyType ) {
            updateValues.photographyType = newImagePhotographyType;

            const compressedImageRawData: IClientCompressedImage = await this.compressedImageModel.findOne({ where: { originalName: path.basename(originalImagePath) }, raw: true }) as unknown as IClientCompressedImage;

            const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', compressedImageRawData.name);
            const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImageRawData.photographyType, compressedImageRawData.name);
            const compressedImageOriginalPath: string = path.join(this.appService.clientCompressedImagesDir, activeAdminLogin, compressedImageRawData.name);

            const currentPath: string = await this.getFulfilledAccessPath([
                staticFilesHomeImagePath, 
                staticFilesGalleryImagePath, 
                compressedImageOriginalPath
            ]);

            if ( currentPath !== staticFilesHomeImagePath && currentPath !== compressedImageOriginalPath ) {
                const staticFilesGalleryImageNewPath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', newImagePhotographyType, compressedImageRawData.name);

                await commonServiceRef.managePromisesCache('changeImageData', fsPromises.rename(staticFilesGalleryImagePath, staticFilesGalleryImageNewPath));
            }
        }

        if ( newImageDescription ) updateValues.imageDescription = newImageDescription;
        if ( newImageViewSizeType ) updateValues.viewSizeType = newImageViewSizeType;

        await this.compressedImageModel.update(updateValues, { where: { originalName: originalImageName } });

        return 'SUCCESS';
    }

    public async setPhotographyTypeImage (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const { originalImagePath, activeAdminLogin } = await this._getOriginalImagePathWithActiveAdminLogin(commonServiceRef, request, requestBody);

        const compressedImageRawData: IClientCompressedImage = await this.compressedImageModel.findOne({ where: { originalName: path.basename(originalImagePath) }, raw: true }) as unknown as IClientCompressedImage;

        if ( compressedImageRawData.viewSizeType !== 'horizontal' ) return 'WRONGVIEWSIZETYPE';

        const imagePhotographyType: string = requestBody.adminPanel.imagePhotographyType;

        const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', compressedImageRawData.name);
        const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImageRawData.photographyType, compressedImageRawData.name);
        const compressedImageOriginalPath: string = path.join(this.appService.clientCompressedImagesDir, activeAdminLogin, compressedImageRawData.name);

        const newPath: string = path.join(this.staticCompressedImagesDirPath, 'home', 'imagePhotographyTypes', compressedImageRawData.name);

        const currentPath = await this.getFulfilledAccessPath([
            compressedImageOriginalPath, 
            staticFilesHomeImagePath, 
            staticFilesGalleryImagePath
        ]);

        const currentPhotographyType: ImagePhotographyType = await this.imagePhotographyTypeModel.findOne({ where: { name: imagePhotographyType } });

        if ( currentPhotographyType && currentPhotographyType.compressedImageName && path.extname(currentPhotographyType.compressedImageName) !== '' ) {
            await commonServiceRef.managePromisesCache('setPhotographyTypeImageUnlink', fsPromises.unlink(path.join(this.staticCompressedImagesDirPath, 'home', 'imagePhotographyTypes', currentPhotographyType.compressedImageName)));
        }

        await commonServiceRef.managePromisesCache('setPhotographyTypeImageCopy', fsPromises.copyFile(currentPath, newPath));
        await this.imagePhotographyTypeModel.update({ compressedImageName: compressedImageRawData.name }, { where: { name: imagePhotographyType }});

        return 'SUCCESS';
    }
    
    public async changePhotographyTypeDescription (requestBody: IRequestBody): Promise<void> {
        const { photographyTypeName, photographyTypeNewDescription } = requestBody.adminPanel;

        const imagePhotographyTypeInstance: ImagePhotographyType = await this.imagePhotographyTypeModel.findByPk(photographyTypeName);

        await imagePhotographyTypeInstance.update({ description: photographyTypeNewDescription });
    }

    private async _getOriginalImagePathWithActiveAdminLogin (commonServiceRef: CommonService, request: IRequest, requestBody: IRequestBody): Promise<{ originalImagePath: string, activeAdminLogin: string }> {
        const activeAdminLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });
        const originalImagePath: string = await this._validateImageControlRequests(commonServiceRef, request, requestBody, activeAdminLogin);

        return { originalImagePath, activeAdminLogin };
    }

    private async _validateImageControlRequests (commonServiceRef: CommonService, request: IRequest, requestBody: IRequestBody, activeAdminLogin: string): Promise<string> {
        const originalImageName: string = requestBody.adminPanel.originalImageName;
        const originalImagePath: string = path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName);

        const compressedImagesRawData: IClientCompressedImage[] = await commonServiceRef.getCompressedImages({
            clientInstance: request.activeClientInstance as Admin,
            find: { includeFields: [ 'name', 'originalName', 'photographyType', 'displayedOnGalleryPage' ] }
        }) as IClientCompressedImage[];

        const compressedImageRawData: IClientCompressedImage = compressedImagesRawData.find(compressedImage => compressedImage.originalName === originalImageName);
        const imageIsExists: boolean = await commonServiceRef.checkFileExists(path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName));

        const compressedImageRawIsExists: boolean = !compressedImageRawData;
        const originalImageRawIsExists: boolean = !imageIsExists;

        if ( compressedImageRawIsExists || originalImageRawIsExists ) {
            throw new BadRequestException(`${ request.url } "ValidateImageControlRequests - ${ !compressedImageRawIsExists ? 'compressed image does not exists' : 'original image does not exists' }"`);
        }

        if ( compressedImageRawData.displayedOnGalleryPage && ( requestBody.adminPanel.displayTargetPage || requestBody.adminPanel.newImagePhotographyType ) ) { 
            const galleryImagePaths: string[] = this.appService.imagePhotographyTypes.map(photographyType => {
                return path.join(this.staticCompressedImagesDirPath, 'gallery', photographyType, compressedImageRawData.name);
            });

            const existingPath: string = await this.getFulfilledAccessPath(galleryImagePaths);
            const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImageRawData.photographyType, compressedImageRawData.name);

            if ( existingPath !== staticFilesGalleryImagePath ) throw new InternalServerErrorException(`${ request.url } "ValidateImageControlRequests - compressed image does not exists in directory"`);
        }
        
        return originalImagePath;
    }

    public async getFulfilledAccessPath (paths: string[]): Promise<string> {
        const accessResults: PromiseSettledResult<void>[] = await Promise.allSettled(paths.map(path => fsPromises.access(path, fsPromises.constants.F_OK)));

        let fulfilledPath: string = null;

        accessResults.forEach((result, index) => result.status === 'fulfilled' ? fulfilledPath = paths[index] : null);

        return fulfilledPath;
    }
}