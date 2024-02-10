import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AssociationGetOptions } from 'sequelize-typescript';

import { Buffer } from 'node:buffer';
import fsPromises from 'fs/promises';
import path from 'path';

import sharp from 'sharp';
import { fileTypeFromFile } from 'file-type';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { ClientCompressedImage, ImagePhotographyType } from '../../models/client.model';

import { ICompressImageData, IRequest } from 'types/global';
import { ICreateImageDirsOptions, ICompressedImageGetOptions } from 'types/options';
import { IClientCompressedImage } from 'types/models';

@Injectable()
export class ImageControlService {
    constructor (
        private readonly appService: AppService,

        @InjectModel(ClientCompressedImage) 
        private readonly compressedImageModel: typeof ClientCompressedImage,
        @InjectModel(ImagePhotographyType)
        private readonly imagePhotographyTypeModel: typeof ImagePhotographyType
    ) { }

    public staticCompressedImagesDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_thumbnail');

    public async get (options: ICompressedImageGetOptions, rawResult: false): Promise<ClientCompressedImage[]>
    public async get (options: ICompressedImageGetOptions, rawResult: true): Promise<IClientCompressedImage[]>
    public async get (options: ICompressedImageGetOptions, rawResult?: boolean): Promise<ClientCompressedImage[] | IClientCompressedImage[]>
    public async get (options: ICompressedImageGetOptions, rawResult = true): Promise<ClientCompressedImage[] | IClientCompressedImage[]> {
        const findOptions: AssociationGetOptions = {
            where: [],
            order: [ [ 'uploadDate', 'DESC' ] ],
            limit: options.imagesLimit,
            offset: options.imagesExistsCount,
            raw: rawResult
        }

        if ( options && options.find ) {
            if ( options.find.imageTitles ) findOptions.where = { name: options.find.imageTitles };
            if ( options.find.includeFields ) findOptions.attributes = options.find.includeFields;
            if ( options.find.imageViewSize ) findOptions.where['viewSizeType'] = options.find.imageViewSize;
        }

        let compressedImages: ClientCompressedImage[] = null;

        if ( options.clientInstance) compressedImages = await options.clientInstance.$get('compressedImages', findOptions);
        else compressedImages = await this.compressedImageModel.findAll(findOptions);

        return compressedImages;
    }

    public async compressImage (request: IRequest, compressImageData: ICompressImageData, options?: sharp.SharpOptions): Promise<boolean> {
        const { ext } = await fileTypeFromFile(compressImageData.inputImagePath);

        if ( !this.appService.supportedImageFileTypes.map(imageFileType => imageFileType.replace('image/', '')).includes(ext) ) return false;

        if ( !options ) options = {};

        const inputImageDirPath: string = path.dirname(compressImageData.inputImagePath);
        const inputImageName: string = path.basename(compressImageData.inputImagePath);

        const outputImageName: string = `${path.basename(compressImageData.inputImagePath, path.extname(compressImageData.inputImagePath))}_thumb.jpeg`;
        const outputImagePath: string = path.join(compressImageData.outputDirPath, outputImageName);

        const outputTempFilePath: string = this.getTempFileName(outputImagePath);

        let newCompressedImageInstance: ClientCompressedImage = null;

        try {
            const { width, height } = await sharp(compressImageData.inputImagePath).metadata();

            const semiTransparentRedBuffer: Buffer = await sharp(compressImageData.inputImagePath, options).jpeg({
                quality: 50,
                progressive: true
            }).resize(Math.round(width / 2), Math.round(height / 2)).toBuffer();

            await fsPromises.writeFile(outputTempFilePath, semiTransparentRedBuffer);
            await fsPromises.rename(outputTempFilePath, outputImagePath);

            newCompressedImageInstance = await this.compressedImageModel.create({
                name: outputImageName,
                dirPath: compressImageData.outputDirPath,
                originalName: inputImageName,
                originalDirPath: inputImageDirPath,
                originalSize: compressImageData.originalImageSize,
                photographyType: compressImageData.imageAdditionalData.photographyType,
                viewSizeType: compressImageData.imageAdditionalData.viewSizeType,
                description: compressImageData.imageAdditionalData.description,
            });

            await request.activeClientInstance.$add('compressedImages', newCompressedImageInstance);

            return true;
        } catch {
            const accessResults: [ PromiseSettledResult<void>, PromiseSettledResult<void> ] = await Promise.allSettled([
                fsPromises.access(compressImageData.inputImagePath, fsPromises.constants.F_OK),
                fsPromises.access(outputImagePath, fsPromises.constants.F_OK),
            ]);

            const accessImagesErrorResults: PromiseSettledResult<void>[] = accessResults.filter(result => result.status === 'fulfilled');

            let imagePath: string = '';

            for ( const result of accessImagesErrorResults ) {
                if ( accessResults.indexOf(result) === 0 ) imagePath = compressImageData.inputImagePath;
                else if ( accessResults.indexOf(result) === 1 ) imagePath = outputImagePath;

                await fsPromises.unlink(imagePath);

                if ( newCompressedImageInstance ) {
                    await request.activeClientInstance.$remove('compressedImages', newCompressedImageInstance);
                    await newCompressedImageInstance.destroy();
                }
            }

            return false;
        }
    }

