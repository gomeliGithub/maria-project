import { Controller, Get, Req, Post, Body, BadRequestException, Put, Query, Delete, StreamableFile } from '@nestjs/common';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { ClientTypes } from '../../decorators/client.types.decorator';
import { Cookies } from '../../decorators/cookies.decorator';

import { IClientOrdersData, IClientOrdersInfoData, IFullCompressedImageData, IRequest, IRequestBody } from 'types/global';
import { IDiscount } from 'types/models';

@Controller('/admin-panel')
export class AdminPanelController {
    constructor(
        private readonly appService: AppService,
        private readonly adminPanelService: AdminPanelService
    ) { }

    @Get('/checkAccess')
    public async checkAccess (@Req() request: IRequest, @Cookies('__secure_fgp') __secure_fgp: string): Promise<boolean> {
        return this.adminPanelService.checkAccess(request, __secure_fgp);
    }

    @Get('/getImageThumbnail')
    @ClientTypes('admin')
    public async getImageThumbnail (@Req() request: IRequest, @Query('originalName') originalName: string): Promise<StreamableFile> {
        if ( !originalName || originalName.trim() === '' ) throw new BadRequestException(`${ request.url } "GetImageThumbnail - invalid original image name"`);

        return new StreamableFile(await this.adminPanelService.getImageThumbnail(request, originalName));
    }

    @Post('/uploadImage')
    @ClientTypes('admin')
    public async uploadImage (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> {
        if ( !requestBody.client || !requestBody.client._id || !requestBody.client.uploadImageMeta || !requestBody.client.imagePhotographyType
            || !requestBody.client.imageViewSizeType
            || typeof requestBody.client._id !== 'number' || requestBody.client._id < 0 || requestBody.client._id > 1 
            || typeof requestBody.client.uploadImageMeta !== 'string' || typeof requestBody.client.imagePhotographyType !== 'string' 
            || !this.appService.imagePhotographyTypes.includes(requestBody.client.imagePhotographyType)
            || typeof requestBody.client.imageViewSizeType !== 'string' || !this.appService.imageViewSizeTypes.includes(requestBody.client.imageViewSizeType)
            || requestBody.client.imageDescription && (typeof requestBody.client.imageDescription !== 'string' || requestBody.client.imageDescription.length > 20)
        ) {
            throw new BadRequestException(`${ request.url } "UploadImage - invalid request body data"`);
        }

        return this.adminPanelService.uploadImage(request, requestBody);
    }

    @Get('/getFullCompressedImagesList')
    @ClientTypes('admin')
    public async getFullCompressedImagesList (@Req() request: IRequest, @Query() options: {}): Promise<IFullCompressedImageData> {
        const imagesExistsCount: number = options['imagesExistsCount'] ? parseInt(options['imagesExistsCount'], 10) : null;
        const imagesLimit: number = options['imagesLimit'] ? parseInt(options['imagesLimit'], 10) : null;

        if ( imagesExistsCount && Number.isNaN(imagesExistsCount)
            || imagesLimit && ( Number.isNaN(imagesLimit) || imagesLimit > 15 )
        ) throw new BadRequestException(`${ request.url } "GetFullCompressedImagesList - invalid query data"`);

        return this.adminPanelService.getFullCompressedImagesList(request, imagesLimit, imagesExistsCount);
    }

    @Get('/getClientOrders')
    @ClientTypes('admin')
    public async getClientOrders (@Req() request: IRequest, @Query() options: {}): Promise<IClientOrdersInfoData | IClientOrdersData> {
        const getInfoData: string = options['getInfoData'] ? options['getInfoData'] : null;
        const memberLogin: string = options['memberLogin'] ? (options['memberLogin'] as string).trim() : null;
        const fromDate: Date = options['fromDate'] ? new Date(options['fromDate']) : null;
        const untilDate: Date = options['untilDate'] ? new Date(options['untilDate']) : null;
        const status: string = options['status'] ? (options['status'] as string).trim() : null;
        const ordersLimit: number = options['ordersLimit'] ? parseInt(options['ordersLimit'], 10) : null;
        const existsCount: number = options['existsCount'] ? parseInt(options['existsCount'], 10) : null;

        if ( getInfoData && getInfoData !== 'true' && getInfoData !== 'false'
            || memberLogin && memberLogin === ''
            || fromDate && fromDate.toString() === 'Invalid Date' 
            || untilDate && untilDate.toString() === 'Invalid Date'
            || status && (status === '' || !this.appService.clientOrdersStatuses.includes(status))
            || ordersLimit && (Number.isNaN(ordersLimit) || ordersLimit > 15)
            || existsCount && Number.isNaN(existsCount)
        ) throw new BadRequestException(`${ request.url } "GetClientOrders - invalid query data"`);

        return this.adminPanelService.getClientOrders({
            getInfoData,
            memberLogin,
            fromDate,
            untilDate,
            status,
            ordersLimit,
            existsCount
        });
    }

    @Get('/getDiscountsData')
    @ClientTypes('admin')
    public async getDiscountsData (): Promise<IDiscount[]> {
        return this.adminPanelService.getDiscountsData();
    }

    @Post('/createDiscount')
    @ClientTypes('admin')
    public async createDiscount (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.discountContent || !requestBody.adminPanel.fromDate || !requestBody.adminPanel.toDate
            || typeof requestBody.adminPanel.discountContent !== 'string' || requestBody.adminPanel.discountContent.length > 50
            || (new Date(requestBody.adminPanel.fromDate) as unknown as string) === 'Invalid Date' 
            || (new Date(requestBody.adminPanel.toDate) as unknown as string) === 'Invalid Date'
        ) throw new BadRequestException(`${ request.url } "CreateDiscount - invalid request body data"`);

        return this.adminPanelService.createDiscount(request, requestBody);
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

        return this.adminPanelService.changeDiscountData(request, requestBody);
    }

