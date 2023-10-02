import { BadRequestException, Controller, Get, Param } from '@nestjs/common';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

@Controller('/client')
export class ClientController {
    constructor(
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    @Get('/getCompressedImagesList/:imagesType')
    async getCompressedImagesList (@Param('imagesType') imagesType: string): Promise<string[] | string[][]> {
        const thumbnailImagesDirPaths: string[] = [ 'home', 'gallery' ];

        if ( !thumbnailImagesDirPaths.includes(imagesType.substring(1)) ) throw new BadRequestException();
        
        return this.clientService.getCompressedImagesList(imagesType.substring(1) as 'home' | 'gallery');
    }
}