import { BadRequestException, Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Response } from 'express';

import { ClientTypes } from 'server/src/decorators/client.types.decorator';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

import { ISizedHomeImages, IRequest, IRequestBody } from 'types/global';

@Controller('/client')
export class ClientController {
    constructor(
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    @Get('/getCompressedImagesList/:imagesType')
    async getCompressedImagesList (@Param('imagesType') imagesType: string): Promise<string[] | ISizedHomeImages> {
        const thumbnailImagesDirPaths: string[] = [ 'home', 'gallery' ];

        if ( !thumbnailImagesDirPaths.includes(imagesType.substring(1)) ) throw new BadRequestException();
        
        return this.clientService.getCompressedImagesList(imagesType.substring(1) as 'home' | 'gallery');
    }

    @Post('/changeLocale')
    @ClientTypes('admin', 'member')
    async changeLocale (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response): Promise<string> {
        if ( !requestBody.sign.newLocale || typeof requestBody.sign.newLocale !== 'string' ) throw new BadRequestException();

        const locales: string[] = [ 'ru', 'en' ];

        if ( !locales.includes(requestBody.sign.newLocale) ) throw new BadRequestException();
        
        return this.clientService.changeLocale(request, requestBody.sign.newLocale, response);
    } 
}