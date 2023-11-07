import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Op, literal } from 'sequelize';

import * as fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

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

    public async uploadImage (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeClientLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });

        let imageMeta: IImageMeta = null;

        try {
            imageMeta = JSON.parse(requestBody.client.uploadImageMeta);
        } catch {
            await this.appService.logLineAsync(`[${ process.env.SERVER_API_PORT }] UploadImage - not valid imageMeta`);
    
            throw new BadRequestException();
        }

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

        const webSocketClientId = requestBody.client._id;

        const activeUploadClient = commonServiceRef.webSocketClients.some(client => client._id === webSocketClientId);
    
        let activeUploadsClientNumber = 0;
    
        commonServiceRef.webSocketClients.forEach(client => client.activeWriteStream ? activeUploadsClientNumber += 1 : null);
    
        if ( activeUploadClient ) {
            await this.appService.logLineAsync(`[${ process.env.SERVER_API_PORT }] UploadImage - webSocketClient with the same id is exists`);
    
            throw new BadRequestException();
        }
    
        if ( activeUploadsClientNumber > 3 ) return 'PENDING';

        const client: Admin = await commonServiceRef.getClients(request, activeClientLogin, { rawResult: false }) as Admin;

        const compressedImages: ClientCompressedImage[] = await commonServiceRef.getCompressedImages({ client });
        const compressedImage: ClientCompressedImage = compressedImages.length !== 0 ? compressedImages.find(image => image.originalName === path.basename(newOriginalImagePath)) : null;

        if ( compressedImage ) return 'FILEEXISTS';
    
        try {
            await fsPromises.access(newOriginalImagePath, fsPromises.constants.F_OK);
    
            return 'FILEEXISTS';
        } catch { }
    
        const uploadedFilesNumber = (await fsPromises.readdir(originalImagesDirClientPath)).length;
    
        if ( uploadedFilesNumber >= 40 ) return 'MAXCOUNT';
        else if ( imageMeta.size > 104857600 ) return 'MAXSIZE';
        else if ( imageMeta.name.length < 4 ) return 'MAXNAMELENGTH';
    
        const currentChunkNumber: number = 0;
        const uploadedSize: number = 0;
    
        const writeStream = fs.createWriteStream(newOriginalImagePath);
    
        writeStream.on('error', async () => {
            const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

            await fsPromises.unlink(newOriginalImagePath);
    
            const currentClient = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId);
    
            await this.appService.logLineAsync(`[${ process.env.WEBSOCKETSERVER_PORT }] WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}. Stream error`);
    
            const message = this.createMessage('uploadImage', 'ERROR', { uploadedSize: currentClient.uploadedSize, imageMetaSize: imageMeta.size });
    
            currentClient.connection.send(JSON.stringify(message));
        });
    
        writeStream.on('finish', async () => {
            const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

            const currentClient: IWebSocketClient = commonServiceRef.webSocketClients.find(client => client._id === webSocketClientId);
    
            const successMessage: IWSMessage = this.createMessage('uploadImage', 'FINISH', { 
                uploadedSize: currentClient.uploadedSize, 
                imageMetaSize: imageMeta.size 
            });
    
            await this.appService.logLineAsync(`[${ process.env.WEBSOCKETSERVER_PORT }] WebSocketClientId --- ${webSocketClientId}, login --- ${currentClient.login}. All chunks writed, overall size --> ${currentClient.uploadedSize}. Image ${imageMeta.name} uploaded`);

            const compressResult: boolean = await commonServiceRef.compressImage(request, {
                inputImagePath: newOriginalImagePath, 
                outputDirPath: compressedImagesDirClientPath, 
                originalImageSize: imageMeta.size, 
                imageAdditionalData: imageAdditionalData
            }, activeClientLogin);

            if ( !compressResult ) {
                const errorMessage: IWSMessage = this.createMessage('uploadImage', 'ERROR');

                currentClient.connection.send(JSON.stringify(errorMessage));
            } else currentClient.connection.send(JSON.stringify(successMessage));

            currentClient.connection.terminate();
            currentClient.connection = null;
    
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
        });

        return 'START';
    }

    public createMessage (eventType: string, eventText: string, percentUploadedOptions?: IPercentUploadedOptions) {
        const message: IWSMessage = {
            event: eventType,
            text: eventText
        }
    
        if ( percentUploadedOptions ) message.percentUploaded = Math.round((percentUploadedOptions.uploadedSize / percentUploadedOptions.imageMetaSize) * 100);
    
        return message;
    }

    public async getFullCompressedImagesList (request: IRequest): Promise<IFullCompressedImageData> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const activeAdminLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });

        const client: Admin = await commonServiceRef.getClients(request, activeAdminLogin, { rawResult: false }) as Admin;

        const compressedImages: ClientCompressedImage[] = await commonServiceRef.getCompressedImages({ 
            client,
            find: { 
                includeFields: [ 
                    'originalName', 
                    'originalSize', 
                    'photographyType', 
                    'viewSizeType', 
                    'description', 
                    'uploadDate', 
                    'displayedOnHomePage', 
                    'displayedOnGalleryPage' 
                ] 
            }
        });

        const imagesList: IFullCompressedImageData = { imagesList: compressedImages as unknown as IClientCompressedImage[], count: compressedImages.length };

        return imagesList;
    }

    public async getClientOrders (request: IRequest, options: {
        getInfoData: string,
        type?: string,
        fromDate?: Date,
        untilDate?: Date,
        status?: string,
        ordersLimit?: number,
        existsCount?: number
    }): Promise<IClientOrdersInfoData>
    public async getClientOrders (request: IRequest, options: {
        getInfoData?: string,
        memberLogin: string,
        type?: string,
        fromDate?: Date,
        untilDate?: Date,
        status?: string,
        ordersLimit?: number,
        existsCount?: number
    }): Promise<IClientOrdersData>
    public async getClientOrders (request: IRequest, options: IGetClientOrdersOptions): Promise<IClientOrdersInfoData | IClientOrdersData> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const client: Member = await commonServiceRef.getClients(request, options.memberLogin, { rawResult: false }) as Member;

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

        if ( !options.getInfoData || options.getInfoData === 'false' ) {
            let orders: ClientOrder[] = null;
            let commonOrdersCount: number = null;

            if ( client ) {
                orders = await client.$get('clientOrders', ordersFindOptions);
                commonOrdersCount = await client.$count('clientOrders', { where: { status: options.status } });
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
            const infoData: IClientOrdersInfoDataArr[] = await commonServiceRef.getClientOrdersInfo(request, 'all', {
                status: options.status,
                fromDate: options.fromDate,
                untilDate: options.untilDate,
                existsCount: options.existsCount,
                ordersLimit: options.ordersLimit
            });
            const commonClientsCount: number = await this.memberModel.count();

            clientOrdersInfoData = {
                infoData: infoData,
                additionalOrdersInfoDataExists: commonClientsCount > options.existsCount + infoData.length && commonClientsCount > options.ordersLimit 
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

        let discounts: IDiscount[] = await this.discountModel.findAll(options);

        if ( requiredFields ) {
            discounts = discounts.filter(discountData => discountData.expirationFromDate.getTime() <= dateNow && discountData.expirationToDate.getTime() >= dateNow);
            discounts.forEach(discountData => {
                delete discountData.expirationFromDate;
                delete discountData.expirationToDate;
            });
        }

        return discounts;
    }

    public async createDiscount (requestBody: IRequestBody): Promise<string> {
        const commonDiscountsCount: number = await this.discountModel.count();

        if ( commonDiscountsCount >= 3 ) return 'MAXCOUNT'; 

        const { discountContent, fromDate, toDate } = requestBody.adminPanel;

        const dateNow: Date = new Date();

        const id: number = parseInt(`${ dateNow.getFullYear() }${ dateNow.getMonth() }${ dateNow.getHours() }${ dateNow.getMinutes() }${ dateNow.getSeconds() }`, 10);

        const discountExists: Discount = await this.discountModel.findByPk(id);

        if ( discountExists ) throw new BadRequestException()

        await this.discountModel.create({
            id,
            content: discountContent,
            expirationFromDate: fromDate,
            expirationToDate: toDate
        });

        return 'SUCCESS';
    }

    public async changeDiscountData (requestBody: IRequestBody): Promise<void> {
        const { newDiscountContent, newFromDate, newToDate, discountId } = requestBody.adminPanel;

        const discount: Discount = await this.discountModel.findByPk(discountId);

        if ( !discount ) throw new BadRequestException();

        const updateValues: { [x: string]: any } = {};

        if ( newDiscountContent ) updateValues.content = newDiscountContent;
        if ( newFromDate && newToDate ) {
            updateValues.expirationFromDate = newFromDate;
            updateValues.expirationToDate = newToDate;
        }

        if ( Object.keys(updateValues).length !== 0 ) await discount.update(updateValues);
    }

    public async deleteDiscount (discountId: number): Promise<void> {
        const discount: Discount = await this.discountModel.findByPk(discountId);

        if ( !discount ) throw new BadRequestException();

        await discount.destroy();
    }

    public async changeClientOrderStatus (request: IRequest, requestBody: IRequestBody): Promise<void> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const clientOrder: ClientOrder = await this.clientOrderModel.findByPk(requestBody.adminPanel.clientOrderId);

        if ( !clientOrder ) throw new BadRequestException();

        const client: Member = await commonServiceRef.getClients(request, requestBody.adminPanel.clientLogin, { rawResult: false }) as Member;

        if ( client ) {
            if ( !(await client.$has('clientOrders', clientOrder)) ) throw new BadRequestException();
        }

        await clientOrder.update({ status: 'processed' });
    }

    public async deleteImage (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const activeAdminLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });
        const client: Admin = await commonServiceRef.getClients(request, activeAdminLogin, { rawResult: false }) as Admin;

        const originalImageName: string = requestBody.adminPanel.originalImageName;
        const originalImagePath: string = path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName);

        const compressedImages: ClientCompressedImage[] = await commonServiceRef.getCompressedImages({ 
            client,
            find : { includeFields: [ 'originalName' ] }
        });

        const compressedImageInstance: ClientCompressedImage = compressedImages.find(compressedImage => compressedImage.originalName === originalImageName);

        const imageExists: boolean = await commonServiceRef.checkFileExists(path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName));

        if ( !compressedImageInstance || !imageExists ) throw new BadRequestException();

        const deleteImageResult: boolean = await commonServiceRef.deleteImage(request, originalImagePath, activeAdminLogin);

        if ( deleteImageResult ) return 'SUCCESS';
        else throw new InternalServerErrorException()
    }

    public async changeImageDisplayTarget (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeAdminLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });
        const originalImagePath: string = await this.validateImageControlRequests(request, requestBody, activeAdminLogin);

        const compressedImage: IClientCompressedImage = await this.compressedImageModel.findOne({ where: { originalName: path.basename(originalImagePath) }, raw: true }) as unknown as IClientCompressedImage;

        const homeImagesCount: number = (await fsPromises.readdir(path.join(this.staticCompressedImagesDirPath, 'home'))).length;

        if ( homeImagesCount >= 10 ) return 'MAXCOUNT';

        const displayTargetPage: 'home' | 'gallery' | 'original' = requestBody.adminPanel.displayTargetPage;

        const updateValues: { [x: string]: any } = { };

        if ( displayTargetPage === 'home') {
            updateValues.displayedOnHomePage = true;

            if ( compressedImage.displayedOnHomePage ) updateValues.displayedOnHomePage = false;
            else if ( compressedImage.displayedOnGalleryPage ) updateValues.displayedOnGalleryPage = false;
        } else if ( displayTargetPage === 'gallery' ) {
            updateValues.displayedOnGalleryPage = true;

            if ( compressedImage.displayedOnGalleryPage ) updateValues.displayedOnGalleryPage = false;
            else if ( compressedImage.displayedOnHomePage ) updateValues.displayedOnHomePage = false;
        } else if ( displayTargetPage === 'original' ) {
            if ( compressedImage.displayedOnHomePage ) updateValues.displayedOnHomePage = false;
            else if ( compressedImage.displayedOnGalleryPage ) updateValues.displayedOnGalleryPage = false;
        }

        const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', compressedImage.name);
        const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImage.photographyType, compressedImage.name);
        const compressedImageOriginalPath: string = path.join(this.appService.clientCompressedImagesDir, activeAdminLogin, compressedImage.name);

        let newPath: string = '';

        const oldPath: string = await this.getFulfilledAccessPath([
            compressedImageOriginalPath, 
            staticFilesHomeImagePath, 
            staticFilesGalleryImagePath
        ]);

        if ( displayTargetPage === 'home' ) newPath = staticFilesHomeImagePath;
        else if ( displayTargetPage === 'gallery' ) newPath = staticFilesGalleryImagePath;
        else if ( displayTargetPage === 'original' ) newPath = compressedImageOriginalPath;
        
        await fsPromises.rename(oldPath, newPath);
        await this.compressedImageModel.update(updateValues, { where: { originalName: path.basename(originalImagePath) }});

        return 'SUCCESS';
    }

    public async changeImageData (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeAdminLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });
        const originalImagePath: string = await this.validateImageControlRequests(request, requestBody, activeAdminLogin);

        const originalImageName: string = requestBody.adminPanel.originalImageName;

        const updateValues: { [ x: string ]: any } = { };
        const { newImagePhotographyType, newImageDescription, newImageViewSizeType } = requestBody.adminPanel;

        if ( newImagePhotographyType ) {
            updateValues.photographyType = newImagePhotographyType;

            const compressedImage: IClientCompressedImage = await this.compressedImageModel.findOne({ where: { originalName: path.basename(originalImagePath) }, raw: true }) as unknown as IClientCompressedImage;

            const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', compressedImage.name);
            const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImage.photographyType, compressedImage.name);
            const compressedImageOriginalPath: string = path.join(this.appService.clientCompressedImagesDir, activeAdminLogin, compressedImage.name);

            const currentPath: string = await this.getFulfilledAccessPath([
                staticFilesHomeImagePath, 
                staticFilesGalleryImagePath, 
                compressedImageOriginalPath
            ]);

            if ( currentPath !== staticFilesHomeImagePath && currentPath !== compressedImageOriginalPath ) {
                const staticFilesGalleryImageNewPath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', newImagePhotographyType, compressedImage.name);
        
                await fsPromises.rename(staticFilesGalleryImagePath, staticFilesGalleryImageNewPath);
            }
        }

        if ( newImageDescription ) updateValues.imageDescription = newImageDescription;
        if ( newImageViewSizeType ) updateValues.viewSizeType = newImageViewSizeType;

        await this.compressedImageModel.update(updateValues, { where: { originalName: originalImageName } });

        return 'SUCCESS';
    }

    public async setPhotographyTypeImage (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeAdminLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });

        const originalImagePath: string = await this.validateImageControlRequests(request, requestBody, activeAdminLogin);

        const compressedImage: ClientCompressedImage = await this.compressedImageModel.findOne({ where: { originalName: path.basename(originalImagePath) }, raw: true });

        const imagePhotographyType: string = requestBody.adminPanel.imagePhotographyType;

        const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', compressedImage.name);
        const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImage.photographyType, compressedImage.name);
        const compressedImageOriginalPath: string = path.join(this.appService.clientCompressedImagesDir, activeAdminLogin, compressedImage.name);

        let currentPath: string = '';
        const newPath: string = path.join(this.staticCompressedImagesDirPath, 'home', 'imagePhotographyTypes', compressedImage.name);

        currentPath = await this.getFulfilledAccessPath([
            compressedImageOriginalPath, 
            staticFilesHomeImagePath, 
            staticFilesGalleryImagePath
        ]);

        const currentPhotographyTypeImage: ImagePhotographyType = await this.imagePhotographyTypeModel.findOne({ where: { name: imagePhotographyType } });

        if ( currentPhotographyTypeImage && currentPhotographyTypeImage.compressedImageName && path.extname(currentPhotographyTypeImage.compressedImageName) !== '' ) {
            await fsPromises.unlink(path.join(this.staticCompressedImagesDirPath, 'home', 'imagePhotographyTypes', currentPhotographyTypeImage.compressedImageName));
        }

        await fsPromises.copyFile(currentPath, newPath);
        await this.imagePhotographyTypeModel.update({ compressedImageName: compressedImage.name }, { where: { name: imagePhotographyType }});

        return 'SUCCESS';
    }
    
    public async changePhotographyTypeDescription (requestBody: IRequestBody): Promise<void> {
        const { photographyTypeName, photographyTypeNewDescription } = requestBody.adminPanel;

        const imagePhotographyType: ImagePhotographyType = await this.imagePhotographyTypeModel.findByPk(photographyTypeName);

        await imagePhotographyType.update({ description: photographyTypeNewDescription });
    }

    public async validateImageControlRequests (request: IRequest, requestBody: IRequestBody, activeAdminLogin: string): Promise<string> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const client: Admin = await commonServiceRef.getClients(request, activeAdminLogin, { rawResult: false }) as Admin;

        const originalImageName: string = requestBody.adminPanel.originalImageName;
        const originalImagePath: string = path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName);

        const compressedImages: IClientCompressedImage[] = await commonServiceRef.getCompressedImages({
            client,
            find: { includeFields: [ 'name', 'originalName', 'photographyType', 'displayedOnGalleryPage' ] }
        }) as unknown as IClientCompressedImage[];

        const compressedImageInstance: IClientCompressedImage = compressedImages.find(compressedImage => compressedImage.originalName === originalImageName);

        const imageExists: boolean = await commonServiceRef.checkFileExists(path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName));

        if ( !compressedImageInstance || !imageExists ) throw new BadRequestException();
        if ( compressedImageInstance.displayedOnGalleryPage && (requestBody.adminPanel.displayTargetPage || requestBody.adminPanel.newImagePhotographyType) ) { 
            const galleryImagePaths: string[] = this.appService.imagePhotographyTypes.map(photographyType => {
                return path.join(this.staticCompressedImagesDirPath, 'gallery', photographyType, compressedImageInstance.name);
            });

            const existingPath: string = await this.getFulfilledAccessPath(galleryImagePaths);
            const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImageInstance.photographyType, compressedImageInstance.name);

            if ( existingPath !== staticFilesGalleryImagePath ) throw new InternalServerErrorException();
        }
        
        return originalImagePath;
    }

    public async getFulfilledAccessPath (paths: string[]): Promise<string> {
        const accessResults = await Promise.allSettled(paths.map(path => fsPromises.access(path, fsPromises.constants.F_OK)));

        let fulfilledPath: string = null;

        accessResults.forEach((result, index) => result.status === 'fulfilled' ? fulfilledPath = paths[index] : null);

        return fulfilledPath;
    }
}