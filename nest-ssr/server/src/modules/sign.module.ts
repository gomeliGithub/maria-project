import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSecretRequestType, JwtService } from '@nestjs/jwt';
import { Algorithm } from 'jsonwebtoken';

import { PrismaModule } from './prisma.module';

import { AppService } from '../app.service';

import { SignController } from '../controllers/sign/sign.controller';
import { SignService } from '../services/sign/sign.service';
import { SignGuard } from '../guards/sign/sign.guard';
import { JwtControlService } from '../services/sign/jwt-control.service';

@Module({
    imports: [ 
        PrismaModule,
        JwtModule.registerAsync({
            global: true,
            imports: [ ConfigModule ],
            useFactory: async ( configService: ConfigService ) => {
                return {
                    secret: configService.get<string>('JWT_SECRETCODE') as string,
                    signOptions: { 
                        algorithm: configService.get<Algorithm>('JWT_SIGNVERIFAY_SIGNATURE_ALGORITHM') as Algorithm,
                        expiresIn: configService.get<string>('JWT_EXPIRESIN_TIME') as string
                    },
                    verifyOptions: {
                        algorithms: [ configService.get<Algorithm>('JWT_SIGNVERIFAY_SIGNATURE_ALGORITHM') as Algorithm ]
                    },
                    secretOrKeyProvider: ( requestType: JwtSecretRequestType ) => {
                        switch ( requestType ) {
                            case JwtSecretRequestType.SIGN: return configService.get<string>('JWT_SECRETCODE') as string;
                            case JwtSecretRequestType.VERIFY: return configService.get<string>('JWT_SECRETCODE') as string;
                        }
                    }
                }
            },
            inject: [ ConfigService ]
        }),
    ],
    providers: [ JwtService, AppService, SignService, JwtControlService, {
        provide: APP_GUARD,
        useClass: SignGuard,
    }],
    controllers: [SignController],
    exports: [ SignService, JwtControlService ]
})
export class SignModule {}