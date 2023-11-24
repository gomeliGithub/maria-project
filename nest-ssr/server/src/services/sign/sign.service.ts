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

    public async validateClient (request: IRequest, requiredClientTypes: string[]): Promise<boolean> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request); 

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        if ( request.url === '/api/sign/in' ) {
            const requestBody: IRequestBody = request.body;

            const clientLogin: string = requestBody.sign.clientData.login;
            const clientPassword: string = requestBody.sign.clientData.password;

            await this._signDataValidate(clientLogin, clientPassword);

            if ( token ) await this.jwtControlService.addRevokedToken(token);

            return true;
        } else {
            const validatedClient: IClient = await this.jwtControlService.tokenValidate(request, token);
            const clientType: string = validatedClient.type;

            const clientInstance: Admin | Member = await commonServiceRef.getClients(validatedClient.login, { rawResult: false }) as Admin | Member;

            if ( !clientInstance ) throw new UnauthorizedException(`ValidateClient - client instance does not exists, login - ${ validatedClient.login }`);

            return requiredClientTypes.some(requiredClientType => requiredClientType === clientType);
        }
    }

    public async signUp (clientData: IClientSignData, isNewAdmin = false): Promise<void> {
        const clientLogin: string = clientData.login.trim();
        const clientPassword: string = clientData.password;
        const clientFullName: string = clientData.fullName.trim();
        const clientEmail: string = clientData.email.trim();

        const loginPattern: RegExp = /^[a-zA-Z](.[a-zA-Z0-9_-]*)$/;
        const emailPattern: RegExp = /^[^\s()<>@,;:\/]+@\w[\w\.-]+\.[a-z]{2,}$/i;

        // clientPassword.length < 4
        const incorrectLogin: boolean = !loginPattern.test(clientLogin) || clientLogin.length < 4 || clientLogin.length > 15;
        const incorrectFullName: boolean = clientFullName.length < 3 || clientFullName.length > 25;
        const incorrectRmail: boolean = !emailPattern.test(clientEmail);

        if ( incorrectLogin || incorrectFullName || ( clientEmail && incorrectRmail ) ) {
            let message: string = null;
            
            if ( incorrectLogin ) message = 'SignUp - incorrect login';
            else if ( incorrectFullName ) message = 'SignUp - incorrect full name';
            else if ( incorrectRmail ) message = 'SignUp - incorrect email';

            throw new BadRequestException(message);
        }

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const clientRaw: IAdmin | IMember = await commonServiceRef.getClients(clientLogin, {
            includeFields: [ 'login', 'fullName' ],
            rawResult: true
        });

        if ( clientRaw ) throw new UnauthorizedException('SignUp - client instance does not exists');
        
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

    public async signIn (clientSignData: IClientSignData, response: Response): Promise<string> {
        const clientLogin: string = clientSignData.login.trim();

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const clientRaw: IAdmin | IMember = await commonServiceRef.getClients(clientLogin, {
            includeFields: [ 'id', 'login', 'fullName', 'type' ],
            rawResult: true
        });

        const payload: IClient = {
            id: clientRaw.id,
            login: clientRaw.login,
            type: clientRaw.type as 'admin' | 'member',
            locale: process.env.CLIENT_DEFAULT_LOCALE,
            fullName: clientRaw.fullName,
            __secure_fgpHash: ""
        }

        const { __secure_fgp, __secure_fgpHash } = generate__secure_fgp();

        payload.__secure_fgpHash = __secure_fgpHash;

        const clientInstance: Admin | Member = await commonServiceRef.getClients(clientLogin, { rawResult: false }) as Admin | Member;

        await commonServiceRef.registerClientLastLoginTime(clientInstance);
        await commonServiceRef.registerClientLastActivityTime(clientInstance);

        const access_token: string = this.jwtService.sign(payload);

        await this.jwtControlService.saveToken(access_token);

        response.cookie('__secure_fgp', __secure_fgp, this.appService.cookieSerializeOptions);
        response.cookie('locale', process.env.CLIENT_DEFAULT_LOCALE, this.appService.cookieSerializeOptions);

        return access_token;
    }

    public async signOut (request: IRequest): Promise<void> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request);

        if ( !token || token === '' ) throw new UnauthorizedException('SignOut - invalid or does not exists token');

        return this.jwtControlService.addRevokedToken(token);
    }

    public async getActiveClient (request: IRequest): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string, allowedIncludedFields?: string[] }): Promise<string>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string[], allowedIncludedFields?: string[] }): Promise<IClient>
    public async getActiveClient (request: IRequest, options?: { includeFields?: string | string[], allowedIncludedFields?: string[] }): Promise<string | IClient>
    public async getActiveClient (request: IRequest, options?: IGetActiveClientOptions): Promise<string | IClient> {
        const token: string = this.jwtControlService.extractTokenFromHeader(request);

        if ( !token || token === '') return null;

        let validatedClientPayload: IClient = null;
        
        try {
            validatedClientPayload = await this.jwtControlService.tokenValidate(request, token);
        } catch { }

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        if ( validatedClientPayload ) {
            const clientInstance: Admin | Member = await commonServiceRef.getClients(validatedClientPayload.login, { rawResult: false });

            if ( !clientInstance ) throw new UnauthorizedException('GetActiveClient - client instance does not exists');
        }
            
        if ( !options ) options = {};

        if ( validatedClientPayload && options.includeFields ) {
            if ( typeof options.includeFields === 'string' ) return validatedClientPayload[options.includeFields];
            else if ( Array.isArray(options.includeFields) ) {
                if ( options.allowedIncludedFields && options.includeFields.some(field => !options.allowedIncludedFields.includes(field)) ) {
                    throw new BadRequestException('GetActiveClient - not allowed included field');
                }

                Object.keys(validatedClientPayload).forEach(field => {
                    !options.includeFields.includes(field) ? delete validatedClientPayload[field] : null;
                });
            }
        }

        return validatedClientPayload;
    }

    private async _signDataValidate (clientLogin: string, clientPassword: string): Promise<void> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const clientRaw: IAdmin | IMember = await commonServiceRef.getClients(clientLogin, {
            includeFields: [ 'password' ],
            rawResult: true
        });

        if ( !clientRaw ) throw new UnauthorizedException('_signDataValidate - client instance does not exists');

        const passwordValid: boolean = await bcrypt.compare(clientPassword, clientRaw.password); 
        
        
        // console.log(clientPassword); 
        // console.log(client.password);
        // console.log(await bcrypt.compare(clientPassword, client.password));


        if ( !passwordValid ) throw new UnauthorizedException();
    }

    public async getBcryptHashSaltrounds (): Promise<string> {
        return process.env.CLIENT_PASSWORD_BCRYPT_SALTROUNDS;
    }
}