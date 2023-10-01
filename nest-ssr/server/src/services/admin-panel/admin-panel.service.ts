import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { Admin, СompressedImage } from '../../models/client.model';

import { IFullCompressedImageData, IRequest } from 'types/global';

@Injectable()
export class AdminPanelService {
    constructor (
        private readonly appService: AppService,

        @InjectModel(СompressedImage)
        private readonly compressedImageModel: typeof СompressedImage
    ) { }

    public async getFullCompressedImagesList (request: IRequest): Promise<IFullCompressedImageData> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const activeAdminLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });

        const client: Admin = await commonServiceRef.getClients(request, activeAdminLogin, { rawResult: false });

        const { rows, count } = await commonServiceRef.getCompressedImages(client, 'admin', { 
            includeFields: [ 'originalName', 'originalSize', 'uploadDate', 'displayedOnHomePage', 'displayedOnGalleryPage' ],
            includeCount: true
        });

        const imagesList: IFullCompressedImageData = { imagesList: rows, count };

        return imagesList;
    }
}