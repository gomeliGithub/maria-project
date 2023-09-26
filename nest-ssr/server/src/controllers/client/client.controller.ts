import { BadRequestException, Controller, Get, Param, Post, Req } from '@nestjs/common';

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

    @Get('/getCompressedImagesList/:imagesType')
    async getCompressedImagesList (@Param('imagesType') imagesType: string): Promise<string[]> {
        return this.clientService.getCompressedImagesList(imagesType.substring(1));
    }
}