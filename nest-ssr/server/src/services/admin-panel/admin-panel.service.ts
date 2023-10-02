import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import fsPromises from 'fs/promises';
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

    public async changeImageDisplayTarget (request: IRequest, requestBody: IRequestBody): Promise<string> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const activeAdminLogin: string = await commonServiceRef.getActiveClient(request, { includeFields: 'login' });

        const originalImagePath: string = await this.validateImageControlRequests(request, requestBody, activeAdminLogin);

        if ( !originalImagePath ) return 'ERROR';

        const compressedImage: СompressedImage = await this.compressedImageModel.findOne({ where: { originalName: path.basename(originalImagePath) }, raw: true });

        const displayTargetPage: 'home' | 'gallery' | 'original' = requestBody.adminPanel.displayTargetPage;

        const updateValues: { [x: string]: any } = { };

        if ( displayTargetPage === 'home') {
            updateValues.displayedOnHomePage = true;

            if ( compressedImage.displayedOnHomePage ) updateValues.displayedOnHomePage = false;
            else if ( compressedImage.displayedOnGalleryPage ) updateValues.displayedOnGalleryPage = false;
        } else if ( displayTargetPage === 'gallery' ) {
            updateValues.displayedOnGalleryPage = true;

            if ( compressedImage.displayedOnGalleryPage ) updateValues.displayedOnGalleryPage = false;
            else if ( compressedImage.displayedOnHomePage ) updateValues.displayedOnHomePage = false;
        } else if ( displayTargetPage === 'original' ) {
            if ( compressedImage.displayedOnHomePage ) updateValues.displayedOnHomePage = false;
            else if ( compressedImage.displayedOnGalleryPage ) updateValues.displayedOnGalleryPage = false;
        }

        const staticFilesDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_thumbnail');

        const staticFilesHomeImagePath: string = path.join(staticFilesDirPath, 'home', compressedImage.imageName);
        const staticFilesGalleryImagePath: string = path.join(staticFilesDirPath, 'gallery', compressedImage.imageName);
        const compressedImageOriginalPath: string = path.join(this.appService.clientCompressedImagesDir, activeAdminLogin, compressedImage.imageName);

        let oldPath: string = '';
        let newPath: string = '';

        const accessResults = await Promise.allSettled([
            fsPromises.access(compressedImageOriginalPath, fsPromises.constants.F_OK),
            fsPromises.access(staticFilesHomeImagePath, fsPromises.constants.F_OK),
            fsPromises.access(staticFilesGalleryImagePath, fsPromises.constants.F_OK)
        ]);

        if ( accessResults[0].status === 'fulfilled' ) oldPath = compressedImageOriginalPath;
        else if ( accessResults[1].status === 'fulfilled' ) oldPath = staticFilesHomeImagePath;
        else if ( accessResults[2].status === 'fulfilled' ) oldPath = staticFilesGalleryImagePath;

        if ( displayTargetPage === 'home' ) newPath = staticFilesHomeImagePath;
        else if ( displayTargetPage === 'gallery' ) newPath = staticFilesGalleryImagePath;
        else if ( displayTargetPage === 'original' ) newPath = compressedImageOriginalPath;
        
        try {
            await fsPromises.rename(oldPath, newPath);
            await this.compressedImageModel.update(updateValues, { where: { originalName: path.basename(originalImagePath) }});

            return 'SUCCESS';
        } catch (error) {
            console.error (error);

            throw new InternalServerErrorException();
        }
    }

    public async validateImageControlRequests (request: IRequest, requestBody: IRequestBody, activeAdminLogin: string): Promise<string> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);
        
        const client: Admin | Member = await commonServiceRef.getClients(request, activeAdminLogin, { rawResult: false });

        const originalImageName: string = requestBody.adminPanel.originalImageName;
        const originalImagePath: string = path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName);

        const { rows } = await commonServiceRef.getCompressedImages(client, 'admin', { includeFields: [ 'originalName' ] });

        const compressedImageInstance: СompressedImage = rows.find(compressedImage => compressedImage.originalName === originalImageName);
        const imageExists: boolean = await commonServiceRef.checkImageExists(path.join(this.appService.clientOriginalImagesDir, activeAdminLogin, originalImageName));

        if ( !compressedImageInstance || !imageExists ) return null;
        
        return originalImagePath;
    }
}