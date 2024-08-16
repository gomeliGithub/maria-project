import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { Response } from 'express';

import * as bcrypt from 'bcrypt';

import { CommonModule } from '../../modules/common.module';

import { PrismaService } from '../../../prisma/prisma.service';
import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';
import { JwtControlService } from '../../services/sign/jwt-control.service';

import { generate__secure_fgp } from './sign.generateKeys';

import { IRequest, IRequestBody } from 'types/global';
import { IClientSignData, IJWTPayload } from 'types/sign';
import { IAdminWithoutRelationFields, IMemberWithoutRelationFields } from 'types/models';

@Injectable()
export class SignService {
    constructor (
        private readonly _prisma: PrismaService,
        private readonly _jwtService: JwtService,
        private readonly _configService: ConfigService,

        private readonly _appService: AppService,
        private readonly _jwtControlService: JwtControlService
    ) { }

    public async validateClient (request: IRequest, requiredClientTypes: string[], throwError = true, commonServiceRef?: CommonService): Promise<boolean> {
        if ( !commonServiceRef ) commonServiceRef = await this._appService.getServiceRef(CommonModule, CommonService);

        if ( request.url === '/api/sign/in' ) {
            const token: string | undefined = this._jwtControlService.extractTokenFromHeader(request, false);

            const requestBody: IRequestBody = request.body;

            const clientLogin: string = ( requestBody.sign?.clientData as IClientSignData ).login.trim();
            const clientPassword: string = ( requestBody.sign?.clientData as IClientSignData ).password.trim();

            request.activeClientData = this._getActiveClientData(await this._clientSignDataValidate(commonServiceRef, request, clientLogin, clientPassword))

            if ( token && await this._jwtControlService.checkTokenIsExists(token) ) await this._jwtControlService.addRevokedToken(token);

            return true;
        } else {
            const token: string | undefined = this._jwtControlService.extractTokenFromHeader(request); 

            const validatedClientPayload: IJWTPayload | null = token ? await this._jwtControlService.tokenValidate(request, token, throwError) : null;
            const clientType: string | null = validatedClientPayload !== null ? validatedClientPayload.type : null;
            const clientLogin: string | null = validatedClientPayload !== null ? validatedClientPayload.login : null;

            const existingClientData: IAdminWithoutRelationFields | IMemberWithoutRelationFields | null = await commonServiceRef.checkAnyClientDataExists(clientLogin);

            if ( existingClientData === null ) {
                if ( throwError ) throw new UnauthorizedException(`${ request.url } "ValidateClient - client instance does not exists, login - ${ validatedClientPayload !== null ? validatedClientPayload.login : '' }"`);
                else return false;
            }

            request.activeClientData = this._getActiveClientData(existingClientData);

            return requiredClientTypes.some(requiredClientType => requiredClientType === clientType);
        }
    }

    public async signUp (request: IRequest, clientData: IClientSignData): Promise<void> {
        const { login, password, fullName, email } = clientData;

        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const existingClientData: IAdminWithoutRelationFields | IMemberWithoutRelationFields | null = await commonServiceRef.checkAnyClientDataExists(login.trim());
        
        if ( existingClientData === null ) throw new UnauthorizedException(`${ request.url } "SignUp - client instance does not exists"`);
        
        const passwordHash: string = await bcrypt.hash(password.trim(), parseInt(process.env.CLIENT_PASSWORD_BCRYPT_SALTROUNDS as string, 10));

        await this._prisma.member.create({ 
            data: {
                login: login.trim(),
                password: passwordHash,
                fullName: ( fullName as string ).trim(),
                email: ( email as string ).trim()
            }
        });
    }

    public async signIn (request: IRequest, response: Response, clientLocale: string): Promise<string> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const payload: IJWTPayload = {
            id: ( request.activeClientData as IJWTPayload ).id,
            login: ( request.activeClientData as IJWTPayload ).login,
            type: ( request.activeClientData as IJWTPayload ).type,
            locale: process.env.CLIENT_DEFAULT_LOCALE as string,
            fullName: ( request.activeClientData as IJWTPayload ).fullName,
            email: ( request.activeClientData as IJWTPayload ).email,
            signUpDate: ( request.activeClientData as IJWTPayload ).signUpDate,
            __secure_fgpHash: ""
        }

