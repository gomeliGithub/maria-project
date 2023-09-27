import { BadRequestException, Body, Controller, Post, Put, Req, Res, Redirect } from '@nestjs/common';
import { Response } from 'express';

import { SignService } from '../../services/sign/sign.service';

import { ClientTypes } from '../../decorators/client.types.decorator';

import { IClient, IRequest, IRequestBody } from 'types/global';
import { IClientAccessData } from 'types/sign';

@Controller('/sign')
export class SignController {
    constructor(
        private readonly signService: SignService
    ) { }

    @Post('/in')
    @ClientTypes('admin', 'member')
    async signIn (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response): Promise<IClientAccessData> {
        if (!requestBody.sign || !requestBody.sign.clientSignData || !requestBody.sign.clientSignData.login || !requestBody.sign.clientSignData.password ||
            typeof requestBody.sign.clientSignData.login !== 'string' || typeof requestBody.sign.clientSignData.password !== 'string'
        ) throw new BadRequestException();

        return this.signService.signIn(request, requestBody.sign.clientSignData, response);
    }

    @Put('/out')
    @ClientTypes('admin', 'member')
    @Redirect('/', 301)
    async signOut (@Req() request: IRequest): Promise<void> {
        return this.signService.signOut(request);
    }

    @Put('/getActive')
    @ClientTypes('admin', 'member')
    async getActiveClient (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string | IClient> {
        const allowedIncludedFields: string[] = [ 'login', 'locale', 'fullName' ];

        if ((!requestBody.sign || !requestBody.sign.includedFields || !Array.isArray(requestBody.sign.includedFields))
            || Array.isArray(requestBody.sign.includedFields) && !requestBody.sign.includedFields.every(includedField => allowedIncludedFields.includes(includedField))
        ) throw new BadRequestException();

        return this.signService.getActiveClient(request, { includeFields: requestBody.sign.includedFields, allowedIncludedFields });
    }
}