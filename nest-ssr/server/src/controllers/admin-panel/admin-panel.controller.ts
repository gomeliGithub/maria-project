import { Controller, Get, Req, Post, Body, BadRequestException, Put, Query, Delete, StreamableFile, Res } from '@nestjs/common';
import { Response } from 'express';

import { $Enums, Image_display_type, Image_photography_type } from '@prisma/client';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';
import { ValidateClientRequestsService } from '../../services/validate-client-requests/validate-client-requests.service';

import { ClientTypes } from '../../decorators/client.types.decorator';
import { Cookies } from '../../decorators/cookies.decorator';

import { IClientOrdersData, IClientOrdersInfoData, IFullCompressedImageData, IRequest, IRequestBody } from 'types/global';
import { IDiscount } from 'types/models';

@Controller('/admin-panel')
export class AdminPanelController {
    constructor(
        private readonly _appService: AppService,
        private readonly _adminPanelService: AdminPanelService,
        private readonly _validateClientRequestsService: ValidateClientRequestsService
    ) { }

    @Get('/checkAccess')
    public async checkAccess (@Req() request: IRequest, @Cookies('__secure_fgp') __secure_fgp: string): Promise<boolean> {
        return this._adminPanelService.checkAccess(request, __secure_fgp);
    }

    @Get('/getImageThumbnail')
    @ClientTypes('admin')
    public async getImageThumbnail (@Req() request: IRequest, @Query('originalName') originalName: string, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<StreamableFile> {
        if ( !originalName || originalName.trim() === '' ) throw new BadRequestException(`${ request.url } "GetImageThumbnail - invalid original image name"`);

        return new StreamableFile(await this._adminPanelService.getImageThumbnail(request, originalName, response, clientLocale));
    }

    @Post('/uploadImage')
    @ClientTypes('admin')
    public async uploadImage (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<string> {
        if ( !requestBody.client || !requestBody.client._id || !requestBody.client.uploadImageMeta || !requestBody.client.imagePhotographyType
            || !requestBody.client.imageDisplayType
            || typeof requestBody.client._id !== 'number' || requestBody.client._id < 0 || requestBody.client._id > 1 
            || typeof requestBody.client.uploadImageMeta !== 'string' || typeof requestBody.client.imagePhotographyType !== 'string' 
            || !( requestBody.client.imagePhotographyType in $Enums.Image_photography_type )
            || typeof requestBody.client.imageDisplayType !== 'string' || !( requestBody.client.imageDisplayType in $Enums.Image_display_type )
            || requestBody.client.imageDescription && (typeof requestBody.client.imageDescription !== 'string' || requestBody.client.imageDescription.length > 20)
        ) throw new BadRequestException(`${ request.url } "UploadImage - invalid request body data"`);

        return this._adminPanelService.uploadImage(request, requestBody, response, clientLocale);
    }

    @Get('/getFullCompressedImagesList')
    @ClientTypes('admin')
    public async getFullCompressedImagesList (@Req() request: IRequest, @Query() options: {}): Promise<IFullCompressedImageData> {
        const imagesExistsCount: number | undefined = options['imagesExistsCount'] ? parseInt(options['imagesExistsCount'], 10) : undefined;
        const imagesLimit: number | undefined = options['imagesLimit'] ? parseInt(options['imagesLimit'], 10) : undefined;
        const dateFrom: Date | string | undefined = options['dateFrom'] ? new Date(options['dateFrom']) : undefined;
        const dateUntil: Date | string | undefined = options['dateUntil'] ? new Date(options['dateUntil']) : undefined;

        let photographyTypes: string[] | undefined = options['photographyTypes'] ? options['photographyTypes'] : undefined;
        let displayTypes: string[] | undefined = options['displayTypes'] ? options['displayTypes'] : undefined;

        if ( photographyTypes ) {
            try { 
                photographyTypes = JSON.parse(options['photographyTypes']);
            } catch {
                photographyTypes = [];
            }
        }

        if ( displayTypes ) {
            try { 
                displayTypes = JSON.parse(options['displayTypes']);
            } catch {
                displayTypes = [];
            }
        }

        if ( imagesExistsCount && Number.isNaN(imagesExistsCount)
            || imagesLimit && ( Number.isNaN(imagesLimit) || imagesLimit > 15 )
            || dateFrom && ( ( typeof dateFrom === 'string' && dateFrom === 'Invalid Date' ) )
            || dateUntil && ( ( typeof dateUntil === 'string' && dateUntil === 'Invalid Date' ) )
            || photographyTypes && ( !Array.isArray(photographyTypes) || photographyTypes.length === 0 || !( photographyTypes.every(data => data in Image_photography_type) ) )
            || displayTypes && ( !Array.isArray(displayTypes) || displayTypes.length === 0 || !( displayTypes.every(data => data in Image_display_type) ) )
        ) throw new BadRequestException(`${ request.url } "GetFullCompressedImagesList - invalid query data"`);

        return this._adminPanelService.getFullCompressedImagesList(request, { imagesLimit, imagesExistsCount, photographyTypes, displayTypes });
    }

    @Get('/getClientOrders')
    @ClientTypes('admin')
    public async getClientOrders (@Req() request: IRequest, @Query() options: {}): Promise<IClientOrdersInfoData | IClientOrdersData> {
        if ( !this._validateClientRequestsService.getClientOrdersValidator(options) ) throw new BadRequestException(`${ request.url } "GetClientOrders - invalid query data"`);

        return this._adminPanelService.getClientOrders({
            memberLogin: options['memberLogin'] ? (options['memberLogin'] as string).trim() : undefined,
            fromDate: options['fromDate'] ? new Date(options['fromDate']) : undefined,
            untilDate: options['untilDate'] ? new Date(options['untilDate']) : undefined,
            status: options['status'] ? (options['status'] as string).trim() as $Enums.Client_order_status : undefined,
            ordersLimit: options['ordersLimit'] ? parseInt(options['ordersLimit'], 10) : undefined,
            existsCount: options['existsCount'] ? parseInt(options['existsCount'], 10) : undefined
        });
    }

    @Get('/getClientOrdersInfoData')
    @ClientTypes('admin')
    public async getClientOrdersInfoData (@Req() request: IRequest, @Query() options: {}): Promise<IClientOrdersInfoData> {
        if ( !this._validateClientRequestsService.getClientOrdersValidator(options) ) throw new BadRequestException(`${ request.url } "GetClientOrdersInfoData - invalid query data"`);

        return this._adminPanelService.getClientOrdersInfoData({
            memberLogin: options['memberLogin'] ? (options['memberLogin'] as string).trim() : undefined,
            fromDate: options['fromDate'] ? new Date(options['fromDate']) : undefined,
            untilDate: options['untilDate'] ? new Date(options['untilDate']) : undefined,
            status: options['status'] ? (options['status'] as string).trim() as $Enums.Client_order_status : undefined,
            ordersLimit: options['ordersLimit'] ? parseInt(options['ordersLimit'], 10) : undefined,
            existsCount: options['existsCount'] ? parseInt(options['existsCount'], 10) : undefined
        });
    }

    @Get('/getDiscountsData')
    @ClientTypes('admin')
    public async getDiscountsData (): Promise<IDiscount[]> {
        return this._adminPanelService.getDiscountsData(false);
    }

    @Post('/createDiscount')
    @ClientTypes('admin')
    public async createDiscount (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.discountContent || !requestBody.adminPanel.fromDate || !requestBody.adminPanel.toDate
            || typeof requestBody.adminPanel.discountContent !== 'string' || requestBody.adminPanel.discountContent.length > 50
            || (new Date(requestBody.adminPanel.fromDate) as unknown as string) === 'Invalid Date' 
            || (new Date(requestBody.adminPanel.toDate) as unknown as string) === 'Invalid Date'
        ) throw new BadRequestException(`${ request.url } "CreateDiscount - invalid request body data"`);

        return this._adminPanelService.createDiscount(request, requestBody);
    }

    @Put('/changeDiscountData')
    @ClientTypes('admin')
    public async changeDiscountData (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<void> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.discountId || typeof requestBody.adminPanel.discountId !== 'number'
            || requestBody.adminPanel.newDiscountContent && 
            (typeof requestBody.adminPanel.newDiscountContent !== 'string' || requestBody.adminPanel.newDiscountContent.length > 50)
            || requestBody.adminPanel.newFromDate &&
            ((new Date(requestBody.adminPanel.newFromDate) as unknown as string) === 'Invalid Date' )
            || requestBody.adminPanel.newToDate &&
            ((new Date(requestBody.adminPanel.newToDate) as unknown as string) === 'Invalid Date')
        ) throw new BadRequestException(`${ request.url } "ChangeDiscountData - invalid request body data"`);

        return this._adminPanelService.changeDiscountData(request, requestBody);
    }

