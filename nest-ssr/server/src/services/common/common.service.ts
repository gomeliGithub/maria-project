import { Injectable } from '@nestjs/common';

import sharp from 'sharp';

import { ClientModule } from '../../modules/client.module';
import { SignModule } from '../../modules/sign.module';
import { ImageControlModule } from '../../modules/image-control.module';
import { AdminPanelModule } from '../../modules/admin-panel.module';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';
import { SignService } from '../../services/sign/sign.service';
import { ImageControlService } from '../../services/image-control/image-control.service';
import { AdminPanelService } from '../admin-panel/admin-panel.service';

import { Admin, Member, ClientCompressedImage } from '../../models/client.model';

import { IClient, IClientOrdersInfoDataArr, ICompressImageData, IRequest } from 'types/global';
import { IClientGetOptions, ICreateImageDirsOptions, IGetActiveClientOptions, IGetClientOrdersOptions, IСompressedImageGetOptions } from 'types/options';
import { IWebSocketClient } from 'types/web-socket';
import { IAdmin, IClientCompressedImage, IImagePhotographyType, IMember } from 'types/models';

@Injectable()
export class CommonService {
    constructor (
        private readonly appService: AppService
    ) { }

    public webSocketClients: IWebSocketClient[] = [];
    public promisesCache: { [ x: string ]: { pendingPromises: Promise<any>[], count: number } } = { };
    public adminPanelImageOperationKeys: string[] = [ 'deleteImage', 'changeImageDisplayTargetRename', 'changeImageData', 'setPhotographyTypeImageUnlink', 'setPhotographyTypeImageCopy' ];

    public async managePromisesCache (key: string, promise: Promise<any>): Promise<any> {
        if ( !this.promisesCache[key] ) {
            this.promisesCache[key] = { 
                pendingPromises: [],
                count: 0
            }
        }

        if ( ( this.adminPanelImageOperationKeys.includes(key) && this.promisesCache[key].count === 0 ) || this.promisesCache[key].count <= 3 ) {
            const pendingPromise: Promise<any> = promise;

            this.promisesCache[key].pendingPromises.push(pendingPromise);
            this.promisesCache[key].count = this.promisesCache[key].count += 1;

            await pendingPromise;

            this.promisesCache[key].pendingPromises = this.promisesCache[key].pendingPromises.filter((_, index) => {
                return index !== this.promisesCache[key].count - 1;
            });

            this.promisesCache[key].count = this.promisesCache[key].count -= 1;

            return pendingPromise;
        } else {
            const firstPendingPromise: Promise<any> = this.promisesCache[key].pendingPromises[0];

            await firstPendingPromise;
        }
    }

    public async getClients (loginList: string, options?: {
        includeFields?: string[];
        rawResult?: false;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<Admin | Member>
    public async getClients (loginList: string, options?: {
        includeFields?: string[];
        rawResult?: true;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<IAdmin | IMember>
    public async getClients (loginList: string[], options?: {
        includeFields?: string[];
        rawResult?: false;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<Admin[] | Member[]>
    public async getClients (loginList: string[], options?: {
        includeFields?: string[];
        rawResult?: true;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<IAdmin[] | IMember[]>
    public async getClients (loginList: 'full', options?: {
        includeFields?: string[];
        rawResult?: false;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<Member[]>
    public async getClients (loginList: 'full', options?: {
        includeFields?: string[];
        rawResult?: true;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<IMember[]>
    public async getClients (loginList: string | string[], options?: {
        includeFields?: string[];
        rawResult?: false;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<Admin | Member | Admin[] | Member[]>
    public async getClients (loginList: string | string[], options?: {
        includeFields?: string[];
        rawResult?: true;
        clientType?: 'admin' | 'member';
        includeOrders?: boolean;
    }): Promise<IAdmin | IMember | IAdmin[] | IMember[]>
    public async getClients (loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[] | IAdmin | IMember | IAdmin[] | IMember[]>
    public async getClients (loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[] | IAdmin | IMember | IAdmin[] | IMember[]> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.get(loginList, options);
    }

    public async getClientOrdersInfo (loginList: string, options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr>
    public async getClientOrdersInfo (loginList: string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: 'all', options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: string | string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: string | string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr | IClientOrdersInfoDataArr[]> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.getClientOrdersInfo(loginList, options);
    }


    public async registerClientLastActivityTime (clientInstance: Admin | Member): Promise<void> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.registerClientLastActivityTime(clientInstance);
    }

    public async registerClientLastLoginTime (clientInstance: Admin | Member): Promise<void> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.registerClientLastLoginTime(clientInstance);
    }

    public async getActiveClient (request: IRequest): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string, allowedIncludedFields?: string[] }): Promise<string>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string[], allowedIncludedFields?: string[] }): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string | string[], allowedIncludedFields?: string[] }): Promise<string | IClient>
    public async getActiveClient (request: IRequest, options?: IGetActiveClientOptions): Promise<string | IClient> {
        const signServiceRef = await this.appService.getServiceRef(SignModule, SignService);

        return signServiceRef.getActiveClient(request, options);
    }

    public async createImageDirs (options?: ICreateImageDirsOptions): Promise<void> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.createImageDirs(options);
    }

    public async compressImage (compressImageData: ICompressImageData, activeClientLogin: string, options?: sharp.SharpOptions): Promise<boolean> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);
        
        return imageControlServiceRef.compressImage(compressImageData, activeClientLogin, options);
    }

    public async getCompressedImages (options: {
        client?: Admin,
        find?: {
            imageTitles?: string[],
            includeFields?: string[],
            imageViewSize?: string,
            rawResult: false
        },
        imagesLimit?: number,
        imagesExistsCount?: number
    }): Promise<ClientCompressedImage[]>
    public async getCompressedImages (options: {
        client?: Admin,
        find?: {
            imageTitles?: string[],
            includeFields?: string[],
            imageViewSize?: string,
            rawResult: true 
        },
        imagesLimit?: number,
        imagesExistsCount?: number
    }): Promise<IClientCompressedImage[]>
    public async getCompressedImages (options: IСompressedImageGetOptions): Promise<ClientCompressedImage[] | IClientCompressedImage[]>
    public async getCompressedImages (options: IСompressedImageGetOptions): Promise<ClientCompressedImage[] | IClientCompressedImage[]> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.get(options);
    }

    public async checkFileExists (filePath: string): Promise<boolean> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.checkFileExists(filePath);
    }

    async getFulfilledAccessPath (paths: string[]): Promise<string> {
        const adminPanelServiceRef = await this.appService.getServiceRef(AdminPanelModule, AdminPanelService);

        return adminPanelServiceRef.getFulfilledAccessPath(paths);
    }

    public async deleteImage (imagePath: string, clientLogin: string): Promise<boolean> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.deleteImage(imagePath, clientLogin);
    }

    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home'): Promise<IImagePhotographyType[][]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'admin'): Promise<IImagePhotographyType[]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin'): Promise<IImagePhotographyType[][] | IImagePhotographyType[]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin' | 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin' | 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        if ( targetPage === 'gallery' ) return clientServiceRef.getImagePhotographyTypesData(requiredFields, targetPage, photographyTypeName);
        else return clientServiceRef.getImagePhotographyTypesData(requiredFields, targetPage);
    }
}