import { Injectable } from '@nestjs/common';

import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';

import ms from 'ms';

import { ICookieSerializeOptions } from 'types/global';

@Injectable()
export class AppService {
    constructor () { }

    public staticFilesDirPath: string = join(process.cwd(), 'dist/nest-ssr/browser/assets');

    public __filename: string = fileURLToPath(import.meta.url);
    public __dirname: string = dirname(__filename);

    public cookieSerializeOptions: ICookieSerializeOptions = {
        httpOnly: true,
        maxAge: ms(process.env.COOKIE_MAXAGE_TIME as string),
        sameSite: 'strict',
        secure: false
    }

    public clientOriginalImagesDir: string = path.join(this.__dirname, 'originalImages');
    public clientCompressedImagesDir: string = path.join(this.__dirname, 'images_thumb');
}