    @Delete('/deleteDiscount')
    @ClientTypes('admin')
    public async deleteDiscount (@Req() request: IRequest, @Query('discountId') discountId: string): Promise<void> {
        const discountIdNumber: number = parseInt(discountId, 10);

        if ( Number.isNaN(discountIdNumber) ) throw new BadRequestException(`${ request.url } "DeleteDiscount - invalid discount id"`);

        return this._adminPanelService.deleteDiscount(request, discountIdNumber);
    }

    @Put('/changeClientOrderStatus')
    @ClientTypes('admin')
    public async changeClientOrderStatus (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<void> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.clientOrderId
            || typeof requestBody.adminPanel.clientOrderId !== 'number' 
            || requestBody.adminPanel.clientLogin && ( typeof requestBody.adminPanel.clientLogin !== 'string' || requestBody.adminPanel.clientLogin === '' )
        ) throw new BadRequestException(`${ request.url } "ChangeClientOrderStatus - invalid request body data"`);

        return this._adminPanelService.changeClientOrderStatus(request, requestBody);
    }

    @Post('/deleteImage')
    @ClientTypes('admin')
    public async deleteImage (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<string> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName 
            || ( requestBody.adminPanel.originalImageName && typeof requestBody.adminPanel.originalImageName !== 'string' ) 
        ) throw new BadRequestException(`${ request.url } "DeleteImage - invalid request body data"`);

        return this._adminPanelService.deleteImage(request, requestBody, response, clientLocale);
    } 
    
    @Post('/changeImageDisplayTarget')
    @ClientTypes('admin')
    public async changeImageDisplayTarget (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<string> {
        const displayTargetsPage: string[] = [ 'home', 'gallery', 'original' ];

        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName || !requestBody.adminPanel.displayTargetPage || !requestBody.adminPanel.newImagePhotographyType
            || typeof requestBody.adminPanel.originalImageName !== 'string'
            || !displayTargetsPage.includes(requestBody.adminPanel.displayTargetPage)
        ) throw new BadRequestException(`${ request.url } "ChangeImageDisplayTarget - invalid request body data"`);

        return this._adminPanelService.changeImageDisplayTarget(request, requestBody, response, clientLocale);
    }

    @Put('/changeImageData')
    @ClientTypes('admin')
    public async changeImageData (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<string> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName || typeof requestBody.adminPanel.originalImageName !== 'string'
            || ( requestBody.adminPanel.newImagePhotographyType && ( 
                typeof requestBody.adminPanel.newImagePhotographyType !== 'string' 
                || !( requestBody.adminPanel.newImagePhotographyType in $Enums.Image_photography_type )
            ))
            || ( requestBody.adminPanel.newImageDescription && ( 
                typeof requestBody.adminPanel.newImageDescription !== 'string' || requestBody.adminPanel.newImageDescription.length > 20
            ))
            || ( requestBody.adminPanel.newImageDisplayType && (
                typeof requestBody.adminPanel.newImageDisplayType !== 'string' 
                || !( requestBody.adminPanel.newImageDisplayType in $Enums.Image_display_type )
            ))
        ) throw new BadRequestException(`${ request.url } "ChangeImageData - invalid request body data"`);

        return this._adminPanelService.changeImageData(request, requestBody, response, clientLocale);
    }

    @Post('/setPhotographyTypeImage')
    @ClientTypes('admin')
    public async setPhotographyTypeImage (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Res({ passthrough: true }) response: Response, @Cookies('locale') clientLocale: string): Promise<string> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName || !requestBody.adminPanel.imagePhotographyType
            || typeof requestBody.adminPanel.originalImageName !== 'string' 
            || typeof requestBody.adminPanel.imagePhotographyType !== 'string' || !( requestBody.adminPanel.imagePhotographyType in $Enums.Image_photography_type )
        ) throw new BadRequestException(`${ request.url } "SetPhotographyTypeImage - invalid request body data"`);

        return this._adminPanelService.setPhotographyTypeImage(request, requestBody, response, clientLocale);
    }

    @Post('/changePhotographyTypeDescription')
    @ClientTypes('admin')
    public async changePhotographyTypeDescription (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<void> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.photographyTypeName || !requestBody.adminPanel.photographyTypeNewDescription
            || typeof requestBody.adminPanel.photographyTypeName !== 'string' 
            || !( requestBody.adminPanel.photographyTypeName in $Enums.Image_photography_type )
            || typeof requestBody.adminPanel.photographyTypeNewDescription !== 'string' 
            || requestBody.adminPanel.photographyTypeNewDescription.length > 800
        ) throw new BadRequestException(`${ request.url } "ChangePhotographyTypeDescription - invalid request body data"`);

        this._adminPanelService.changePhotographyTypeDescription(requestBody);
    }
}