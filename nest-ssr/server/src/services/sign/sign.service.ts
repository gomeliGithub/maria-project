import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';

import { Response } from 'express';

import * as bcrypt from 'bcrypt';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';
import { JwtControlService } from '../../services/sign/jwt-control.service';

import { Admin, Member } from '../../models/client.model';

import { generate__secure_fgp } from './sign.generateKeys';

import { IClient, IRequest, IRequestBody } from 'types/global';
import { IClientSignData } from 'types/sign';
import { IGetActiveClientOptions } from 'types/options';
import { IAdmin, IMember } from 'types/models';

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

    public async validateClient (request: IRequest, requiredClientTypes: string[], throwError = true, commonServiceRef?: CommonService): Promise<boolean> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request); 

        if ( !commonServiceRef ) commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        if ( request.url === '/api/sign/in' ) {
            const requestBody: IRequestBody = request.body;

            if ( !requestBody.sign || !requestBody.sign.clientData || !requestBody.sign.clientData.login || !requestBody.sign.clientData.password ||
                typeof requestBody.sign.clientData.login !== 'string' || typeof requestBody.sign.clientData.password !== 'string'
            ) throw new BadRequestException(`${ request.url } "ValidateClient - invalid sign client data"`);

            const clientLogin: string = requestBody.sign.clientData.login.trim();
            const clientPassword: string = requestBody.sign.clientData.password;

            request.activeClientInstance = await this._signDataValidate(commonServiceRef, request, clientLogin, clientPassword);

            if ( token ) await this.jwtControlService.addRevokedToken(token);

            return true;
        } else {
            const validatedClientPayload: IClient = await this.jwtControlService.tokenValidate(request, token, throwError);
            const clientType: string = validatedClientPayload ? validatedClientPayload.type : null;
            const clientLogin: string = validatedClientPayload ? validatedClientPayload.login : null;

            const clientInstance: Admin | Member = await commonServiceRef.getClients(clientLogin, false) as Admin | Member;

            if ( !clientInstance ) {
                if ( throwError ) throw new UnauthorizedException(`${ request.url } "ValidateClient - client instance does not exists, login - ${ validatedClientPayload.login }"`);
                else return false;
            }

            request.activeClientInstance = clientInstance;

            return requiredClientTypes.some(requiredClientType => requiredClientType === clientType);
        }
    }

    public async signUp (request: IRequest, clientData: IClientSignData, isNewAdmin = false): Promise<void> {
        const clientLogin: string = clientData.login.trim();
        const clientPassword: string = clientData.password;
        const clientFullName: string = clientData.fullName.trim();
        const clientEmail: string = clientData.email.trim();

        const loginPattern: RegExp = /^[a-zA-Z](.[a-zA-Z0-9_-]*)$/;
        const emailPattern: RegExp = /^[^\s()<>@,;:\/]+@\w[\w\.-]+\.[a-z]{2,}$/i;

        // clientPassword.length < 4
        const isIncorrectLogin: boolean = !loginPattern.test(clientLogin) || clientLogin.length < 4 || clientLogin.length > 15;
        const isIncorrectFullName: boolean = clientFullName.length < 3 || clientFullName.length > 25;
        const isIncorrectEmail: boolean = !emailPattern.test(clientEmail);

        if ( isIncorrectLogin || isIncorrectFullName || ( clientEmail && isIncorrectEmail ) ) {
            let message: string = null;
            
            if ( isIncorrectLogin ) message = 'SignUp - incorrect login';
            else if ( isIncorrectFullName ) message = 'SignUp - incorrect full name';
            else if ( isIncorrectEmail ) message = 'SignUp - incorrect email';

            throw new BadRequestException(`${ request.url } "${ message }"`);
        }

        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const clientRawData: IAdmin | IMember = await commonServiceRef.getClients(clientLogin, true, { includeFields: [ 'login', 'fullName' ] });

        if ( clientRawData ) throw new UnauthorizedException(`${ request.url } "SignUp - client instance does not exists"`);
        
        // const clientPasswordHash: string = await bcrypt.hash(clientPassword, process.env.CLIENT_PASSWORD_BCRYPT_SALTROUNDS);

        if ( isNewAdmin ) await this.adminModel.create({
            login: clientLogin,
            password: clientPassword,
            fullName: clientFullName,
            email: clientEmail,
            type: 'admin'
        });
        else await this.memberModel.create({
            login: clientLogin,
            password: clientPassword,
            fullName: clientFullName,
            email: clientEmail,
            type: 'member'
        });
    }

    public async signIn (request: IRequest, response: Response, clientLocale: string): Promise<string> {
        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        const payload: IClient = {
            id: request.activeClientInstance.id,
            login: request.activeClientInstance.login,
            type: request.activeClientInstance.type as 'admin' | 'member',
            locale: process.env.CLIENT_DEFAULT_LOCALE,
            fullName: request.activeClientInstance.fullName,
            __secure_fgpHash: ""
        }

        const { __secure_fgp, __secure_fgpHash } = generate__secure_fgp();

        payload.__secure_fgpHash = __secure_fgpHash;

        await commonServiceRef.registerClientLastLoginTime(request.activeClientInstance);
        await commonServiceRef.registerClientLastActivityTime(request.activeClientInstance);

        const access_token: string = this.jwtService.sign(payload);

        await this.jwtControlService.saveToken(access_token);

        response.cookie('__secure_fgp', __secure_fgp, this.appService.cookieSerializeOptions);

        if ( !clientLocale ) response.cookie('locale', process.env.CLIENT_DEFAULT_LOCALE, this.appService.cookieSerializeOptions);

        return access_token;
    }

    public async signOut (request: IRequest): Promise<void> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request);

        if ( !token || token === '' ) throw new UnauthorizedException(`${ request.url } "SignOut - invalid or does not exists token"`);

        return this.jwtControlService.addRevokedToken(token);
    }

    public async getActiveClient (request: IRequest): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string, allowedIncludedFields?: string[] }): Promise<string>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string[], allowedIncludedFields?: string[], response?: Response, clientLocale?: string }): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string | string[], allowedIncludedFields?: string[] }): Promise<string | IClient>
    public async getActiveClient (request: IRequest, options?: IGetActiveClientOptions): Promise<string | IClient> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request);

        let validatedClientPayload: IClient = null;

        try {
            validatedClientPayload = await this.jwtControlService.tokenValidate(request, token);
        } catch { }

        if ( !validatedClientPayload || !token || token === '' ) {
            if ( options.response && ( !options.clientLocale || options.clientLocale === '' ) ) options.response.cookie('locale', process.env.CLIENT_DEFAULT_LOCALE, this.appService.cookieSerializeOptions);

            if ( options.response ) validatedClientPayload = { locale: options.clientLocale && options.clientLocale !== '' ? options.clientLocale : null };

            return validatedClientPayload;
        }

        const commonServiceRef: CommonService = await this.appService.getServiceRef(CommonModule, CommonService);

        if ( validatedClientPayload ) {
            const clientInstance: Admin | Member = await commonServiceRef.getClients(validatedClientPayload.login, false);

            if ( !clientInstance ) throw new UnauthorizedException(`${ request.url } "GetActiveClient - client instance does not exists"`);
        }
            
        if ( !options ) options = {};

        if ( validatedClientPayload && options.includeFields ) {
            if ( typeof options.includeFields === 'string' ) return validatedClientPayload[options.includeFields];
            else if ( Array.isArray(options.includeFields) ) {
                if ( options.allowedIncludedFields ) {
                    const isNotAllowedIncludedField: boolean = options.includeFields.some(field => !options.allowedIncludedFields.includes(field));

                    if ( isNotAllowedIncludedField ) throw new BadRequestException(`${ request.url } "GetActiveClient - not allowed included field"`);
                }

                Object.keys(validatedClientPayload).forEach(field => {
                    !options.includeFields.includes(field) ? delete validatedClientPayload[field] : null;
                });
            }
        }

        return validatedClientPayload;
    }

    private async _signDataValidate (commonServiceRef: CommonService, request: IRequest, clientLogin: string, clientPassword: string): Promise<Admin | Member> {
        const clientInstance: Admin | Member = await commonServiceRef.getClients(clientLogin, false);

        console.log(await bcrypt.hash('12345Admin', parseInt(process.env.CLIENT_PASSWORD_BCRYPT_SALTROUNDS, 10)));

        if ( !clientInstance ) throw new UnauthorizedException(`${ request.url } "_signDataValidate - client instance does not exists"`);

        const passwordIsValid: boolean = await bcrypt.compare(clientPassword, clientInstance.password); 
        
        
        // console.log(clientPassword); 
        // console.log(client.password);
        // console.log(await bcrypt.compare(clientPassword, client.password));


        if ( !passwordIsValid ) throw new UnauthorizedException(`${ request.url } "_signDataValidate - client password invalid"`);

        return clientInstance;
    }

    public async getBcryptHashSaltrounds (): Promise<string> {
        return process.env.CLIENT_PASSWORD_BCRYPT_SALTROUNDS;
    }
}