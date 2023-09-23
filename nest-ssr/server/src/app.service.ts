import { Injectable } from '@nestjs/common';

import ms from 'ms';
import sharp from 'sharp';

import { ClientService } from './services/client/client.service';
import { ImageControlService } from './services/image-control/image-control.service';

import { Admin, Member } from './models/client.model';

import { ICookieSerializeOptions, IRequest } from 'types/global';
import { IClientGetOptions } from 'types/options';

@Injectable()
export class AppService {
    constructor (
        private readonly clientService: ClientService,
        private readonly imageControlService: ImageControlService
    ) { }

    public cookieSerializeOptions: ICookieSerializeOptions = {
        httpOnly: true,
        maxAge: ms(process.env.COOKIE_MAXAGE_TIME as string),
        sameSite: 'strict',
        secure: false
    }

    public getClients (request: IRequest, loginList: string | string[], options?: IClientGetOptions): Promise<Admin | Member | Admin[] | Member[]> {
        return this.clientService.get(request, loginList, options);
    }

    public registerClientLastActivityTime (request: IRequest, login: string): Promise<void> {
        return this.clientService.registerClientLastActivityTime(request, login);
    }

    public registerClientLastLoginTime (request: IRequest, login: string): Promise<void> {
        return this.clientService.registerClientLastLoginTime(request, login);
    }

    public async compressImage (inputImagePath: string, outputDirPath: string, options: sharp.SharpOptions): Promise<boolean> {
        return this.imageControlService.compressImage(inputImagePath, outputDirPath, options);
    }
}