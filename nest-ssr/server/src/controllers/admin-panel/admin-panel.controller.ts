import { Controller, Get, Req, Post, Body, BadRequestException, Put } from '@nestjs/common';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { ClientTypes } from '../../decorators/client.types.decorator';

import { IFullCompressedImageData, IRequest, IRequestBody } from 'types/global';

@Controller('/admin-panel')
export class AdminPanelController {
    constructor(
        private readonly appService: AppService,
        private readonly adminPanelService: AdminPanelService
    ) { }

    @Get('/checkAccess')
    @ClientTypes('admin')
    async checkAccess (): Promise<boolean> {
        return true;
    }

    @Post('/uploadImage')
    @ClientTypes('admin')
    async uploadImage (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> {
        const imageEventTypes: string[] = [ 'wedding', 'holiday', 'birthday' ];
        const imageViewSizeTypes: string[] = [ 'small', 'medium', 'big' ];

        if ( !requestBody.client || !requestBody.client._id || !requestBody.client.uploadImageMeta || !requestBody.client.imageEventType || !requestBody.client.imageViewSizeType
            || typeof requestBody.client._id !== 'number' || requestBody.client._id < 0 || requestBody.client._id > 1 
            || typeof requestBody.client.uploadImageMeta !== 'string' || typeof requestBody.client.imageEventType !== 'string' || !imageEventTypes.includes(requestBody.client.imageEventType)
            || typeof requestBody.client.imageViewSizeType !== 'string' || !imageViewSizeTypes.includes(requestBody.client.imageViewSizeType)
            || requestBody.client.imageDescription && (typeof requestBody.client.imageDescription !== 'string' || requestBody.client.imageDescription.length > 20)
        ) {
            await this.appService.logLineAsync(`[${ process.env.SERVER_API_PORT }] UploadImage - not valid client data`);
    
            throw new BadRequestException();
        }

        return this.adminPanelService.uploadImage(request, requestBody);
    }

    @Get('/getFullCompressedImagesList')
    @ClientTypes('admin')
    async getFullCompressedImagesList (@Req() request: IRequest): Promise<IFullCompressedImageData> {
        return this.adminPanelService.getFullCompressedImagesList(request);
    }

    @Post('/deleteImage')
    @ClientTypes('admin')
    async deleteImage (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> {
        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName 
            || (requestBody.adminPanel.originalImageName && typeof requestBody.adminPanel.originalImageName !== 'string') 
        ) throw new BadRequestException();

        return this.adminPanelService.deleteImage(request, requestBody);
    } 
    
    @Post('/changeImageDisplayTarget')
    @ClientTypes('admin')
    async changeImageDisplayTarget (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> { 
        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName || !requestBody.adminPanel.displayTargetPage
            || (requestBody.adminPanel.originalImageName && typeof requestBody.adminPanel.originalImageName !== 'string') 
            || (requestBody.adminPanel.displayTargetPage && ( 
                requestBody.adminPanel.displayTargetPage !== 'home' 
                && requestBody.adminPanel.displayTargetPage !== 'gallery' && requestBody.adminPanel.displayTargetPage !== 'original' 
            ))
        ) throw new BadRequestException();

        return this.adminPanelService.changeImageDisplayTarget(request, requestBody);
    }

    @Put('/changeImageData')
    @ClientTypes('admin')
    async changeImageData (@Req() request: IRequest, @Body() requestBody: IRequestBody): Promise<string> {
        const imageEventTypes: string[] = [ 'wedding', 'holiday', 'birthday' ];

        if ( !requestBody.adminPanel || !requestBody.adminPanel.originalImageName || typeof requestBody.adminPanel.originalImageName !== 'string'
            || ( requestBody.adminPanel.newImageEventType && ( 
                typeof requestBody.adminPanel.newImageEventType !== 'string' || !imageEventTypes.includes(requestBody.adminPanel.newImageEventType)
            ))
            || ( requestBody.adminPanel.newImageDescription && ( 
                typeof requestBody.adminPanel.newImageDescription !== 'string' || requestBody.adminPanel.newImageDescription.length > 20
            ))
        ) throw new BadRequestException();

        return this.adminPanelService.changeImageData(request, requestBody);
    }
}