    @Delete('/deleteDiscount')
    @ClientTypes('admin')
    public async deleteDiscount (@Req() request: IRequest, @Query('discountId') discountId: string): Promise<void> {
        const discountIdNumber: number = parseInt(discountId, 10);

        if ( Number.isNaN(discountIdNumber) ) throw new BadRequestException(`${ request.url } "DeleteDiscount - invalid discount id"`);

        return this.adminPanelService.deleteDiscount(request, discountIdNumber);
    }

    @Put('/changeClientOrderStatus')
    @ClientTypes('admin')
    public async changeClientOrderStatus (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<void> {
        if ( !requestBody.adminPanel.clientOrderId
            || typeof requestBody.adminPanel.clientOrderId !== 'number' 
            || requestBody.adminPanel.clientLogin && (typeof requestBody.adminPanel.clientLogin !== 'string' || requestBody.adminPanel.clientLogin === '')
        ) throw new BadRequestException(`${ request.url } "ChangeClientOrderStatus - invalid request body data"`);

        return this.adminPanelService.changeClientOrderStatus(request, requestBody);
    }

    @Post('/deleteImage')
    @ClientTypes('admin')
    public async deleteImage (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName 
            || (requestBody.adminPanel.originalImageName && typeof requestBody.adminPanel.originalImageName !== 'string') 
        ) throw new BadRequestException(`${ request.url } "DeleteImage - invalid request body data"`);

        return this.adminPanelService.deleteImage(request, requestBody);
    } 
    
    @Post('/changeImageDisplayTarget')
    @ClientTypes('admin')
    public async changeImageDisplayTarget (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> { 
        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName || !requestBody.adminPanel.displayTargetPage
            || (requestBody.adminPanel.originalImageName && typeof requestBody.adminPanel.originalImageName !== 'string') 
            || (requestBody.adminPanel.displayTargetPage && ( 
                requestBody.adminPanel.displayTargetPage !== 'home' 
                && requestBody.adminPanel.displayTargetPage !== 'gallery' && requestBody.adminPanel.displayTargetPage !== 'original' 
            ))
        ) throw new BadRequestException(`${ request.url } "ChangeImageDisplayTarget - invalid request body data"`);

        return this.adminPanelService.changeImageDisplayTarget(request, requestBody);
    }

    @Put('/changeImageData')
    @ClientTypes('admin')
    public async changeImageData (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName || typeof requestBody.adminPanel.originalImageName !== 'string'
            || ( requestBody.adminPanel.newImagePhotographyType && ( 
                typeof requestBody.adminPanel.newImagePhotographyType !== 'string' 
                || !this.appService.imagePhotographyTypes.includes(requestBody.adminPanel.newImagePhotographyType)
            ))
            || ( requestBody.adminPanel.newImageDescription && ( 
                typeof requestBody.adminPanel.newImageDescription !== 'string' || requestBody.adminPanel.newImageDescription.length > 20
            ))
            || ( requestBody.adminPanel.newImageViewSizeType && (
                typeof requestBody.adminPanel.newImageViewSizeType !== 'string' 
                || !this.appService.imageViewSizeTypes.includes(requestBody.adminPanel.newImageViewSizeType)
            ))
        ) throw new BadRequestException(`${ request.url } "ChangeImageData - invalid request body data"`);

        return this.adminPanelService.changeImageData(request, requestBody);
    }

    @Post('/setPhotographyTypeImage')
    @ClientTypes('admin')
    public async setPhotographyTypeImage (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName || !requestBody.adminPanel.imagePhotographyType
            || typeof requestBody.adminPanel.originalImageName !== 'string' 
            || typeof requestBody.adminPanel.imagePhotographyType !== 'string' || !this.appService.imagePhotographyTypes.includes(requestBody.adminPanel.imagePhotographyType)
        ) throw new BadRequestException(`${ request.url } "SetPhotographyTypeImage - invalid request body data"`);

        return this.adminPanelService.setPhotographyTypeImage(request, requestBody);
    }

    @Post('/changePhotographyTypeDescription')
    @ClientTypes('admin')
    public async changePhotographyTypeDescription (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<void> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.photographyTypeName || !requestBody.adminPanel.photographyTypeNewDescription
            || typeof requestBody.adminPanel.photographyTypeName !== 'string' 
            || !this.appService.imagePhotographyTypes.includes(requestBody.adminPanel.photographyTypeName)
            || typeof requestBody.adminPanel.photographyTypeNewDescription !== 'string' 
            || requestBody.adminPanel.photographyTypeNewDescription.length > 800
        ) throw new BadRequestException(`${ request.url } "ChangePhotographyTypeDescription - invalid request body data"`);

        this.adminPanelService.changePhotographyTypeDescription(requestBody);
    }
}