import { NestFactory } from '@nestjs/core';

import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

import { generateCookieSecret, generateJWT_SecretCode } from './services/sign/sign.generateKeys';

import { CacheInterceptor } from './interceptors/cache/cache.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log']
    });

    process.env.JWT_SECRETCODE = generateJWT_SecretCode();
    process.env.COOKIE_SECRET = generateCookieSecret();

    app.enableCors({
        origin: process.env.CORS_ORIGIN, 
        methods: [ 'GET', 'PUT', 'POST', 'DELETE' ], 
        credentials: true
    });

    app.use(cookieParser(process.env.COOKIE_SECRET));

    app.setGlobalPrefix('/api');

    app.useGlobalInterceptors(new CacheInterceptor());

    await app.listen(process.env.PORT ?? process.env.SERVER_API_PORT);
}

declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = (mainModule && mainModule.filename) || '';

if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
    bootstrap().catch(err => console.error(err));
}