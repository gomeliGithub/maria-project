import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';

import { CommonModule } from 'server/src/modules/common.module';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';
import { CommonService } from 'server/src/services/common/common.service';

import { IGalleryCompressedImagesData, IRequest, IRequestBody } from 'types/global';
import { IClientCompressedImage, IDiscount, IImagePhotographyType } from 'types/models';

@Controller('/client')
export class ClientController {
    constructor(
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) { }

    @Get('/checkCompressedBigImagesIsExists/:photographyType')
    public async checkCompressedBigImagesIsExists (@Param('photographyType') photographyType: string): Promise<boolean> {
        photographyType = photographyType.substring(1);

        if ( !this.appService.imagePhotographyTypes.includes(photographyType) ) throw new BadRequestException('CheckCompressedBigImagesIsExists - invalid photography type');

        return this.clientService.checkCompressedBigImagesIsExists(photographyType);
    }

    @Get('/getCompressedImagesData/:imagesType')
    public async getCompressedImagesData (@Param('imagesType') imagesType: string,
        @Query('imageViewSize') imageViewSize: string, @Query('imagesExistsCount') imagesExistsCount: string
    ): Promise<IGalleryCompressedImagesData | IClientCompressedImage[]> {
        const thumbnailImageTypes: string[] = [ 'home' ].concat(this.appService.imagePhotographyTypes);

        imagesType = imagesType.substring(1);

        const imagesExistsCountInt: number = parseInt(imagesExistsCount, 10);

        imageViewSize = imageViewSize === 'undefined' || imageViewSize === 'null' ? null : imageViewSize;
        imagesExistsCount = imagesExistsCount === 'undefined' || imagesExistsCount === 'null' ? null : imagesExistsCount;

        if ( !thumbnailImageTypes.includes(imagesType) 
            || imageViewSize && !this.appService.imageViewSizeTypes.includes(imageViewSize) 
            || imagesExistsCount && Number.isNaN(imagesExistsCountInt) 
        ) throw new BadRequestException('GetCompressedImagesData - invalid param data');

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        await commonServiceRef.createImageDirs();
        
        return this.clientService.getCompressedImagesData(imagesType as 'home' | string, imageViewSize as 'medium' | 'big', imagesExistsCountInt);
    }

    @Get('/getDiscountsData')
    public async getDiscountsData (): Promise<IDiscount[]> {
        return this.clientService.getDiscountsData();
    }

    @Get('/downloadOriginalImage/:compressedImageName')
    public async downloadOriginalImage (@Param('compressedImageName') compressedImageName: string, @Res() response: Response): Promise<void> {
        compressedImageName = compressedImageName.substring(1);

        return this.clientService.downloadOriginalImage(response, { compressedImageName });
    }

    @Get('/getImagePhotographyTypesData/:targetPage')
    public async getImagePhotographyTypesData (@Param('targetPage') targetPage: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[]> {
        targetPage = targetPage.substring(1);
        
        if ( !targetPage || ( targetPage !== 'home' && targetPage !== 'admin' ) ) throw new BadRequestException('GetImagePhotographyTypesData - invalid target page');

        const requiredFields: string[] = targetPage === 'home' ? [ 'name', 'compressedImageName' ] : [ 'name', 'description', 'compressedImageName' ];

        return this.clientService.getImagePhotographyTypesData(requiredFields, targetPage);
    }

    @Post('/changeLocale')
    public async changeLocale (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response): Promise<string> {
        if ( !requestBody.sign.newLocale || typeof requestBody.sign.newLocale !== 'string' ) throw new BadRequestException('ChangeLocale - invalid new locale');

        const locales: string[] = [ 'ru', 'en' ];

        if ( !locales.includes(requestBody.sign.newLocale) ) throw new BadRequestException('ChangeLocale - invalid new locale');
        
        return this.clientService.changeLocale(request, requestBody.sign.newLocale, response);
    }

    @Post('/createOrder')
    public async createOrder (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<void> {
        const phoneNumberPattern: RegExp = /(?:\+|\d)[\d\-\(\) ]{9,}\d/g;

        if ( !requestBody.client || !requestBody.client.imagePhotographyType || !this.appService.imagePhotographyTypes.includes(requestBody.client.imagePhotographyType)
            || !requestBody.client.orderType || !requestBody.client.clientPhoneNumber
            || typeof requestBody.client.orderType !== 'string' || requestBody.client.orderType === '' 
            || !this.appService.clientOrderTypes.includes(requestBody.client.orderType)
            || !phoneNumberPattern.test(requestBody.client.clientPhoneNumber)
            || requestBody.client.comment && (typeof requestBody.client.comment !== 'string' 
                || requestBody.client.comment === '' || requestBody.client.comment.length > 30
            )
        ) throw new BadRequestException('CreateOrder - invalid request body data');

        return this.clientService.createOrder(request, requestBody);
    }
}