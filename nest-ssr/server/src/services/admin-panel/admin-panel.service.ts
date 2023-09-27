import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { Admin, СompressedImage } from '../../models/client.model';

import { IFullCompressedImageData, IRequest } from 'types/global';

@Injectable()
export class AdminPanelService {
    constructor (
        private readonly appService: AppService,
        private readonly commonService: CommonService,

        @InjectModel(СompressedImage)
        private readonly compressedImageModel: typeof СompressedImage
    ) { }

    public async getFullCompressedImagesList (request: IRequest): Promise<IFullCompressedImageData> {
        const activeAdminLogin: string = await this.commonService.getActiveClient(request, { includeFields: 'login' });

        const client: Admin = await this.commonService.getClients(request, activeAdminLogin, { rawResult: false });

        const { rows, count } = await this.commonService.getCompressedImages(client, 'admin', { 
            includeFields: [ 'originalImageName', 'originalImageSize', 'uploadDate', 'displayedOnHomePage', 'displayedOnGalleryPage' ],
            includeCount: true
        });

        const imagesList: IFullCompressedImageData = { imagesList: rows, count };

        return imagesList;
    }
}