import { Injectable } from '@nestjs/common';

import sharp from 'sharp';

import { ClientModule } from '../../modules/client.module';
import { SignModule } from '../../modules/sign.module';
import { ImageControlModule } from '../../modules/image-control.module';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';
import { SignService } from '../../services/sign/sign.service';
import { ImageControlService } from '../../services/image-control/image-control.service';

import { Admin, Member, ClientCompressedImage } from '../../models/client.model';

import { IClient, ICompressImageData, IRequest } from 'types/global';
import { IClientGetOptions, ICreateImageDirsOptions, IGetActiveClientOptions, IСompressedImageGetOptions } from 'types/options';
import { IWebSocketClient } from 'types/web-socket';
import { IImagePhotographyType } from 'types/models';

@Injectable()
export class CommonService {
    constructor (
        private readonly appService: AppService
    ) { }

    public webSocketClients: IWebSocketClient[] = [];

    public async getClients (request: IRequest, loginList: string, options?: IClientGetOptions): Promise<Admin | Member>
    public async getClients (request: IRequest, loginList: string[], options?: IClientGetOptions): Promise<Admin[] | Member[]>
    public async getClients (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]>
    public async getClients (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.get(request, loginList, options);
    }

    public async registerClientLastActivityTime (client: Admin | Member): Promise<void> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.registerClientLastActivityTime(client);
    }

    public async registerClientLastLoginTime (client: Admin | Member): Promise<void> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.registerClientLastLoginTime(client);
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

    public async compressImage (request: IRequest, compressImageData: ICompressImageData, activeClientLogin: string, options?: sharp.SharpOptions): Promise<boolean> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);
        
        return imageControlServiceRef.compressImage(request, compressImageData, activeClientLogin, options);
    }

    public async getCompressedImages (options: IСompressedImageGetOptions): Promise<ClientCompressedImage[]> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.get(options);
    }

    public async checkFileExists (filePath: string): Promise<boolean> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.checkFileExists(filePath);
    }

    public async deleteImage (request: IRequest, imagePath: string, clientLogin: string): Promise<boolean> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.deleteImage(request, imagePath, clientLogin);
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