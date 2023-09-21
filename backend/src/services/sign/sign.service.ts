import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

import * as bcrypt from 'bcrypt';
import ms from 'ms';

import { AppService } from 'src/app.service';
import { JwtControlService } from 'src/services/sign/jwt-control.service';

import { Admin, Member } from 'src/models/client.model';

import { generate__secure_fgp } from './sign.generateKeys';

import { IClient, IRequest, IRequestBody } from 'types/global';
import { IClientAccessData, IClientSignData } from 'types/sign';
import { IGetActiveClientOptions } from 'types/options';

@Injectable()
export class SignService {
    constructor (
        private readonly appService: AppService,
        private readonly jwtService: JwtService,
        private readonly jwtControlService: JwtControlService
    ) { }

    public async validateClient (request: IRequest, requiredClientTypes: string[]): Promise<boolean> {
        const token = this.jwtControlService.extractTokenFromHeader(request); 

        if (request.url === "/api/sign/in") {
            const requestBody: IRequestBody = request.body;

            const clientLogin: string = requestBody.sign.clientSignData.login;
            const clientPassword: string = requestBody.sign.clientSignData.password;

            await this._signDataValidate(request, clientLogin, clientPassword);

            await this.appService.registerClientLastActivityTime(request, clientLogin);

            return true;
        } else {
            if (!requiredClientTypes) return true;

            const validatedClient: IClient = await this.jwtControlService.tokenValidate(request, token);

            const clientType: string = validatedClient.type;

            await this.appService.registerClientLastActivityTime(request, validatedClient.login);

            return requiredClientTypes.some(requiredClientType => requiredClientType === clientType);
        }
    }

    public async signIn (request: IRequest, clientAuthData: IClientSignData, response: Response): Promise<IClientAccessData> {
        const clientLogin: string = clientAuthData.login; 
        
        const client: Admin | Member = await this.appService.getClients(request, clientLogin, {
            includeFields: [ 'login', 'fullName' ],
            rawResult: true
        }) as Admin | Member;

        let clientType: 'admin' | 'member' = null;

        if (client instanceof Admin) clientType = 'admin';
        if (client instanceof Member) clientType = 'member';
        
        const payload: IClient = {
            login: client.login,
            type: clientType,
            locale: process.env.CLIENT_DEFAULT_LOCALE,
            fullName: client.fullName,
            __secure_fgpHash: ""
        }

        const { __secure_fgp, __secure_fgpHash } = generate__secure_fgp();

        payload.__secure_fgpHash = __secure_fgpHash;

        await this.appService.registerClientLastLoginTime(request, clientLogin);

        response.cookie('__secure_fgp', __secure_fgp, this.appService.cookieSerializeOptions);

        return {
            access_token: this.jwtService.sign(payload),
            locale: process.env.CLIENT_DEFAULT_LOCALE,
            expiresTime: ms(process.env.JWT_EXPIRES_TIME)
        }
    }

    public async signOut (request: IRequest): Promise<void> {
        const token = this.jwtControlService.extractTokenFromHeader(request);

        if (!token || token === "") throw new UnauthorizedException();

        return this.jwtControlService.addRevokedToken(token);
    }

    public async getActiveClient (request: IRequest, options: IGetActiveClientOptions): Promise<string | IClient> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request);

        if (!token || token === "") return null;
        
        const validatedClient: IClient = await this.jwtControlService.tokenValidate(request, token, false);

        if (!options.includedFields) options.includedFields = options.allowedIncludedFields; 
        
        if (validatedClient) {
            if (typeof options.includedFields === 'string') return validatedClient[options.includedFields];

            if (Array.isArray(options.includedFields)) {
                Object.keys(validatedClient).forEach(field => {
                    !options.includedFields.includes(field) ? delete validatedClient[field] : null;
                });

                return validatedClient;
            }
        }
    }

    private async _signDataValidate (request: IRequest, clientLogin: string, clientPassword: string): Promise<void> {
        const client: Admin | Member = await this.appService.getClients(request, clientLogin, {
            includeFields: [ 'password' ],
            rawResult: true
        }) as Admin | Member;

        if (!client) throw new UnauthorizedException();

        const passwordValid: boolean = await bcrypt.compare(clientPassword, client.password);

        if (!passwordValid) throw new UnauthorizedException();
    }
}