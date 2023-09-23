import { Injectable } from '@nestjs/common';

import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

import ms from 'ms';
import sharp from 'sharp';

import { ClientService } from './services/client/client.service';
import { SignService } from './services/sign/sign.service';
import { ImageControlService } from './services/image-control/image-control.service';

import { Admin, Member } from './models/client.model';

import { IClient, ICookieSerializeOptions, IRequest } from 'types/global';
import { IClientGetOptions, IGetActiveClientOptions } from 'types/options';

@Injectable()
export class AppService {
    constructor (
        private readonly clientService: ClientService,
        private readonly signService: SignService,
        private readonly imageControlService: ImageControlService
    ) { }

    public __filename: string = fileURLToPath(import.meta.url);
    public __dirname: string = dirname(__filename);

    public cookieSerializeOptions: ICookieSerializeOptions = {
        httpOnly: true,
        maxAge: ms(process.env.COOKIE_MAXAGE_TIME as string),
        sameSite: 'strict',
        secure: false
    }

    public clientOriginalImagesDir: string = path.join(this.__dirname, 'originalImages');

    public async getClients (request: IRequest, loginList: string, options?: IClientGetOptions): Promise<Admin | Member>
    public async getClients (request: IRequest, loginList: string[], options?: IClientGetOptions): Promise<Admin[] | Member[]>
    public async getClients (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]>
    public async getClients (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]> {
        return this.clientService.get(request, loginList, options);
    }

    public registerClientLastActivityTime (request: IRequest, login: string): Promise<void> {
        return this.clientService.registerClientLastActivityTime(request, login);
    }

    public registerClientLastLoginTime (request: IRequest, login: string): Promise<void> {
        return this.clientService.registerClientLastLoginTime(request, login);
    }

    public async getActiveClient (request: IRequest, options?: { includeFields?: string, allowedIncludedFields?: string[] }): Promise<string>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string[], allowedIncludedFields?: string[] }): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: IGetActiveClientOptions): Promise<string | IClient> {
        return this.signService.getActiveClient(request, options);
    }

    public async compressImage (request: IRequest, inputImagePath: string, outputDirPath: string, activeClientLogin: string, options?: sharp.SharpOptions): Promise<boolean> {
        return this.imageControlService.compressImage(request, inputImagePath, outputDirPath, activeClientLogin, options);
    }
}