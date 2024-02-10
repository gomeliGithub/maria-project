import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';

import * as crypto from 'crypto';
import ms from 'ms';

import { JWT_token } from '../../models/sign.model';

import { IClient, IRequest } from 'types/global';

@Injectable()
export class JwtControlService {
    constructor (
        private readonly jwtService: JwtService,

        @InjectModel(JWT_token) 
        private readonly JWT_tokenModel: typeof JWT_token
    ) { }

    public extractTokenFromHeader (request: IRequest, throwError = true): string | undefined {
        const [ type, token ] = request.headers.authorization?.split(' ') ?? [];

        if ( request.url !== "/api/sign/up" && request.url !== "/api/sign/in" && request.url !== "/api/sign/getActiveClient" && request.url !== "/api/sign/out" && !token ) {
            if ( throwError ) throw new UnauthorizedException(`${ request.url } "ExtractTokenFromHeader - access token does not exists"`);
            else return undefined;
        }
        
        return type === 'Bearer' ? token : undefined;
    }

    public async tokenValidate (request: IRequest, token: string, throwError = true): Promise<IClient> {
        let validatedClientPayload: IClient = null;

        try {
            validatedClientPayload = await this.jwtService.verifyAsync<IClient>(token);
        } catch {
            if ( throwError ) throw new UnauthorizedException(`${ request.url } "TokenValidate - access token is invalid, token - ${ token }"`);
            else return null;
        }

        const client__secure_fgpHash: string = crypto.createHmac("SHA256", request.cookies['__secure_fgp']).digest('hex');

        if ( client__secure_fgpHash !== validatedClientPayload.__secure_fgpHash || !( await this.validateRevokedToken(token) ) ) {
            if ( throwError ) throw new UnauthorizedException(`${ request.url } "TokenValidate - secure fingerprint hash is invalid, token - ${ token }"`);
            else return null;
        }

        return validatedClientPayload;
    }

    public async addRevokedToken (token: string): Promise<void> {
        const revokedTokenInstance: JWT_token = await this.checkRevokedTokenIs(token); 

        if ( !revokedTokenInstance ) {
            const token_hash: string = crypto.createHmac("SHA256", token).digest('hex');

            await this.JWT_tokenModel.update({ revokation_date: new Date(), revoked: true }, { where: { token_hash } });
        }
    }

    public async saveToken (token: string): Promise<void> {
        const token_hash: string = crypto.createHmac("SHA256", token).digest('hex');

        const expires_date: Date = new Date(Date.now() + ms(process.env.JWT_EXPIRESIN_TIME));

        await this.JWT_tokenModel.create({
            token_hash,
            expires_date,
            revokation_date: expires_date
        });
    }

    public async validateRevokedToken (token: string): Promise<boolean> {
        const revokedTokenInstance: JWT_token = await this.checkRevokedTokenIs(token);

        if ( revokedTokenInstance ) {
            if ( new Date() > revokedTokenInstance.revokation_date ) return false;
        } else return true;
    }

    public async checkRevokedTokenIs (token: string): Promise<JWT_token> {
        const token_hash: string = crypto.createHmac("SHA256", token).digest('hex');

        const revokedTokenInstance: JWT_token = await this.JWT_tokenModel.findOne({ where: { token_hash, revoked: true }});

        return revokedTokenInstance;
    }
}