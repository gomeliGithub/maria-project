import { Injectable } from '@nestjs/common';

import { Image_photography_type } from '@prisma/client';

import { Buffer } from 'node:buffer';
import fsPromises from 'fs/promises';
import path from 'path';

import sharp from 'sharp';
import { FileTypeResult, fileTypeFromFile } from 'file-type';

import { CommonModule } from '../../modules/common.module';

import { PrismaService } from '../../../prisma/prisma.service';
import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { ICompressImageData, IRequest } from 'types/global';
import { ICreateImageDirsOptions, ICompressedImageGetOptions, IClientGetOptions, IClientGetCompressedImagesOptions } from 'types/options';
import { IAdmin, ICompressedImageWithoutRelationFields } from 'types/models';
import { IJWTPayload } from 'types/sign';

@Injectable()
export class ImageControlService {
    public staticCompressedImagesDirPath: string = path.join(this._appService.staticFilesDirPath, 'images_thumbnail');

    constructor (
        private readonly _prisma: PrismaService,

        private readonly _appService: AppService
    ) { }

    public async getCompressedImages (options: ICompressedImageGetOptions): Promise<ICompressedImageWithoutRelationFields[]> {
        const commonServiceRef: CommonService = await this._appService.getServiceRef(CommonModule, CommonService);

        const clientGetOptions: IClientGetOptions = {
            compressedImages: { 
                include: true,
                skip: options.imagesExistsCount,
                take: options.imagesLimit,
                dateFrom: options.dateFrom,
                dateUntil: options.dateUntil
            }
        }

        if ( options && options.find ) { 
            if ( options.find.imageTitles ) ( clientGetOptions.compressedImages as IClientGetCompressedImagesOptions ).whereNameArr = options.find.imageTitles;
            if ( options.find.selectFields ) ( clientGetOptions.compressedImages as IClientGetCompressedImagesOptions ).selectFields = options.find.selectFields;
            // if ( options.find.imageDisplayType ) ( clientGetOptions.compressedImages as IClientGetCompressedImagesOptions ).whereDisplayType = options.find.imageDisplayType;
            if ( options.find.photographyTypes ) ( clientGetOptions.compressedImages as IClientGetCompressedImagesOptions ).wherePhotographyTypes = options.find.photographyTypes;
            if ( options.find.displayTypes ) ( clientGetOptions.compressedImages as IClientGetCompressedImagesOptions ).whereDisplayTypes = options.find.displayTypes;
        }

        let compressedImagesData: ICompressedImageWithoutRelationFields[] | null = null;

        if ( options.clientData ) compressedImagesData = ( await commonServiceRef.getClientsData('admin', options.clientData.login as string, clientGetOptions) as IAdmin ).compressedImages as ICompressedImageWithoutRelationFields[];
        else compressedImagesData = await this._prisma.compressedImage.findMany({ 
            skip: options && options.imagesExistsCount,
            take: options && options.imagesLimit,
            select: options && options.find && options.find.selectFields ? options.find.selectFields : undefined,
            where: {
                name: options && options.find && options.find.imageTitles ? { in: options.find.imageTitles } : undefined,
                // displayType: options && options.find && options.find.imageDisplayType ? options.find.imageDisplayType : undefined,
                photographyType: options && options.find && options.find.photographyTypes ? {
                    in: options.find.photographyTypes
                } : undefined,
                displayType: options && options.find && options.find.displayTypes ? {
                    in: options.find.displayTypes
                } : undefined,
                uploadDate: options && options.dateFrom && options.dateUntil ? {
                    gte: options.dateFrom,
                    lte: options.dateUntil
                } : undefined
            },
            orderBy: {
                uploadDate: 'desc'
            }
        });

        return compressedImagesData as ICompressedImageWithoutRelationFields[];
    }

