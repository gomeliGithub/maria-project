import { Injectable } from '@nestjs/common';

import ms from 'ms';

import { ClientService } from 'src/services/client/client.service';

import { Admin, Member } from 'models/client.model';

import { ICookieSerializeOptions, IRequest } from 'types/global';
import { IClientGetOptions } from 'types/options';

@Injectable()
export class AppService {
    constructor (
        private readonly clientService: ClientService
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
}