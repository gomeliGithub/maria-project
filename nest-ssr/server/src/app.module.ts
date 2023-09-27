import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import mysql2 from 'mysql2';
import { JwtModule, JwtSecretRequestType } from '@nestjs/jwt';
import { Algorithm } from 'jsonwebtoken';
import { ConfigModule } from '@nestjs/config';

import { join } from 'path';

import { AngularUniversalModule } from '@nestjs/ng-universal';
import { AppServerModule } from '../../src/main.server';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { SignModule } from './modules/sign.module';
import { ClientModule } from './modules/client.module';
import { ImageControlModule } from './modules/image-control.module';
import { AdminPanelModule } from './modules/admin-panel.module';
import { CommonModule } from './modules/common.module';

import { JWT_token } from './models/sign.model';
import { Admin, Member, СompressedImage } from './models/client.model';

@Module({
    imports: [
        AngularUniversalModule.forRoot({
            bootstrap: AppServerModule,
            viewsPath: join(process.cwd(), 'dist/nest-ssr/browser')
        }),
        ConfigModule.forRoot({
            envFilePath: [ 'server/config/.env.development', 'server/config/.env.production' ],
            isGlobal: true
        }),
        SequelizeModule.forRootAsync({
            useFactory: () => ({
                dialect: 'mysql',
                dialectModule: mysql2,
                host: process.env.DB_HOST,
                port: parseInt(process.env.DB_PORT, 10),
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                models: [ JWT_token, Admin, Member, СompressedImage ],
                autoLoadModels: true,
                synchronize: true
            })
        }),
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRETCODE,
            signOptions: { 
                algorithm: process.env.JWT_SIGNVERIFAY_SIGNATURE_ALGORITHM as Algorithm,
                expiresIn: process.env.JWT_EXPIRESIN_TIME
            },
            verifyOptions: {
                algorithms: [ process.env.JWT_SIGNVERIFAY_SIGNATURE_ALGORITHM as Algorithm ]
            },
            secretOrKeyProvider: (requestType: JwtSecretRequestType) => {
                switch (requestType) {
                    case JwtSecretRequestType.SIGN: return process.env.JWT_SECRETCODE;
                    case JwtSecretRequestType.VERIFY: return process.env.JWT_SECRETCODE;
                }
            }
        }), 
        SignModule,
        ClientModule,
        ImageControlModule,
        AdminPanelModule,
        CommonModule
    ],
    controllers: [AppController],
    providers: [AppService],
    exports: [AppService]
})
export class AppModule {}