import { Injectable } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';

import sharp from 'sharp';

import { ClientModule } from '../../modules/client.module';
import { SignModule } from '../../modules/sign.module';
import { ImageControlModule } from '../../modules/image-control.module';

import { ClientService } from '../../services/client/client.service';
import { SignService } from '../../services/sign/sign.service';
import { ImageControlService } from '../../services/image-control/image-control.service';

import { Admin, Member } from '../../models/client.model';

import { IClient, IRequest } from 'types/global';
import { IClientGetOptions, IGetActiveClientOptions } from 'types/options';

@Injectable()
export class CommonService {
    constructor (
        private lazyModuleLoader: LazyModuleLoader
    ) { }

    public async getClients (request: IRequest, loginList: string, options?: IClientGetOptions): Promise<Admin | Member>
    public async getClients (request: IRequest, loginList: string[], options?: IClientGetOptions): Promise<Admin[] | Member[]>
    public async getClients (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]>
    public async getClients (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]> {
        const clientModuleRef = await this.lazyModuleLoader.load(() => ClientModule);
        const clientServiceRef = clientModuleRef.get(ClientService);

        return clientServiceRef.get(request, loginList, options);
    }

    public async registerClientLastActivityTime (request: IRequest, login: string): Promise<void> {
        const clientModuleRef = await this.lazyModuleLoader.load(() => ClientModule);
        const clientServiceRef = clientModuleRef.get(ClientService);

        return clientServiceRef.registerClientLastActivityTime(request, login);
    }

    public async registerClientLastLoginTime (request: IRequest, login: string): Promise<void> {
        const clientModuleRef = await this.lazyModuleLoader.load(() => ClientModule);
        const clientServiceRef = clientModuleRef.get(ClientService);

        return clientServiceRef.registerClientLastLoginTime(request, login);
    }

    public async getActiveClient (request: IRequest, options?: { includeFields?: string, allowedIncludedFields?: string[] }): Promise<string>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string[], allowedIncludedFields?: string[] }): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: IGetActiveClientOptions): Promise<string | IClient> {
        const signModuleRef = await this.lazyModuleLoader.load(() => SignModule);
        const signServiceRef = signModuleRef.get(SignService);

        return signServiceRef.getActiveClient(request, options);
    }

    public async compressImage (request: IRequest, inputImagePath: string, outputDirPath: string, activeClientLogin: string, options?: sharp.SharpOptions): Promise<boolean> {
        const imageControlModuleRef = await this.lazyModuleLoader.load(() => ImageControlModule);
        const imageControlServiceRef = imageControlModuleRef.get(ImageControlService);
        
        return imageControlServiceRef.compressImage(request, inputImagePath, outputDirPath, activeClientLogin, options);
    }
}