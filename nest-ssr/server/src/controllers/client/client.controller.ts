import { BadRequestException, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';

import { Response } from 'express';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

import { IRequest } from 'types/global';

@Controller('/client')
export class ClientController {
    constructor(
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    @Post('/uploadImage/:imageName')
    async uploadImage (@Req() request: IRequest, @Param('imageName') imageName: string): Promise<void> {
        if (!imageName || imageName === '') throw new BadRequestException();

        return this.clientService.uploadImage(request, imageName);
    }

    @Get('/^\/image\/(([a-zA-Z\d]+)_thumb\.(jpg|jpeg|gif|png))$/')
    async getCompressedImage (@Param() params: string[], @Res({ passthrough: true }) response: Response): Promise<void> {
        return this.clientService.getCompressedImage(params, response);
    }
}