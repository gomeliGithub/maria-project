import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as crypto from 'crypto';
import ms from 'ms';

import { PrismaService } from '../../../prisma/prisma.service';

import { IRequest } from 'types/global';
import { IJWTPayload } from 'types/sign';
import { IJWT } from 'types/models';

@Injectable()
export class JwtControlService {
    constructor (
        private readonly _prisma: PrismaService,
        private readonly _jwtService: JwtService,
        private readonly _configService: ConfigService
    ) { }

    public extractTokenFromHeader (request: IRequest, throwError = true): string | undefined {
        const [ type, token ] = request.headers.authorization?.split(' ') ?? [];

        if ( !( request.url in [ '/api/sign/up', '/api/sign/in', '/api/sign/getActiveClient', '/api/sign/out' ] ) && !token ) {
            if ( throwError && ( request.hasOwnProperty('validatedRequest') && request.validatedRequest === false ) ) throw new UnauthorizedException(`${ request.url } "ExtractTokenFromHeader - access token does not exists"`);
            else return undefined;
        }
        
        return type === 'Bearer' ? token : undefined;
    }

    public async tokenValidate (request: IRequest, token: string, throwError = true): Promise<IJWTPayload | null> {
        let validatedClientPayload: IJWTPayload | null = null;

        try {
            validatedClientPayload = await this._jwtService.verifyAsync<IJWTPayload>(token, { 
                secret: this._configService.get<string>('JWT_SECRETCODE') as string 
            });
        } catch {
            if ( throwError ) throw new UnauthorizedException(`${ request.url } "TokenValidate - access token is invalid, token - ${ token }"`);
            else return null;
        }

        const client__secure_fgpHash: string = crypto.createHmac("SHA256", request.cookies['__secure_fgp']).digest('hex');

        if ( client__secure_fgpHash !== validatedClientPayload.__secure_fgpHash || !( await this._validateRevokedToken(token) ) ) {
            if ( throwError ) throw new UnauthorizedException(`${ request.url } "TokenValidate - secure fingerprint hash is invalid, token - ${ token }"`);
            else return null;
        }

        return validatedClientPayload;
    }

    public async addRevokedToken (token: string): Promise<void> {
        const revokedTokenData: IJWT | null = await this.checkRevokedTokenIs(token);

        if ( revokedTokenData === null ) {
            const token_hash: string = crypto.createHmac("SHA256", token).digest('hex');

            await this._prisma.jWT.update({ where: { token_hash }, 
                data: { 
                    revokation_date: new Date(Date.now()), 
                    revoked: true 
                } 
            });
        }
    }

    public async saveToken (token: string): Promise<void> {
        const token_hash: string = crypto.createHmac("SHA256", token).digest('hex');

        const expires_date: Date = new Date(Date.now() + ms(process.env.JWT_EXPIRESIN_TIME as string));

        await this._prisma.jWT.create({ 
            data: { 
                token_hash,
                expires_date,
                revokation_date: expires_date
            }
        });
    }

    private async _validateRevokedToken (token: string): Promise<boolean> {
        const revokedTokenData: IJWT | null = await this.checkRevokedTokenIs(token);

        if ( revokedTokenData ) {
            if ( new Date(Date.now()) > revokedTokenData.revokation_date ) return false;
        }

        return true;
    }

    public async checkRevokedTokenIs (token: string): Promise<IJWT | null> {
        const token_hash: string = crypto.createHmac("SHA256", token).digest('hex');

        const revokedTokenData: IJWT | null = await this._prisma.jWT.findFirst({ where: { token_hash, revoked: true } });

        return revokedTokenData;
    }

    public async checkTokenIsExists (token: string): Promise<boolean> {
        const token_hash: string = crypto.createHmac("SHA256", token).digest('hex');

        const jwtData: IJWT | null = await this._prisma.jWT.findUnique({ where: { token_hash } });

        if ( jwtData !== null ) return true;
        else return false;
    }
}