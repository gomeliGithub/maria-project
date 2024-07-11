import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res, StreamableFile } from '@nestjs/common';

import { ReadStream, createReadStream } from 'fs';
import { Response } from 'express';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';
import { CommonService } from '../../services/common/common.service';

import { ClientTypes } from '../../decorators/client.types.decorator';
import { Cookies } from '../../decorators/cookies.decorator';

import { IDownloadingOriginalImageData, IGalleryCompressedImagesData, IRequest, IRequestBody } from 'types/global';
import { ICompressedImageWithoutRelationFields, IDiscount, IImagePhotographyType } from 'types/models';
import { $Enums } from '@prisma/client';

@Controller('/client')
export class ClientController {
    constructor(
        private readonly _appService: AppService,
        private readonly _clientService: ClientService
    ) { }

    @Get('/getCompressedImagesData/:imagesType')
    public async getCompressedImagesData (@Req() request: IRequest, @Param('imagesType') imagesType: string,
        @Query('imageDisplayType') imageDisplayType: string | null, @Query('imagesExistsCount') imagesExistsCount: string | null
    ): Promise<IGalleryCompressedImagesData | ICompressedImageWithoutRelationFields[]> {
        const thumbnailImageTypes: string[] = [ 'home' ]; 
        
        for ( const data in $Enums.Image_photography_type ) thumbnailImageTypes.push(data);

        imagesType = imagesType.substring(1);

        const imagesExistsCountInt: number = parseInt(imagesExistsCount as string, 10);

        imageDisplayType = imageDisplayType === 'undefined' ? null : imageDisplayType;
        imagesExistsCount = imagesExistsCount === 'undefined' ? null : imagesExistsCount;

        if ( !thumbnailImageTypes.includes(imagesType) 
            || imageDisplayType && !( imageDisplayType in $Enums.Image_display_type )
            || imagesExistsCount && Number.isNaN(imagesExistsCountInt) 
        ) throw new BadRequestException(`${ request.url } "GetCompressedImagesData - invalid param data"`);

        const commonServiceRef = await this._appService.getServiceRef(CommonModule, CommonService);

        await commonServiceRef.createImageDirs();
        
        return this._clientService.getCompressedImagesData(imagesType as 'home' | string, imageDisplayType as $Enums.Image_display_type, imagesExistsCountInt);
    }

    @Get('/getDiscountsData')
    public async getDiscountsData (): Promise<IDiscount[]> {
        return this._clientService.getDiscountsData();
    }

    @Get('/downloadOriginalImage/:compressedImageName')
    @ClientTypes('admin')
    public async downloadOriginalImage (@Req() request: IRequest, @Param('compressedImageName') compressedImageName: string, @Res({ passthrough: true }) response: Response): Promise<StreamableFile> {
        compressedImageName = compressedImageName.substring(1);

        const downloadingOriginalImageData: IDownloadingOriginalImageData = await this._clientService.downloadOriginalImage(request, { compressedImageName });

        const imageReadStream: ReadStream = createReadStream(downloadingOriginalImageData.path);

        response.set({
            'Content-Type': `image/${ downloadingOriginalImageData.extension === 'jpg' ? 'jpeg' : downloadingOriginalImageData.extension }`,
            'Content-Disposition': `attachment; filename=${ encodeURIComponent(downloadingOriginalImageData.name) }`,
        });

        return new StreamableFile(imageReadStream);
    }

    @Get('/getImagePhotographyTypesData/:targetPage')
    public async getImagePhotographyTypesData (@Req() request: IRequest, @Param('targetPage') targetPage: string): Promise<IImagePhotographyType[][] | IImagePhotographyType[]> {
        targetPage = targetPage.substring(1);
        
        if ( !targetPage || ( targetPage !== 'home' && targetPage !== 'admin' ) ) throw new BadRequestException(`${ request.url } "GetImagePhotographyTypesData - invalid target page"`);

        return this._clientService.getImagePhotographyTypesData(targetPage, targetPage === 'home' ? false : true);
    }

    @Post('/changeLocale')
    public async changeLocale (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response): Promise<string | null> {
        if ( !requestBody.sign || !requestBody.sign.newLocale || typeof requestBody.sign.newLocale !== 'string' ) throw new BadRequestException('ChangeLocale - invalid new locale');

        const locales: string[] = [ 'ru', 'en' ];

        if ( !locales.includes(requestBody.sign.newLocale) ) throw new BadRequestException(`${ request.url } "ChangeLocale - invalid new locale"`);
        
        return this._clientService.changeLocale(request, requestBody.sign.newLocale, response);
    }

    @Post('/createOrder')
    public async createOrder (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<void> {
        const phoneNumberPattern: RegExp = /(?:\+|\d)[\d\-\(\) ]{9,}\d/g;

        if ( !requestBody.client || !requestBody.client.imagePhotographyType || !( requestBody.client.imagePhotographyType in $Enums.Image_photography_type )
            || !requestBody.client.orderType || !requestBody.client.clientPhoneNumber
            || typeof requestBody.client.orderType !== 'string' || !( requestBody.client.orderType in $Enums.Client_order_type )
            || !phoneNumberPattern.test(requestBody.client.clientPhoneNumber)
            || requestBody.client.comment && (typeof requestBody.client.comment !== 'string' 
                || requestBody.client.comment === '' || requestBody.client.comment.length > 30
            )
        ) throw new BadRequestException(`${ request.url } "CreateOrder - invalid request body data"`);

        return this._clientService.createOrder(request, requestBody, response, clientLocale);
    }
}