import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SignService } from '../../services/sign/sign.service';

import { IRequest, IRequestBody } from 'types/global';

@Injectable()
export class SignGuard implements CanActivate {
    constructor(
        private readonly _signService: SignService, 
        private readonly _reflector: Reflector
    ) { }

    async canActivate (context: ExecutionContext): Promise<boolean> {
        const clientTypes: string[] = this._reflector.getAllAndOverride<string[]>('client-types', [
            context.getHandler(),
            context.getClass()
        ]);

        const request: IRequest = context.switchToHttp().getRequest<IRequest>();
        const requestBody: IRequestBody = request.body; 

        if ( !requestBody ) throw new BadRequestException(`${ request.url } "SignGuard - requestBody does not exists"`);

        if ( !clientTypes ) return true;
        if ( request.url !== '/api/sign/in' && !request.cookies['__secure_fgp'] ) throw new UnauthorizedException(`${ request.url } "SignGuard - cookie __secure_fgp does not exists"`);

        return this._signService.validateClient(request, clientTypes);
    }
}