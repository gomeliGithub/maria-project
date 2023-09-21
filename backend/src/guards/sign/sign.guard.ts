import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SignService } from '../../services/sign/sign.service';

import { IRequest, IRequestBody } from 'types/global';

@Injectable()
export class SignGuard implements CanActivate {
    constructor(private signService: SignService, private reflector: Reflector) { }

    async canActivate (context: ExecutionContext): Promise<boolean> {
        const clientTypes: string[] = this.reflector.getAllAndOverride<string[]>('client-types', [
            context.getHandler(),
            context.getClass()
        ]);

        const request: IRequest = context.switchToHttp().getRequest<IRequest>();
        const requestBody: IRequestBody = request.body; 

        if (!requestBody) throw new BadRequestException();

        if (request.url === "/api/sign/getActive" || request.url === "/api/sign/out" || request.url.includes('main')) return true;
        else {
            if (request.url !== "/api/sign/in") {
                if (!request.cookies['__secure_fgp']) throw new UnauthorizedException();
            
                if (!clientTypes) {
                    return true;
                }
            }

            return this.signService.validateClient(request, clientTypes);
        }
    }
}