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

import { Admin, Member, СompressedImage } from '../../models/client.model';

import { ICompressImageData, IRequest } from 'types/global';
import { ICreateImageDirsOptions, IСompressedImageGetOptions } from 'types/options';

@Injectable()
export class ImageControlService {
    constructor (
        private readonly appService: AppService,

        @InjectModel(СompressedImage) 
        private readonly compressedImageModel: typeof СompressedImage
    ) { }

    public async get (options: IСompressedImageGetOptions): Promise<СompressedImage[]> {
        const findOptions: AssociationGetOptions = { raw: true }

        if ( options && options.find.includeFields ) findOptions.attributes = options.find.includeFields;
        if ( options && options.hasOwnProperty('rawResult') ) findOptions.raw = options.find.rawResult;

        let compressedImages: СompressedImage[] = null;

        if ( options.client ) {
            if ( options.clientType === 'admin' ) compressedImages = await (options.client as Admin).$get('compressedImages', findOptions);
            else if ( options.clientType === 'member' ) compressedImages = await (options.client as Member).$get('compressedImages', findOptions);
        } else compressedImages = await this.compressedImageModel.findAll(findOptions);

        return compressedImages;
    }

    public async compressImage (request: IRequest, compressImageData: ICompressImageData, activeClientLogin: string, options?: sharp.SharpOptions): Promise<boolean> {
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

        const outputImageName: string = `${path.basename(compressImageData.inputImagePath, path.extname(compressImageData.inputImagePath))}_thumb.${ext}`;
        const outputImagePath: string = path.join(compressImageData.outputDirPath, outputImageName);

        const outputTempFilePath: string = this.getTempFileName(outputImagePath);

        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const client: Admin | Member = await commonServiceRef.getClients(request, activeClientLogin, { rawResult: false });

        let newCompressedImage: СompressedImage = null;

        try {
            const semiTransparentRedBuffer: Buffer = await sharp(compressImageData.inputImagePath).resize(1000, 1000).toBuffer();

            await fsPromises.writeFile(outputTempFilePath, semiTransparentRedBuffer);
            await fsPromises.rename(outputTempFilePath, outputImagePath);

            newCompressedImage = await this.compressedImageModel.create({
                imageName: outputImageName,
                imageDirPath: compressImageData.outputDirPath,
                originalName: inputImageName,
                originalDirPath: inputImageDirPath,
                originalSize: compressImageData.originalImageSize,
                imageEventType: compressImageData.imageAdditionalData.imageEventType,
                imageDescription: compressImageData.imageAdditionalData.imageDescription
            });

            await client.$add('compressedImages', newCompressedImage);

            return true;
        } catch ( error: any ) {
            console.error(error);

            const accessResults = await Promise.allSettled([
                fsPromises.access(compressImageData.inputImagePath, fsPromises.constants.F_OK),
                fsPromises.access(outputImagePath, fsPromises.constants.F_OK),
            ]);

            const accessImagesErrorResults = accessResults.filter(result => result.status === 'fulfilled');

            let imagePath: string = '';

            for (const result of accessImagesErrorResults) {
                if ( accessResults.indexOf(result) === 0 ) imagePath = compressImageData.inputImagePath;
                else if ( accessResults.indexOf(result) === 1 ) imagePath = outputImagePath;

                await fsPromises.unlink(imagePath);

                if ( newCompressedImage ) {
                    await client.$remove('compressedImages', newCompressedImage);
                    await newCompressedImage.destroy();
                }
            }

            return false;
        }
    }

    // дописывает заданный постфикс к имени (не расширению) файла
    public getTempFileName (targetFilePath: string, postfix = "_tmp"): string {
        const targetPathParts = path.parse(targetFilePath);

        return targetPathParts.dir + path.sep + targetPathParts.name + postfix + targetPathParts.ext;
    }

    public async createImageDirs (options: ICreateImageDirsOptions): Promise<void> {
        try {
            await fsPromises.access(options.originalImages.dirPath, fsPromises.constants.F_OK);
        } catch {
            await fsPromises.mkdir(options.originalImages.dirPath);
        }

        try {
            await fsPromises.access(options.originalImages.clientDirPath, fsPromises.constants.F_OK);
        } catch {
            await fsPromises.mkdir(options.originalImages.clientDirPath);
        }

        try {
            await fsPromises.access(options.compressedImages.dirPath, fsPromises.constants.F_OK);
        } catch {
            await fsPromises.mkdir(options.compressedImages.dirPath);
        }

        try {
            await fsPromises.access(options.compressedImages.clientDirPath, fsPromises.constants.F_OK);
        } catch {
            await fsPromises.mkdir(options.compressedImages.clientDirPath);
        }
    }

    public async checkImageExists (imagePath: string): Promise<boolean> {
        try {
            await fsPromises.access(imagePath, fsPromises.constants.F_OK);

            return true;
        } catch { 
            return false;
        }
    }

    public async deleteImage (request: IRequest, imagePath: string, clientLogin: string): Promise<boolean> {
        const commonServiceRef = await this.appService.getServiceRef(CommonModule, CommonService);

        const client: Admin | Member = await commonServiceRef.getClients(request, clientLogin, { rawResult: false });
        const compressedImage: СompressedImage = await this.compressedImageModel.findOne({ where: { originalName: path.basename(imagePath) } });

        try {
            const compressedImageName: string = `${path.basename(imagePath, path.extname(imagePath))}_thumb${ path.extname(imagePath) }`;

            await client.$remove('compressedImages', compressedImage);
            await compressedImage.destroy();
            await fsPromises.unlink(imagePath);
            await fsPromises.unlink(path.join(this.appService.clientCompressedImagesDir, clientLogin, compressedImageName));

            return true;
        } catch { 
            return false;
        }
    }

    public endianness (): 'big' | 'little' {
        const ab = Buffer.alloc(2);
        const ta16 = new Uint16Array(ab.buffer);

        ta16[0] = 511;

        console.log("нулевой=" + ab[0] + " первый=" + ab[1]);

        if ( ab[1] === 1 ) return 'big';
        else return 'little';
    }

    public imageAnalyzer (): void {

    }
}