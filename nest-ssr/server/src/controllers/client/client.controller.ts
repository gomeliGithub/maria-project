import { BadRequestException, Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Response } from 'express';

import { ClientTypes } from 'server/src/decorators/client.types.decorator';

import { CommonModule } from 'server/src/modules/common.module';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';
import { CommonService } from 'server/src/services/common/common.service';

import { IGalleryCompressedImagesList, IRequest, IRequestBody } from 'types/global';
import { IClientCompressedImage, IImagePhotographyType } from 'types/models';

@Controller('/client')
export class ClientController {
    constructor(
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    @Get('/getCompressedImagesList/:imagesType')
    public async getCompressedImagesList (@Param('imagesType') imagesType: string): Promise<IGalleryCompressedImagesList | IClientCompressedImage[]> {
        const thumbnailImagesDirPaths: string[] = [ 'home' ].concat(this.appService.imagePhotographyTypes);

        if ( !thumbnailImagesDirPaths.includes(imagesType.substring(1)) ) throw new BadRequestException();

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        await commonServiceRef.createImageDirs();
        
        return this.clientService.getCompressedImagesList(imagesType.substring(1) as 'home' | string);
    }

    @Get('/getImagePhotographyTypesData/:targetPage')
    public async getImagePhotographyTypesData (@Param('targetPage') targetPage: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[]> {
        targetPage = targetPage.substring(1);
        
        if ( !targetPage || ( targetPage !== 'home' && targetPage !== 'admin' ) ) throw new BadRequestException();

        const requiredFields: string[] = targetPage === 'home' ? [ 'name', 'originalImageName' ] : [ 'name', 'description', 'originalImageName' ];

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        return commonServiceRef.getImagePhotographyTypesData(requiredFields, targetPage);
    }

    @Post('/changeLocale')
    @ClientTypes('admin', 'member')
    public async changeLocale (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response): Promise<string> {
        if ( !requestBody.sign.newLocale || typeof requestBody.sign.newLocale !== 'string' ) throw new BadRequestException();

        const locales: string[] = [ 'ru', 'en' ];

        if ( !locales.includes(requestBody.sign.newLocale) ) throw new BadRequestException();
        
        return this.clientService.changeLocale(request, requestBody.sign.newLocale, response);
    } 
}