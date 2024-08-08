import { NestFactory } from '@nestjs/core';

import { NextFunction, Response } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { AppService } from './app.service';

import { generateCookieSecret, generateJWT_SecretCode, generateCspNonce } from './services/sign/sign.generateKeys';

import { HttpExceptionFilter } from './filters/http-exception/http-exception.filter';

import { CacheInterceptor } from './interceptors/cache/cache.interceptor';
import { BigIntInterceptor } from './interceptors/big-int/big-int.interceptor';

import { IRequest } from 'types/global';

async function bootstrap() {
    process.env.JWT_SECRETCODE = generateJWT_SecretCode();
    process.env.COOKIE_SECRET = generateCookieSecret();
    
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log']
    });

    const serverDomain: string = process.env.SERVER_DOMAIN as string;

    app.enableShutdownHooks();

    app.enableCors({
        origin: process.env.CORS_ORIGIN, 
        methods: [ 'GET', 'PUT', 'POST', 'DELETE' ], 
        credentials: true
    });

    if ( serverDomain === 'http://localhost' ) {
        app.use(( _:IRequest, res: Response, next: NextFunction ) => {
            res.locals.cspNonce = generateCspNonce();
    
            next();
        });
        
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    scriptSrc: [ `'self'`, `'unsafe-inline'`, `'unsafe-eval'`,  ], // ( _, res ) => `'nonce-${ ( res as Response ).locals.cspNonce }'` // `'unsafe-inline'`,
                    styleSrc: [ `'self'`, `https://fonts.googleapis.com`, `'unsafe-inline'` ],
                    connectSrc: [ `'self'`, `ws://localhost:82` ],
                    fontSrc: [ `'self'`, `https://fonts.gstatic.com` ],
                    imgSrc: [ `'self'`, `data: w3.org/svg/2000` ],
                    objectSrc: [ `'self'` ],
                    baseUri: [ `'self'` ],
                    frameSrc: [ `'self'` ],
                    manifestSrc: [ `'self'` ],
                    mediaSrc: [ `'self'` ],
                    workerSrc: [ `'self'` ],
                    frameAncestors: [ `'self'` ]
                }
            },
            crossOriginEmbedderPolicy: false,
            crossOriginOpenerPolicy: { policy: 'same-origin' },
            crossOriginResourcePolicy: { policy: 'same-origin' },
            originAgentCluster: true,
            referrerPolicy: {
                policy: 'no-referrer',
            },
            strictTransportSecurity: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
            },
            xContentTypeOptions: false,
            xDnsPrefetchControl: { allow: true },
            xDownloadOptions: false,
            xFrameOptions: { action: 'sameorigin' },
            xPermittedCrossDomainPolicies: {
                permittedPolicies: 'none'
            },
            xPoweredBy: false,
            xXssProtection: true
        }));
    }

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