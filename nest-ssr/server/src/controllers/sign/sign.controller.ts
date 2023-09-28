import { BadRequestException, Body, Controller, Get, Post, Put, Req, Res, Redirect } from '@nestjs/common';
import { Response } from 'express';

import { SignService } from '../../services/sign/sign.service';

import { IClient, IRequest, IRequestBody } from 'types/global';
import { IClientAccessData } from 'types/sign';

@Controller('/sign')
export class SignController {
    constructor(
        private readonly signService: SignService
    ) { }

    @Post('/up')
    @Redirect('/in', 301)
    async signUp (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<void> {
        if ( !requestBody.sign || !requestBody.sign.clientData || !requestBody.sign.clientData.login || !requestBody.sign.clientData.password 
            || typeof requestBody.sign.clientData.login !== 'string' || typeof requestBody.sign.clientData.password !== 'string'
            || ( requestBody.sign.clientData.email && typeof requestBody.sign.clientData.email !== 'string' )
        ) throw new BadRequestException();

        return this.signService.signUp(request, requestBody.sign.clientData);
    }

    @Post('/in')
    @Redirect('/', 301)
    async signIn (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response): Promise<IClientAccessData> {
        if ( !requestBody.sign || !requestBody.sign.clientData || !requestBody.sign.clientData.login || !requestBody.sign.clientData.password ||
            typeof requestBody.sign.clientData.login !== 'string' || typeof requestBody.sign.clientData.password !== 'string'
        ) throw new BadRequestException();

        return this.signService.signIn(request, requestBody.sign.clientData, response);
    }

    @Put('/out')
    @Redirect('/', 301)
    async signOut (@Req() request: IRequest): Promise<void> {
        return this.signService.signOut(request);
    }

    @Get('/getActiveClient')
    async getActiveClient (@Req() request: IRequest): Promise<string | IClient> {
        const includedFields: string[] = [ 'login', 'locale', 'fullName' ];

        return this.signService.getActiveClient(request, { includeFields: includedFields });
    }

    @Get('/getBcryptHashSaltrounds')
    async getBcryptHashSaltrounds (): Promise<string | IClient> {
        return this.signService.getBcryptHashSaltrounds();
    }
}