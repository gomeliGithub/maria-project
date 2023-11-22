import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AssociationGetOptions } from 'sequelize-typescript';

import { Buffer } from 'node:buffer';
import fsPromises from 'fs/promises';
import path from 'path';

import sharp from 'sharp';
import { fileTypeFromFile } from 'file-type';

import { CommonModule } from '../../modules/common.module';

import { AppService } from '../../app.service';
import { CommonService } from '../common/common.service';

import { Admin, ClientCompressedImage, ImagePhotographyType } from '../../models/client.model';

import { ICompressImageData } from 'types/global';
import { ICreateImageDirsOptions, IСompressedImageGetOptions } from 'types/options';
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

    public async get (options: {
        client?: Admin,
        find?: {
            imageTitles?: string[],
            includeFields?: string[],
            imageViewSize?: string,
            rawResult: false
        },
        imagesLimit?: number,
        imagesExistsCount?: number
    }): Promise<ClientCompressedImage[]>
    public async get (options: {
        client?: Admin,
        find?: {
            imageTitles?: string[],
            includeFields?: string[],
            imageViewSize?: string,
            rawResult: true 
        },
        imagesLimit?: number,
        imagesExistsCount?: number
    }): Promise<IClientCompressedImage[]>
    public async get (options: IСompressedImageGetOptions): Promise<ClientCompressedImage[] | IClientCompressedImage[]>
    public async get (options: IСompressedImageGetOptions): Promise<ClientCompressedImage[] | IClientCompressedImage[]> {
        const findOptions: AssociationGetOptions = {
            where: [],
            order: [ [ 'uploadDate', 'DESC' ] ],
            limit: options.imagesLimit,
            offset: options.imagesExistsCount,
            raw: true
        }

        if ( options && options.find && options.find.imageTitles ) findOptions.where = { name: options.find.imageTitles };
        if ( options && options.find && options.find.includeFields ) findOptions.attributes = options.find.includeFields;
        if ( options && options.find && options.find.imageViewSize ) findOptions.where['viewSizeType'] = options.find.imageViewSize;
        if ( options && options.find && options.find.hasOwnProperty('rawResult') ) findOptions.raw = options.find.rawResult;

        let compressedImages: ClientCompressedImage[] = null;

        if ( options.clientInstance) compressedImages = await options.clientInstance.$get('compressedImages', findOptions);
        else compressedImages = await this.compressedImageModel.findAll(findOptions);

        return compressedImages;
    }

    public async compressImage (compressImageData: ICompressImageData, activeClientLogin: string, options?: sharp.SharpOptions): Promise<boolean> {
        const supportedImageTypes: string[] = [ 'jpg', 'png', 'webp', 'avif', 'gif', 'svg', 'tiff' ];

        const { ext } = await fileTypeFromFile(compressImageData.inputImagePath);

        if ( !supportedImageTypes.includes(ext) ) return false;

        if ( !options ) options = null; /*{
            create: {
                width: 300,
                height: 300,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 0.5 }
            }
        }*/

        const inputImageDirPath: string = path.dirname(compressImageData.inputImagePath);
        const inputImageName: string = path.basename(compressImageData.inputImagePath);

        const outputImageName: string = `${path.basename(compressImageData.inputImagePath, path.extname(compressImageData.inputImagePath))}_thumb.jpeg`;
        const outputImagePath: string = path.join(compressImageData.outputDirPath, outputImageName);

        const outputTempFilePath: string = this.getTempFileName(outputImagePath);

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const clientInstance: Admin = await commonServiceRef.getClients(activeClientLogin, { rawResult: false }) as Admin;

        let newCompressedImage: ClientCompressedImage = null;

        try {
            const { width, height } = await sharp(compressImageData.inputImagePath).metadata();

            const semiTransparentRedBuffer: Buffer = await sharp(compressImageData.inputImagePath).jpeg({
                quality: 50,
                progressive: true
            }).resize(Math.round(width / 2), Math.round(height / 2)).toBuffer();

            await fsPromises.writeFile(outputTempFilePath, semiTransparentRedBuffer);
            await fsPromises.rename(outputTempFilePath, outputImagePath);

            newCompressedImage = await this.compressedImageModel.create({
                name: outputImageName,
                dirPath: compressImageData.outputDirPath,
                originalName: inputImageName,
                originalDirPath: inputImageDirPath,
                originalSize: compressImageData.originalImageSize,
                photographyType: compressImageData.imageAdditionalData.photographyType,
                viewSizeType: compressImageData.imageAdditionalData.viewSizeType,
                description: compressImageData.imageAdditionalData.description,
            });

            await clientInstance.$add('compressedImages', newCompressedImage);

            return true;
        } catch {
            await this.appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.SERVER_API_PORT }] Compress Image - error, login --- ${ activeClientLogin }`);

            const accessResults = await Promise.allSettled([
                fsPromises.access(compressImageData.inputImagePath, fsPromises.constants.F_OK),
                fsPromises.access(outputImagePath, fsPromises.constants.F_OK),
            ]);

            const accessImagesErrorResults: PromiseSettledResult<void>[] = accessResults.filter(result => result.status === 'fulfilled');

            let imagePath: string = '';

            for ( const result of accessImagesErrorResults ) {
                if ( accessResults.indexOf(result) === 0 ) imagePath = compressImageData.inputImagePath;
                else if ( accessResults.indexOf(result) === 1 ) imagePath = outputImagePath;

                await fsPromises.unlink(imagePath);

                if ( newCompressedImage ) {
                    await clientInstance.$remove('compressedImages', newCompressedImage);
                    await newCompressedImage.destroy();
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
            if ( !(await this.checkFileExists(options.originalImages.dirPath)) ) await fsPromises.mkdir(options.originalImages.dirPath);
            if ( !(await this.checkFileExists(options.originalImages.clientDirPath)) ) await fsPromises.mkdir(options.originalImages.clientDirPath);
            if ( !(await this.checkFileExists(options.compressedImages.dirPath)) ) await fsPromises.mkdir(options.compressedImages.dirPath);
            if ( !(await this.checkFileExists(options.compressedImages.clientDirPath)) ) await fsPromises.mkdir(options.compressedImages.clientDirPath);
        }

        const staticFilesImagesFullDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_full');
        const staticFilesGalleryImagesDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_thumbnail', 'gallery');
        const staticFilesHomeImagesDirPath: string = path.join(this.appService.staticFilesDirPath, 'images_thumbnail', 'home', 'imagePhotographyTypes');

        if ( !(await this.checkFileExists(staticFilesImagesFullDirPath)) ) await fsPromises.mkdir(staticFilesImagesFullDirPath);
        if ( !(await this.checkFileExists(staticFilesGalleryImagesDirPath)) ) await fsPromises.mkdir(staticFilesGalleryImagesDirPath, { recursive: true });
        if ( !(await this.checkFileExists(staticFilesHomeImagesDirPath)) ) await fsPromises.mkdir(staticFilesHomeImagesDirPath, { recursive: true });

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

    public async deleteImage (imagePath: string, clientLogin: string): Promise<boolean> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const clientInstance: Admin = await commonServiceRef.getClients(clientLogin, { rawResult: false }) as Admin;
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

            await clientInstance.$remove('compressedImages', compressedImageInstance);
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