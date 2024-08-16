import { Injectable } from '@nestjs/common';

import { Image_photography_type, ImagePhotographyType } from '@prisma/client';

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
import { IAdmin, IAdminWithCompressedImagesCount, ICompressedImageWithoutRelationFields } from 'types/models';
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

        if ( !this._appService.supportedImageFileTypes.map(imageFileType => imageFileType.replace('image/', '')).includes(ext) ) {
            await fsPromises.unlink(compressImageData.inputImagePath);

            return false;
        }

        if ( !options ) options = { };

        const inputImageDirPath: string = path.dirname(compressImageData.inputImagePath);
        const inputImageName: string = path.basename(compressImageData.inputImagePath);

        const outputImageName: string = `${ path.basename(compressImageData.inputImagePath, path.extname(compressImageData.inputImagePath)) }_thumb.jpeg`;
        const outputImagePath: string = path.join(compressImageData.outputDirPath, outputImageName);

        const outputTempFilePath: string = this.getTempFileName(outputImagePath);

        try {
            const { width, height } = await sharp(compressImageData.inputImagePath).metadata();

            const semiTransparentRedBuffer: Buffer = await sharp(compressImageData.inputImagePath, options).jpeg({
                quality: 50,
                progressive: true
            }).resize(Math.round(width as number / 2), Math.round(height as number / 2)).toBuffer();

            await fsPromises.writeFile(outputTempFilePath, semiTransparentRedBuffer);
            await fsPromises.rename(outputTempFilePath, outputImagePath);

            await this._prisma.admin.update({
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
                where: { 
                    id: ( request.activeClientData as IJWTPayload ).id as number,
                },
                include: { 
                    compressedImages: {
                        take: 4,
                        skip: 0
                    } 
                }
            });

            return true;
        } catch {
            const accessResults: [ PromiseSettledResult<void>, PromiseSettledResult<void> ] = await Promise.allSettled([
                fsPromises.access(compressImageData.inputImagePath, fsPromises.constants.F_OK),
                fsPromises.access(outputImagePath, fsPromises.constants.F_OK),
            ]);

            const accessImagesErrorResults: PromiseSettledResult<void>[] = accessResults.filter(result => result.status === 'fulfilled');

            let imagePath: string = '';

            const compressedImageIsExists: boolean = await this.findSameAdminCompressedImage(( request.activeClientData as IJWTPayload ).id as number, 4, 0, outputImageName);

            if ( compressedImageIsExists ) {
                await this._prisma.admin.update({
                    data: { compressedImages: { delete: { name: outputImageName } } },
                    where: { id: ( request.activeClientData as IJWTPayload ).id as number }
                });
            }

            for ( const result of accessImagesErrorResults ) {
                if ( accessResults.indexOf(result) === 0 ) imagePath = compressImageData.inputImagePath;
                else if ( accessResults.indexOf(result) === 1 ) imagePath = outputImagePath;

                await fsPromises.unlink(imagePath);
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

    public async findSameAdminCompressedImage (adminId: number, take: number, skip: number, imageName: string | null, originalImageName?: string): Promise<boolean> {
        const adminData: IAdminWithCompressedImagesCount = ( await this._prisma.admin.findUnique({
            where: {
                id: adminId
            },
            include: {
                compressedImages: {
                    take,
                    skip,
                    select: {
                        originalName: true,
                        name: true,
                        originalSize: false,
                        photographyType: false,
                        displayType: false,
                        description: false,
                        uploadDate: false,
                        displayedOnHomePage: false,
                        displayedOnGalleryPage: false,
                        dirPath: false,
                        originalDirPath: false,
                        admin: false,
                        adminId: false
                    }
                },
                _count: {
                    select: {
                        compressedImages: true
                    }
                }
            }
        }) as IAdminWithCompressedImagesCount );

        if ( adminData._count.compressedImages === skip ) return false;

        const existingCompressedImage: ICompressedImageWithoutRelationFields | undefined = adminData.compressedImages.find(data => imageName !== null ? data.name === imageName : data.originalName === originalImageName as string);

        if ( !existingCompressedImage ) {
            return await this.findSameAdminCompressedImage(adminId, take, 
                skip + take <= adminData._count.compressedImages ? skip + take : skip + ( adminData._count.compressedImages - skip ),
                imageName, originalImageName
            );
        }

        return true;
    }

    public async deleteImage (request: IRequest, imagePath: string): Promise<boolean> {
        const compressedImageData: ICompressedImageWithoutRelationFields | null = await this._prisma.compressedImage.findFirst({ where: { originalName: path.basename(imagePath) } });

        if ( compressedImageData === null ) return false;

        const currentCompressedImagePath: string = path.join(compressedImageData.dirPath, compressedImageData.name);

        const originalImageTempName: string = this.getTempFileName(imagePath);
        const compressedImageTempName: string = this.getTempFileName(currentCompressedImagePath);

        const activeClientId: number = request.activeClientData?.id as number;

        try {
            await this._prisma.admin.update({ data: { compressedImages: { delete: { name: compressedImageData.name } } }, where: { id: activeClientId } });

            const existingImagePhotographyType: ImagePhotographyType | null = await this._prisma.imagePhotographyType.findFirst({ where: { compressedImageName: compressedImageData.name } });

            if ( existingImagePhotographyType !== null ) await this._prisma.imagePhotographyType.update({ data: { compressedImageOriginalName: null, compressedImageName: null }, where: { compressedImageName: compressedImageData.name } });

            await fsPromises.copyFile(imagePath, originalImageTempName);
            await fsPromises.copyFile(currentCompressedImagePath, compressedImageTempName);

            await fsPromises.unlink(imagePath);
            await fsPromises.unlink(currentCompressedImagePath);

            await fsPromises.unlink(originalImageTempName);
            await fsPromises.unlink(compressedImageTempName);

            return true;
        } catch {
            const compressedImageIsExists: boolean = await this.findSameAdminCompressedImage(activeClientId, 4, 0, compressedImageData.name);

            if ( !compressedImageIsExists ) {
                await this._prisma.admin.update({ data: {
                    compressedImages: {
                        create: {
                            name: compressedImageData.name,
                            dirPath: compressedImageData.dirPath,
                            originalName: compressedImageData.originalName,
                            originalDirPath: compressedImageData.originalDirPath,
                            originalSize: compressedImageData.originalSize,
                            photographyType: compressedImageData.photographyType,
                            displayType: compressedImageData.displayType,
                            description: compressedImageData.description,
                            uploadDate: compressedImageData.uploadDate,
                            displayedOnHomePage: compressedImageData.displayedOnHomePage,
                            displayedOnGalleryPage: compressedImageData.displayedOnGalleryPage
                        } 
                    } 
                }, where: { id: activeClientId } });
            }

            if ( !( await this.checkFileExists(imagePath) ) ) await fsPromises.rename(originalImageTempName, imagePath);
            if ( !( await this.checkFileExists(currentCompressedImagePath) ) ) await fsPromises.rename(compressedImageTempName, currentCompressedImagePath);

            if ( await this.checkFileExists(originalImageTempName) ) await fsPromises.unlink(originalImageTempName);
            if ( await this.checkFileExists(compressedImageTempName) ) await fsPromises.unlink(compressedImageTempName);

            return false;
        }
    }
}