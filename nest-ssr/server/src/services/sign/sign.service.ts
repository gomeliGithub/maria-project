import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';

import { Response } from 'express';

import * as bcrypt from 'bcrypt';
import ms from 'ms';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';
import { JwtControlService } from '../../services/sign/jwt-control.service';

import { Admin, Member } from '../../models/client.model';

import { generate__secure_fgp } from './sign.generateKeys';

import { IClient, IRequest, IRequestBody } from 'types/global';
import { IClientAccessData, IClientSignData } from 'types/sign';
import { IGetActiveClientOptions } from 'types/options';

@Injectable()
export class SignService {
    constructor (
        private readonly appService: AppService,
        private readonly jwtService: JwtService,
        private readonly jwtControlService: JwtControlService,

        @InjectModel(Admin) 
        private readonly adminModel: typeof Admin,
        @InjectModel(Member) 
        private readonly memberModel: typeof Member
    ) { }

    public async validateClient (request: IRequest, requiredClientTypes: string[]): Promise<boolean> {
        const token = this.jwtControlService.extractTokenFromHeader(request); 

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        if ( (request.url === '/api/sign/up' || request.url === '/api/sign/in') && ( token && token !== '' ) ) this.jwtControlService.addRevokedToken(token);

        if ( request.url === '/api/sign/in' ) {
            const requestBody: IRequestBody = request.body;

            const clientLogin: string = requestBody.sign.clientSignData.login;
            const clientPassword: string = requestBody.sign.clientSignData.password;

            await this.jwtControlService.saveToken(token);
            await this._signDataValidate(request, clientLogin, clientPassword);

            await commonServiceRef.registerClientLastActivityTime(request, clientLogin);

            return true;
        } else {
            const validatedClient: IClient = await this.jwtControlService.tokenValidate(request, token);
            const clientType: string = validatedClient.type;

            await commonServiceRef.registerClientLastActivityTime(request, validatedClient.login);

            return requiredClientTypes.some(requiredClientType => requiredClientType === clientType);
        }
    }

    public async signUp (request: IRequest, clientSignData: IClientSignData): Promise<void> {
        const clientLogin: string = clientSignData.login;
        const clientPassword: string = clientSignData.password;
        const clientFullName: string = clientSignData.fullName;
        const clientEmail: string = clientSignData.email;

        const loginPattern: RegExp = /^[a-zA-Z](.[a-zA-Z0-9_-]*)$/;
        const emailPattern: RegExp = /^[^\s()<>@,;:\/]+@\w[\w\.-]+\.[a-z]{2,}$/i;

        // clientPassword.length < 4 
        if ( !loginPattern.test(clientLogin) || clientFullName.length < 5 || !emailPattern.test(clientEmail) ) throw new BadRequestException();

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const client: Admin | Member = await commonServiceRef.getClients(request, clientLogin, {
            includeFields: [ 'login', 'fullName' ],
            rawResult: true
        }) as Admin | Member;

        if ( client ) throw new UnauthorizedException();
        
        // const clientPasswordHash: string = await bcrypt.hash(clientPassword, process.env.CLIENT_PASSWORD_BCRYPT_SALTROUNDS);

        await this.memberModel.create({
            login: clientLogin,
            password: clientPassword,
            fullName: clientFullName,
            email: clientEmail
        });
    }

    public async signIn (request: IRequest, clientSignData: IClientSignData, response: Response): Promise<IClientAccessData> {
        const clientLogin: string = clientSignData.login;

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const client: Admin | Member = await commonServiceRef.getClients(request, clientLogin, {
            includeFields: [ 'login', 'fullName' ],
            rawResult: true
        }) as Admin | Member;

        if ( !client ) throw new UnauthorizedException();

        let clientType: 'admin' | 'member' = null;

        if ( client instanceof Admin ) clientType = 'admin';
        if ( client instanceof Member ) clientType = 'member';
        
        const payload: IClient = {
            login: client.login,
            type: clientType,
            // locale: process.env.CLIENT_DEFAULT_LOCALE,
            fullName: client.fullName,
            __secure_fgpHash: ""
        }

        const { __secure_fgp, __secure_fgpHash } = generate__secure_fgp();

        payload.__secure_fgpHash = __secure_fgpHash;

        await commonServiceRef.registerClientLastLoginTime(request, clientLogin);

        response.cookie('__secure_fgp', __secure_fgp, this.appService.cookieSerializeOptions);

        return {
            access_token: this.jwtService.sign(payload),
            // locale: process.env.CLIENT_DEFAULT_LOCALE,
            expiresTime: ms(process.env.JWT_EXPIRES_TIME)
        }
    }

    public async signOut (request: IRequest): Promise<void> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request);

        if ( !token || token === '' ) throw new UnauthorizedException();

        return this.jwtControlService.addRevokedToken(token);
    }

    public async getActiveClient (request: IRequest): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string, allowedIncludedFields?: string[] }): Promise<string>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string[], allowedIncludedFields?: string[] }): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string | string[], allowedIncludedFields?: string[] }): Promise<string | IClient>
    public async getActiveClient (request: IRequest, options?: IGetActiveClientOptions): Promise<string | IClient> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request);

        if ( !token || token === '') return null;
        
        const validatedClient: IClient = await this.jwtControlService.tokenValidate(request, token);

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        try {
            await commonServiceRef.getClients(request, validatedClient.login, { rawResult: false });
        } catch {
            throw new UnauthorizedException();
        }
            
        if ( !options ) options = {};

        if ( options.includedFields ) {
            if ( typeof options.includedFields === 'string' ) return validatedClient[options.includedFields];
            else if ( Array.isArray(options.includedFields) ) {
                if ( options.allowedIncludedFields && options.includedFields.some(field => !options.allowedIncludedFields.includes(field)) ) throw new BadRequestException();

                Object.keys(validatedClient).forEach(field => {
                    !options.includedFields.includes(field) ? delete validatedClient[field] : null;
                });
            }
        }

        return validatedClient;
    }

    private async _signDataValidate (request: IRequest, clientLogin: string, clientPassword: string): Promise<void> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const client: Admin | Member = await commonServiceRef.getClients(request, clientLogin, {
            includeFields: [ 'password' ],
            rawResult: true
        }) as Admin | Member;

        if ( !client ) throw new UnauthorizedException();

        const passwordValid: boolean = await bcrypt.compare(clientPassword, client.password);

        if (!passwordValid) throw new UnauthorizedException();
    }

    public async getBcryptHashSaltrounds (): Promise<string> {
        return process.env.CLIENT_PASSWORD_BCRYPT_SALTROUNDS;
    }
}