import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

import { ClientTypes } from '../../decorators/client.types.decorator';

import { IRequest, IRequestBody } from 'types/global';

@Controller('/client')
export class ClientController {
    constructor(
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    @Post('/uploadImage')
    @ClientTypes('admin', 'member')
    async uploadImage (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> {
        if ( !requestBody.client || !requestBody.client._id 
            || typeof requestBody.client._id !== 'number' || requestBody.client._id < 0 || requestBody.client._id > 1 
        ) {
            await this.appService.logLineAsync(`[${ process.env.SERVER_PORT }] UploadImage - not valid client data`);
    
            throw new BadRequestException();
        }

        return this.clientService.uploadImage(request, requestBody);
    }

    @Get('/getCompressedImagesList/:imagesType')
    async getCompressedImagesList (@Param('imagesType') imagesType: string): Promise<string[]> {
        return this.clientService.getCompressedImagesList(imagesType.substring(1));
    }
}