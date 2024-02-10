import { BadRequestException, Body, Controller, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Response } from 'express';

import { ClientTypes } from '../../decorators/client.types.decorator';

import { SignService } from '../../services/sign/sign.service';

import { Cookies } from '../../decorators/cookies.decorator';

import { IClient, IRequest, IRequestBody } from 'types/global';

@Controller('/sign')
export class SignController {
    constructor(
        private readonly signService: SignService
    ) { }

    @Post('/up')
    async signUp (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<void> {
        if ( !requestBody.sign || !requestBody.sign.clientData || !requestBody.sign.clientData.login || !requestBody.sign.clientData.password 
            || typeof requestBody.sign.clientData.login !== 'string' || typeof requestBody.sign.clientData.password !== 'string'
            || ( requestBody.sign.clientData.email && typeof requestBody.sign.clientData.email !== 'string' )
        ) throw new BadRequestException(`${ request.url } "SignUp - invalid request body data"`);

        return this.signService.signUp(request, requestBody.sign.clientData);
    }

    @Put('/in')
    @ClientTypes('admin', 'member')
    async signIn (@Req() request: IRequest, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<string> {
        return this.signService.signIn(request, response, clientLocale);
    }

    @Put('/out')
    async signOut (@Req() request: IRequest): Promise<void> {
        return this.signService.signOut(request);
    }

    @Get('/getActiveClient')
    async getActiveClient (@Req() request: IRequest, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<string | IClient> {
        const includedFields: string[] = [ 'login', 'locale', 'fullName', 'type' ];

        return this.signService.getActiveClient(request, { includeFields: includedFields, response, clientLocale });
    }

    @Get('/getBcryptHashSaltrounds')
    async getBcryptHashSaltrounds (): Promise<string | IClient> {
        return this.signService.getBcryptHashSaltrounds();
    }
}