import { Injectable } from '@nestjs/common';
import { Response } from 'express';

import { Client_type } from '@prisma/client';

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

import { IClientOrdersInfoDataArr, ICompressImageData, IRequest } from 'types/global';
import { IClientGetOptions, ICreateImageDirsOptions, IGetClientOrdersOptions, ICompressedImageGetOptions } from 'types/options';
import { IWebSocketClient } from 'types/web-socket';
import { IAdmin, IAdminWithoutRelationFields, ICompressedImageWithoutRelationFields, IImagePhotographyType, IMember, IMemberWithClientOrdersCount, IMemberWithoutRelationFields } from 'types/models';
import { IJWTPayload } from 'types/sign';

@Injectable()
export class CommonService {
    public webSocketClients: IWebSocketClient[] = [];
    public promisesCache: { [ x: string ]: { pendingPromises: Promise<any>[], count: number } } = { };
    public adminPanelImageOperationKeys: string[] = [ 'deleteImage', 'changeImageDisplayTargetRename', 'changeImageData', 'setPhotographyTypeImageUnlink', 'setPhotographyTypeImageCopy' ];

    constructor (
        private readonly _appService: AppService
    ) { }

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

    public async validateClient (request: IRequest, requiredClientTypes: string[], throwError = true, commonServiceRef?: CommonService): Promise<boolean> {
        const signServiceRef: SignService = await this._appService.getServiceRef(SignModule, SignService);

        return signServiceRef.validateClient(request, requiredClientTypes, throwError, commonServiceRef);
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
        const clientServiceRef: ClientService = await this._appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.getClientsData(clientType, loginList, options);
    }

    public async checkAnyClientDataExists (login: string | null): Promise<IAdminWithoutRelationFields | IMemberWithoutRelationFields | null> {
        const clientServiceRef: ClientService = await this._appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.checkAnyClientDataExists(login);
    }

    public async getClientOrdersInfo (loginList: string, options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr>
    public async getClientOrdersInfo (loginList: string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: 'all', options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: string | string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr[]>
    public async getClientOrdersInfo (loginList: string | string[], options: IGetClientOrdersOptions): Promise<IClientOrdersInfoDataArr | IClientOrdersInfoDataArr[]> {
        const clientServiceRef: ClientService = await this._appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.getClientOrdersInfo(loginList, options);
    }

    public async registerClientLastActivityTime (clientData: IJWTPayload): Promise<void> {
        const clientServiceRef: ClientService = await this._appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.registerClientLastActivityTime(clientData);
    }

    public async registerClientLastLoginTime (clientData: IJWTPayload): Promise<void> {
        const clientServiceRef = await this._appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.registerClientLastLoginTime(clientData);
    }

    public async getActiveClient (request: IRequest, response: Response, clientLocale: string): Promise<IJWTPayload> {
        const signServiceRef = await this._appService.getServiceRef(SignModule, SignService);

        return signServiceRef.getActiveClient(request, response, clientLocale);
    }

    public async createImageDirs (options?: ICreateImageDirsOptions): Promise<void> {
        const imageControlServiceRef: ImageControlService = await this._appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.createImageDirs(options);
    }

    public async compressImage (request: IRequest, compressImageData: ICompressImageData, options?: sharp.SharpOptions): Promise<boolean> {
        const imageControlServiceRef = await this._appService.getServiceRef(ImageControlModule, ImageControlService);
        
        return imageControlServiceRef.compressImage(request, compressImageData, options);
    }

    public async getCompressedImages (options: ICompressedImageGetOptions): Promise<ICompressedImageWithoutRelationFields[]> {
        const imageControlServiceRef: ImageControlService = await this._appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.getCompressedImages(options);
    }

    public async checkFileExists (filePath: string): Promise<boolean> {
        const imageControlServiceRef: ImageControlService = await this._appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.checkFileExists(filePath);
    }

    public async getFulfilledAccessPath (paths: string[]): Promise<string> {
        const adminPanelServiceRef: AdminPanelService = await this._appService.getServiceRef(AdminPanelModule, AdminPanelService);

        return adminPanelServiceRef.getFulfilledAccessPath(paths);
    }

    public async deleteImage (commonServiceRef: CommonService, request: IRequest, imagePath: string, clientLogin: string): Promise<boolean> {
        const imageControlServiceRef = await this._appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.deleteImage(commonServiceRef, request, imagePath, clientLogin);
    }

    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home'): Promise<IImagePhotographyType[][]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'admin'): Promise<IImagePhotographyType[]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin'): Promise<IImagePhotographyType[][] | IImagePhotographyType[]>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin' | 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType>
    public async getImagePhotographyTypesData (requiredFields: string[], targetPage: 'home' | 'admin' | 'gallery', photographyTypeName?: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[] | IImagePhotographyType> {
        const clientServiceRef = await this._appService.getServiceRef(ClientModule, ClientService);

        if ( targetPage === 'gallery' ) return clientServiceRef.getImagePhotographyTypesData(requiredFields, targetPage, photographyTypeName);
        else return clientServiceRef.getImagePhotographyTypesData(requiredFields, targetPage);
    }

    public async throwWebSocketError (commonServiceRef: CommonService, newOriginalImagePath: string, webSocketClientId: number, imageMetaSize: number) {
        const adminPanelServiceRef: AdminPanelService = await this._appService.getServiceRef(AdminPanelModule, AdminPanelService);

        return adminPanelServiceRef.throwWebSocketError(commonServiceRef, newOriginalImagePath, webSocketClientId, imageMetaSize);
    }
}