import { NestFactory } from '@nestjs/core';

/////////////////////////////////////////////////////////
/*
import 'zone.js/node';
import { APP_BASE_HREF } from '@angular/common';
import { ngExpressEngine } from '@nguniversal/express-engine';
import { existsSync } from 'fs';
import { join } from 'path';

import { AppServerModule } from './src/main.server';
*/
/////////////////////////////////////////////////////////

import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

import { generateCookieSecret, generateJWT_SecretCode } from 'src/services/sign/sign.generateKeys';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    process.env.JWT_SECRETCODE = generateJWT_SecretCode();
    process.env.COOKIE_SECRET = generateCookieSecret();

    app.enableCors({
        origin: process.env.CORS_ORIGIN, 
        methods: [ 'GET', 'PUT', 'POST', 'DELETE' ], 
        credentials: true
    });

    app.use(cookieParser(process.env.COOKIE_SECRET));

    await app.listen(3000);
}

bootstrap();