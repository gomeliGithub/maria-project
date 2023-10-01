import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import path from 'path';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { Admin, Member, СompressedImage } from '../../models/client.model';

import { ICompressedImage, IFullCompressedImageData, IRequest, IRequestBody} from 'types/global';

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

        const imagesList: IFullCompressedImageData = { imagesList: rows as unknown as ICompressedImage[], count };

        return imagesList;
    }

    public async deleteImage (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const activeAdminLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });
        const client: Admin | Member = await commonServiceRef.getClients(request, activeAdminLogin, { rawResult: false });

        const originalImageName: string = requestBody.adminPanel.originalImageName;
        const originalImagePath: string = path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName);

        const { rows } = await commonServiceRef.getCompressedImages(client, 'admin', { includeFields: [ 'originalName' ] });

        const compressedImageInstance: СompressedImage = rows.find(compressedImage => compressedImage.originalName === originalImageName);
        const imageExists: boolean = await commonServiceRef.checkImageExists(path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName));

        if ( !compressedImageInstance || !imageExists ) return 'ERROR';

        const deleteImageResult: boolean = await commonServiceRef.deleteImage(request, originalImagePath, activeAdminLogin);

        if ( deleteImageResult ) return 'SUCCESS';
    }
}