    public getTempFileName (targetFilePath: string, postfix = "_tmp"): string {
        const targetPathParts: path.ParsedPath = path.parse(targetFilePath);

        return targetPathParts.dir + path.sep + targetPathParts.name + postfix + targetPathParts.ext;
    }

    public async createImageDirs (options?: ICreateImageDirsOptions): Promise<void> {
        if ( options ) {
            if ( !( await this.checkFileExists(options.originalImages.dirPath) ) ) await fsPromises.mkdir(options.originalImages.dirPath);
            if ( !( await this.checkFileExists(options.originalImages.clientDirPath) ) ) await fsPromises.mkdir(options.originalImages.clientDirPath);
            if ( !( await this.checkFileExists(options.compressedImages.dirPath) ) ) await fsPromises.mkdir(options.compressedImages.dirPath);
            if ( !( await this.checkFileExists(options.compressedImages.clientDirPath) ) ) await fsPromises.mkdir(options.compressedImages.clientDirPath);
        }

        const staticFilesImagesFullDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_full');
        const staticFilesGalleryImagesDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_thumbnail', 'gallery');
        const staticFilesHomeImagesDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_thumbnail', 'home', 'imagePhotographyTypes');

        if ( !( await this.checkFileExists(staticFilesImagesFullDirPath) ) ) await fsPromises.mkdir(staticFilesImagesFullDirPath);
        if ( !( await this.checkFileExists(staticFilesGalleryImagesDirPath) ) ) await fsPromises.mkdir(staticFilesGalleryImagesDirPath, { recursive: true });
        if ( !( await this.checkFileExists(staticFilesHomeImagesDirPath) ) ) await fsPromises.mkdir(staticFilesHomeImagesDirPath, { recursive: true });

        for ( const photographyType of this.appService.imagePhotographyTypes ) {
            const photographyTypeDirDirPath: string = path.join(staticFilesGalleryImagesDirPath, photographyType);
            const photographyTypeDirIsExists: boolean = await this.checkFileExists(photographyTypeDirDirPath);

            if ( !photographyTypeDirIsExists ) await fsPromises.mkdir(photographyTypeDirDirPath);
        }
    }

    public async checkFileExists (filePath: string): Promise<boolean> {
        try {
            await fsPromises.access(filePath, fsPromises.constants.F_OK);

            return true;
        } catch { 
            return false;
        }
    }

    public async deleteImage (commonServiceRef: CommonService, request: IRequest, imagePath: string, clientLogin: string): Promise<boolean> {
        const compressedImageInstance: ClientCompressedImage = await this.compressedImageModel.findOne({ where: { originalName: path.basename(imagePath) } });

        try {
            const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', compressedImageInstance.name);
            const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImageInstance.photographyType, compressedImageInstance.name);
            const compressedImageOriginalPath: string = path.join(this.appService.clientCompressedImagesDir, clientLogin, compressedImageInstance.name);

            const currentCompressedImagePath: string = await commonServiceRef.getFulfilledAccessPath([
                staticFilesHomeImagePath, 
                staticFilesGalleryImagePath, 
                compressedImageOriginalPath
            ]);

            await request.activeClientInstance.$remove('compressedImages', compressedImageInstance);
            await compressedImageInstance.destroy();
            await this.imagePhotographyTypeModel.update({ compressedImageName: null }, { where: { compressedImageName: compressedImageInstance.name } });
            await fsPromises.unlink(imagePath);
            await fsPromises.unlink(currentCompressedImagePath);

            return true;
        } catch {
            return false;
        }
    }
}