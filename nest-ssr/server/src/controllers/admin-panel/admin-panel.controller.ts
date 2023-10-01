import { Controller, Get, Req, Post, Body, BadRequestException } from '@nestjs/common';

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
}