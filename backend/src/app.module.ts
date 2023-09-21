import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule, JwtSecretRequestType } from '@nestjs/jwt';
import { Algorithm } from 'jsonwebtoken';
import { ConfigModule } from '@nestjs/config';



import { join } from 'path';
import { AngularUniversalModule } from '@nestjs/ng-universal';

import { AppServerModule } from '../../frontend/server/src/app/app.server.module';



import { AppController } from './app.controller';
import { AppService } from './app.service';

import { SignModule } from './modules/sign.module';
import { ClientModule } from './modules/client.module';

import { JWT } from 'src/models/sign.model';
import { Admin, Member } from 'src/models/client.model';

@Module({
    imports: [
        AngularUniversalModule.forRoot({
            bootstrap: AppServerModule,
            viewsPath: '../../../frontend/server/dist/server' // join(process.cwd(), 'dist/{APP_NAME}/browser')
        }),
        ConfigModule.forRoot({
            envFilePath: [ 'config/.env.development', 'config/.env.production' ],
            isGlobal: true
        }),
        SequelizeModule.forRootAsync({
            useFactory: () => ({
                dialect: 'mysql',
                host: process.env.DB_HOST,
                port: parseInt(process.env.DB_PORT as string, 10),
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                models: [ JWT, Admin, Member ],
                autoLoadModels: true,
                synchronize: true,
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
                    case JwtSecretRequestType.SIGN: return process.env.JWT_SECRETCODE as string;
                    case JwtSecretRequestType.VERIFY: return process.env.JWT_SECRETCODE as string;
                }
            }
        }), 
        SignModule,
        ClientModule
    ],
    controllers: [AppController],
    providers: [AppService],
    exports: [AppService]
})
export class AppModule {}