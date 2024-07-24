import { NestFactory } from '@nestjs/core';

import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { AppService } from './app.service';

import { generateCookieSecret, generateJWT_SecretCode } from './services/sign/sign.generateKeys';

import { HttpExceptionFilter } from './filters/http-exception/http-exception.filter';

import { CacheInterceptor } from './interceptors/cache/cache.interceptor';
import { BigIntInterceptor } from './interceptors/big-int/big-int.interceptor';

async function bootstrap() {
    process.env.JWT_SECRETCODE = generateJWT_SecretCode();
    process.env.COOKIE_SECRET = generateCookieSecret();
    
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log']
    });

    app.enableShutdownHooks();

    app.enableCors({
        origin: process.env.CORS_ORIGIN, 
        methods: [ 'GET', 'PUT', 'POST', 'DELETE' ], 
        credentials: true
    });

    app.use(cookieParser(process.env.COOKIE_SECRET));

    app.setGlobalPrefix('/api');

    const appService = app.get(AppService);

    app.useGlobalFilters(new HttpExceptionFilter(appService));
    app.useGlobalInterceptors(new CacheInterceptor(), new BigIntInterceptor());

    await app.listen(process.env.PORT as string); // process.env.SERVER_API_PORT ?? process.env.PORT as string
}

declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = (mainModule && mainModule.filename) || '';

if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
    bootstrap().catch(err => console.error(err));
}