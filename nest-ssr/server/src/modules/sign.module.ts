import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma.module';

import { AppService } from '../app.service';

import { SignController } from '../controllers/sign/sign.controller';
import { SignService } from '../services/sign/sign.service';
import { SignGuard } from '../guards/sign/sign.guard';
import { JwtControlService } from '../services/sign/jwt-control.service';

@Module({
    imports: [ PrismaModule ],
    providers: [ AppService, SignService, JwtControlService, {
        provide: APP_GUARD,
        useClass: SignGuard,
    }],
    controllers: [SignController],
    exports: [ SignService, JwtControlService ]
})
export class SignModule {}