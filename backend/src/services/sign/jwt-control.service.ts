import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';

import * as crypto from 'crypto';

import { JWT } from 'src/models/sign.model';

import { IClient, IRequest } from 'types/global';

@Injectable()
export class JwtControlService {
    constructor (
        private readonly jwtService: JwtService,

        @InjectModel(JWT) 
        private readonly JWT_revokedTokenModel: typeof JWT
    ) { }

    public extractTokenFromHeader (request: IRequest): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];

        if (request.url !== "/api/auth/signIn" && request.url !== "/api/auth/getActiveClient" && request.url !== "/api/auth/logout") if (!token) {
            throw new UnauthorizedException();
        }
        
        return type === 'Bearer' ? token : undefined;
    }

    public async tokenValidate (request: IRequest, token: string, throwError = true): Promise<IClient | null> {
        let validatedClient: IClient = null;

        try {
            validatedClient = await this.jwtService.verifyAsync<IClient>(token);
        } catch {
            if (throwError) throw new UnauthorizedException();
            else return null;
        }

        const client__secure_fgpHash: string = (crypto.createHmac("SHA256", request.cookies['__secure_fgp'])).digest('hex');

        if (client__secure_fgpHash !== validatedClient.__secure_fgpHash || !(await this.validateRevokedToken(token))) {
            if (throwError) throw new UnauthorizedException();
            else return null;
        }

        return validatedClient;
    }

    public async addRevokedToken (token: string): Promise<void> {
        if (!(await this.checkRevokedTokenIs(token))) {
            const tokenHash: string = (crypto.createHmac("SHA256", token)).digest('hex');

            await this.JWT_revokedTokenModel.create({
                token_hash: tokenHash,
                revokation_date: new Date()
            })
        }
    }

    public async validateRevokedToken (token: string): Promise<boolean> {
        const revokedToken = await this.checkRevokedTokenIs(token);

        if (revokedToken) {
            if (new Date() > revokedToken.revokation_date) return false;
        } else return true;
    }

    public async checkRevokedTokenIs (token: string): Promise<JWT> {
        const tokenHash: string = (crypto.createHmac("SHA256", token)).digest('hex');

        const revokedToken = await this.JWT_revokedTokenModel.findOne({ where: { token_hash: tokenHash }});

        return revokedToken;
    }
}