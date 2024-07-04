import { BadRequestException, Body, Controller, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Response } from 'express';

import { ClientTypes } from '../../decorators/client.types.decorator';

import { SignService } from '../../services/sign/sign.service';

import { Cookies } from '../../decorators/cookies.decorator';

import { IRequest, IRequestBody } from 'types/global';
import { IJWTPayload } from 'types/sign';

@Controller('/sign')
export class SignController {
    constructor(
        private readonly _signService: SignService
    ) { }

    @Post('/up')
    async signUp (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<void> {
        const loginPattern: RegExp = /^[a-zA-Z](.[a-zA-Z0-9_-]*){4,}$/;
        const passwordPattern: RegExp = /(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{6,}/g;
        const emailPattern: RegExp = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/; // /^[^\s()<>@,;:\/]+@\w[\w\.-]+\.[a-z]{2,}$/i

        if ( !requestBody.sign || !requestBody.sign.clientData 
            || !requestBody.sign.clientData.login && ( requestBody.sign.clientData.login && ( typeof requestBody.sign.clientData.login !== 'string' || !loginPattern.test(requestBody.sign.clientData.login) ) )
            || !requestBody.sign.clientData.password || typeof requestBody.sign.clientData.password !== 'string' || !passwordPattern.test(requestBody.sign.clientData.password)
            || ( requestBody.sign.clientData.email && ( typeof requestBody.sign.clientData.email !== 'string' || !emailPattern.test(requestBody.sign.clientData.email) ) )
        ) throw new BadRequestException(`${ request.url } "Sign - invalid sign client data"`);

        return this._signService.signUp(request, requestBody.sign.clientData);
    }

    @Put('/in')
    @ClientTypes('admin', 'member')
    async signIn (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<string> {
        if ( !requestBody.sign || !requestBody.sign.clientData 
            || !requestBody.sign.clientData.login || typeof requestBody.sign.clientData.login !== 'string' 
            || !requestBody.sign.clientData.password || typeof requestBody.sign.clientData.password !== 'string'
        ) throw new BadRequestException(`${ request.url } "Sign - invalid sign client data"`);

        return this._signService.signIn(request, response, clientLocale);
    }

    @Put('/out')
    async signOut (@Req() request: IRequest): Promise<void> {
        return this._signService.signOut(request);
    }

    @Get('/getActiveClient')
    async getActiveClient (@Req() request: IRequest, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<IJWTPayload> {
        return this._signService.getActiveClient(request, response, clientLocale);
    }
}