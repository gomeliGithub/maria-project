import { Injectable } from '@nestjs/common';

import path from 'path';

import sharp from 'sharp';

@Injectable()
export class ImageControlService {
    constructor () { }

    public async compressImage (inputPath: string, outputPath: string, options: sharp.SharpOptions): Promise<boolean> {
        if ( !options ) options = {
            create: {
                width: 48,
                height: 48,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 0.5 }
            }
        }

        try {
            const semiTransparentRedPng = await sharp(inputPath, options).png().toFile(outputPath);

            console.log(semiTransparentRedPng);


            const outputTempPath: string = this.getTempFileName(outputPath);

            return true;
        } catch (error: any) {
            console.error(error);

            return false;
        }
    }

    // дописывает заданный постфикс к имени (не расширению) файла
    public getTempFileName (targetPFN: string, postfix = "_tmp"): string {
        const targetPathParts = path.parse(targetPFN);

        return targetPathParts.dir + path.sep + targetPathParts.name + postfix + targetPathParts.ext;
    }
}