        const { __secure_fgp, __secure_fgpHash } = generate__secure_fgp();

        payload.__secure_fgpHash = __secure_fgpHash;

        await commonServiceRef.registerClientLastLoginTime(request.activeClientData as IJWTPayload);
        await commonServiceRef.registerClientLastActivityTime(request.activeClientData as IJWTPayload);

        const access_token: string = await this._jwtService.signAsync(payload, {
            secret: this._configService.get<string>('JWT_SECRETCODE') as string
        });

        await this._jwtControlService.saveToken(access_token);

        response.cookie('__secure_fgp', __secure_fgp, this._appService.cookieSerializeOptions);

        if ( !clientLocale ) response.cookie('locale', process.env.CLIENT_DEFAULT_LOCALE, this._appService.cookieSerializeOptions);

        return access_token;
    }

    public async signOut (request: IRequest): Promise<void> {
        const token: string | undefined = this._jwtControlService.extractTokenFromHeader(request);

        if ( !token || token === '' ) throw new UnauthorizedException(`${ request.url } "SignOut - invalid or does not exists token"`);

        return this._jwtControlService.addRevokedToken(token);
    }


    public async getActiveClient (request: IRequest, response: Response, clientLocale: string): Promise<IJWTPayload> {
        const token: string | undefined = this._jwtControlService.extractTokenFromHeader(request);

        let validatedClientPayload: IJWTPayload | null = null;

        try {
            if ( token ) validatedClientPayload = await this._jwtControlService.tokenValidate(request, token);
        } catch { }

        if ( validatedClientPayload === null || !token || token === '' ) {
            if ( response && ( !clientLocale || clientLocale === '' ) ) response.cookie('locale', process.env.CLIENT_DEFAULT_LOCALE, this._appService.cookieSerializeOptions);

            validatedClientPayload = {
                id: null,
                login: null,
                type: null,
                fullName: null,
                email: null,
                signUpDate: null,
                locale: clientLocale && clientLocale !== '' ? clientLocale : null 
            };

            return validatedClientPayload as IJWTPayload;
        }

        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        if ( validatedClientPayload ) {
            const existingClientData: IAdminWithoutRelationFields | IMemberWithoutRelationFields | null = await commonServiceRef.checkAnyClientDataExists(validatedClientPayload.login as string);

            if ( existingClientData === null ) throw new UnauthorizedException(`${ request.url } "GetActiveClient - client instance does not exists"`);
        }
        
        delete validatedClientPayload.exp;
        delete validatedClientPayload.iat;

        return validatedClientPayload;
    }

    private async _clientSignDataValidate (commonServiceRef: CommonService, request: IRequest, clientLogin: string, clientPassword: string): Promise<IAdminWithoutRelationFields | IMemberWithoutRelationFields> {
        const existingClientData: IAdminWithoutRelationFields | IMemberWithoutRelationFields | null = await commonServiceRef.checkAnyClientDataExists(clientLogin);

        // console.log(await bcrypt.hash('12345Admin', parseInt(process.env.CLIENT_PASSWORD_BCRYPT_SALTROUNDS as string, 10)));

        if ( existingClientData === null ) throw new UnauthorizedException(`${ request.url } "_clientSignDataValidate - client instance does not exists"`);

        const passwordIsValid: boolean = await bcrypt.compare(clientPassword, existingClientData.password); 
        

        
        // console.log(clientPassword); 
        // console.log(client.password);
        // console.log(await bcrypt.compare(clientPassword, client.password));


        
        if ( !passwordIsValid ) throw new UnauthorizedException(`${ request.url } "_clientSignDataValidate - client password invalid"`);

        return existingClientData;
    }

    private _getActiveClientData (validatedClientData: IAdminWithoutRelationFields | IMemberWithoutRelationFields): IJWTPayload {
        const activeClientData: IJWTPayload = {
            id: validatedClientData.id,
            login: validatedClientData.login,
            type: validatedClientData.type,
            fullName: validatedClientData.fullName,
            email: validatedClientData.email,
            locale: null,
            signUpDate: validatedClientData.signUpDate
        };

        return activeClientData;
    }
}