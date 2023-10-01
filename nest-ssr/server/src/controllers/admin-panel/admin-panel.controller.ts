import { Controller, Get, Req } from '@nestjs/common';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { ClientTypes } from '../../decorators/client.types.decorator';

import { IFullCompressedImageData, IRequest } from 'types/global';

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
}