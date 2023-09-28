import { Injectable } from '@nestjs/common';

import sharp from 'sharp';

import { ClientModule } from '../../modules/client.module';
import { SignModule } from '../../modules/sign.module';
import { ImageControlModule } from '../../modules/image-control.module';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';
import { SignService } from '../../services/sign/sign.service';
import { ImageControlService } from '../../services/image-control/image-control.service';

import { Admin, Member } from '../../models/client.model';

import { IClient, IRequest, IСompressedImageGetResult } from 'types/global';
import { IClientGetOptions, IGetActiveClientOptions, IСompressedImageGetOptions } from 'types/options';

@Injectable()
export class CommonService {
    constructor (
        private readonly appService: AppService
    ) { }

    public async getClients (request: IRequest, loginList: string, options?: IClientGetOptions): Promise<Admin | Member>
    public async getClients (request: IRequest, loginList: string[], options?: IClientGetOptions): Promise<Admin[] | Member[]>
    public async getClients (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]>
    public async getClients (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.get(request, loginList, options);
    }

    public async registerClientLastActivityTime (request: IRequest, login: string): Promise<void> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.registerClientLastActivityTime(request, login);
    }

    public async registerClientLastLoginTime (request: IRequest, login: string): Promise<void> {
        const clientServiceRef = await this.appService.getServiceRef(ClientModule, ClientService);

        return clientServiceRef.registerClientLastLoginTime(request, login);
    }

    public async getActiveClient (request: IRequest): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string, allowedIncludedFields?: string[] }): Promise<string>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string[], allowedIncludedFields?: string[] }): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string | string[], allowedIncludedFields?: string[] }): Promise<string | IClient>
    public async getActiveClient (request: IRequest, options?: IGetActiveClientOptions): Promise<string | IClient> {
        const signServiceRef = await this.appService.getServiceRef(SignModule, SignService);

        return signServiceRef.getActiveClient(request, options);
    }

    public async compressImage (request: IRequest, inputImagePath: string, outputDirPath: string, activeClientLogin: string, options?: sharp.SharpOptions): Promise<boolean> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);
        
        return imageControlServiceRef.compressImage(request, inputImagePath, outputDirPath, activeClientLogin, options);
    }

    public async getCompressedImages (client: Admin | Member, clientType: 'admin' | 'member', options?: IСompressedImageGetOptions): Promise<IСompressedImageGetResult> {
        const imageControlServiceRef = await this.appService.getServiceRef(ImageControlModule, ImageControlService);

        return imageControlServiceRef.get(client, clientType, options);
    }
}