    public async compressImage (request: IRequest, compressImageData: ICompressImageData, options?: sharp.SharpOptions): Promise<boolean> {
        const { ext } = ( await fileTypeFromFile(compressImageData.inputImagePath) as FileTypeResult );

        if ( !this._appService.supportedImageFileTypes.map(imageFileType => imageFileType.replace('image/', '')).includes(ext) ) return false;

        if ( !options ) options = { };

        const inputImageDirPath: string = path.dirname(compressImageData.inputImagePath);
        const inputImageName: string = path.basename(compressImageData.inputImagePath);

        const outputImageName: string = `${path.basename(compressImageData.inputImagePath, path.extname(compressImageData.inputImagePath))}_thumb.jpeg`;
        const outputImagePath: string = path.join(compressImageData.outputDirPath, outputImageName);

        const outputTempFilePath: string = this.getTempFileName(outputImagePath);

        let updatedClient: IAdmin | null = null;

        try {
            const { width, height } = await sharp(compressImageData.inputImagePath).metadata();

            const semiTransparentRedBuffer: Buffer = await sharp(compressImageData.inputImagePath, options).jpeg({
                quality: 50,
                progressive: true
            }).resize(Math.round(width as number / 2), Math.round(height as number / 2)).toBuffer();

            await fsPromises.writeFile(outputTempFilePath, semiTransparentRedBuffer);
            await fsPromises.rename(outputTempFilePath, outputImagePath);

            updatedClient = await this._prisma.admin.update({
                data: { 
                    compressedImages: { 
                        create: {
                            name: outputImageName,
                            dirPath: compressImageData.outputDirPath,
                            originalName: inputImageName,
                            originalDirPath: inputImageDirPath,
                            originalSize: compressImageData.originalImageSize,
                            photographyType: compressImageData.imageAdditionalData.photographyType,
                            displayType: compressImageData.imageAdditionalData.displayType,
                            description: compressImageData.imageAdditionalData.description
                        }
                    }
                },
                where: { id: ( request.activeClientData as IJWTPayload ).id as number },
                include: { compressedImages: true }
            });

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

                let existingCompressedImage: ICompressedImageWithoutRelationFields | undefined = undefined;

                if ( updatedClient ) existingCompressedImage = updatedClient.compressedImages.find(data => data.name === outputImageName);

                if ( existingCompressedImage ) {
                    await this._prisma.admin.update({
                        data: { compressedImages: { delete: { name: existingCompressedImage.name } } },
                        where: { id: ( request.activeClientData as IJWTPayload ).id as number }
                    });
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

        const staticFilesImagesFullDirPath: string = path.join(this._appService.staticFilesDirPath, 'images_full');
        const staticFilesGalleryImagesDirPath: string = path.join(this._appService.staticFilesDirPath, 'images_thumbnail', 'gallery');
        const staticFilesHomeImagesDirPath: string = path.join(this._appService.staticFilesDirPath, 'images_thumbnail', 'home', 'imagePhotographyTypes');

        if ( !( await this.checkFileExists(staticFilesImagesFullDirPath) ) ) await fsPromises.mkdir(staticFilesImagesFullDirPath);
        if ( !( await this.checkFileExists(staticFilesGalleryImagesDirPath) ) ) await fsPromises.mkdir(staticFilesGalleryImagesDirPath, { recursive: true });
        if ( !( await this.checkFileExists(staticFilesHomeImagesDirPath) ) ) await fsPromises.mkdir(staticFilesHomeImagesDirPath, { recursive: true });

        for ( const photographyType in Image_photography_type ) {
            const photographyTypeDirPath: string = path.join(staticFilesGalleryImagesDirPath, photographyType);
            const photographyTypeDirIsExists: boolean = await this.checkFileExists(photographyTypeDirPath);

            if ( !photographyTypeDirIsExists ) await fsPromises.mkdir(photographyTypeDirPath);
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
        const compressedImageData: ICompressedImageWithoutRelationFields | null = await this._prisma.compressedImage.findFirst({ where: { originalName: path.basename(imagePath) } });

        if ( compressedImageData === null ) return false;

        try {
            const staticFilesHomeImagePath: string = path.join(this.staticCompressedImagesDirPath, 'home', compressedImageData.name);
            const staticFilesGalleryImagePath: string = path.join(this.staticCompressedImagesDirPath, 'gallery', compressedImageData.photographyType, compressedImageData.name);
            const compressedImageOriginalPath: string = path.join(this._appService.clientCompressedImagesDir, clientLogin, compressedImageData.name);

            const currentCompressedImagePath: string = await commonServiceRef.getFulfilledAccessPath([
                staticFilesHomeImagePath, 
                staticFilesGalleryImagePath, 
                compressedImageOriginalPath
            ]);

            await this._prisma.admin.update({ data: { compressedImages: { delete: { name: compressedImageData.name } } }, where: { id: ( request.activeClientData as IJWTPayload ).id as number } });
            await this._prisma.imagePhotographyType.update({ data: { compressedImageOriginalName: null }, where: { compressedImageOriginalName: compressedImageData.name } });
            await fsPromises.unlink(imagePath);
            await fsPromises.unlink(currentCompressedImagePath);

            return true;
        } catch {
            return false;
        }
    }
}