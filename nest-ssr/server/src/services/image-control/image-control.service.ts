import { Injectable } from '@nestjs/common';

import fsPromises from 'fs/promises';
import path from 'path';

import sharp from 'sharp';
import { fileTypeFromFile } from 'file-type';

@Injectable()
export class ImageControlService {
    constructor () { }

    public async compressImage (inputImagePath: string, outputDirPath: string, options: sharp.SharpOptions): Promise<boolean> {
        const supportedImageTypes: string[] = [ 'jpg', 'png', 'webp', 'avif', 'gif', 'svg', 'tiff' ];

        const { ext } = await fileTypeFromFile(inputImagePath);

        if (!supportedImageTypes.includes(ext)) return false;

        if ( !options ) options = {
            create: {
                width: 48,
                height: 48,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 0.5 }
            }
        }

        const outputFilePath: string = path.join(outputDirPath, path.basename(inputImagePath, path.extname(inputImagePath)) + ext);
        const outputTempFilePath: string = this.getTempFileName(outputFilePath);

        try {
            const semiTransparentRedBuffer = await sharp(inputImagePath, options).toBuffer();

            await fsPromises.writeFile(outputTempFilePath, semiTransparentRedBuffer);
            await fsPromises.rename(outputTempFilePath, outputFilePath);

            return true;
        } catch (error: any) {
            console.error(error);

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