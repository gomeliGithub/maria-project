import { Injectable } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';
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

import { IRequest, IСompressedImageGetResult } from 'types/global';
import { IСompressedImageGetOptions } from 'types/options';

@Injectable()
export class ImageControlService {
    constructor (
        private lazyModuleLoader: LazyModuleLoader,

        private readonly appService: AppService,

        @InjectModel(СompressedImage) 
        private readonly compressedImageModel: typeof СompressedImage
    ) { }

    public async get (client: Admin | Member, clientType: 'admin' | 'member', options?: IСompressedImageGetOptions): Promise<IСompressedImageGetResult> {
        const findOptions: AssociationGetOptions = { raw: true }

        if ( options && options.includeFields ) findOptions.attributes = options.includeFields;

        let compressedImages: СompressedImage[] = null;

        if ( clientType === 'admin' ) compressedImages = await (client as Admin).$get('compressedImages', findOptions);
        else if ( clientType === 'member' ) compressedImages = await (client as Member).$get('compressedImages', findOptions);

        if ( options ) {
            if ( options.includeCount ) return { rows: compressedImages, count: await client.$count('compressedImages') };
            else return { rows: compressedImages };
        }
    }

    public async compressImage (request: IRequest, inputImagePath: string, outputDirPath: string, activeClientLogin: string, options?: sharp.SharpOptions): Promise<boolean> {
        const supportedImageTypes: string[] = [ 'jpg', 'png', 'webp', 'avif', 'gif', 'svg', 'tiff' ];

        const { ext } = await fileTypeFromFile(inputImagePath);

        if ( !supportedImageTypes.includes(ext) ) return false;

        if ( !options ) options = {
            create: {
                width: 300,
                height: 300,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 0.5 }
            }
        }

        const inputImageDirPath: string = path.dirname(inputImagePath);
        const inputImageName: string = path.basename(inputImagePath);

        const outputImageName: string = `${path.basename(inputImagePath, path.extname(inputImagePath))}_thumb.${ext}`;
        const outputImagePath: string = path.join(outputDirPath, outputImageName);
        const outputTempFilePath: string = this.getTempFileName(outputImagePath);

        try {
            const semiTransparentRedBuffer = await sharp(inputImagePath, options).toBuffer();

            await fsPromises.writeFile(outputTempFilePath, semiTransparentRedBuffer);
            await fsPromises.rename(outputTempFilePath, outputImagePath);

            const newCompressedImage = await this.compressedImageModel.create({
                imageName: outputImageName,
                imageNameDirPath: outputDirPath,
                originalImageName: inputImageName,
                originalImageDirPath: inputImageDirPath
            });

            const commonModuleRef = await this.lazyModuleLoader.load(() => CommonModule);
            const commonServiceRef = commonModuleRef.get(CommonService);

            const client: Admin | Member = await commonServiceRef.getClients(request, activeClientLogin);

            await client.$add('compressedImages', newCompressedImage);

            return true;
        } catch ( error: any ) {
            console.error(error);

            const accessResults = await Promise.allSettled([
                await fsPromises.access(inputImagePath, fsPromises.constants.F_OK),
                await fsPromises.access(outputImagePath, fsPromises.constants.F_OK),
                await fsPromises.access(outputTempFilePath, fsPromises.constants.F_OK)
            ]);

            const accessImagesErrorResults = accessResults.filter(result => result.status === 'rejected');

            let imagePath: string = '';

            for (const result of accessImagesErrorResults) {
                if ( accessResults.indexOf(result) === 0 ) imagePath = inputImagePath;
                else if ( accessResults.indexOf(result) === 1 ) imagePath = outputImagePath;
                else if ( accessResults.indexOf(result) === 2 ) imagePath = outputTempFilePath;

                fsPromises.unlink(imagePath);
            }

            return false;
        }
    }

    // дописывает заданный постфикс к имени (не расширению) файла
    public getTempFileName (targetFilePath: string, postfix = "_tmp"): string {
        const targetPathParts = path.parse(targetFilePath);

        return targetPathParts.dir + path.sep + targetPathParts.name + postfix + targetPathParts.ext;
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