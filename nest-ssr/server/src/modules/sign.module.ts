import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';

import { CommonModule } from './common.module';

import { AppService } from '../app.service';

import { SignController } from '../controllers/sign/sign.controller';
import { SignService } from '../services/sign/sign.service';
import { SignGuard } from '../guards/sign/sign.guard';
import { JwtControlService } from '../services/sign/jwt-control.service';

import { JWT_token } from '../models/sign.model';
import { Admin, Member } from '../models/client.model';

@Module({
    imports: [ SequelizeModule.forFeature([ JWT_token, Admin, Member ]), CommonModule ],
    providers: [ AppService, SignService, JwtControlService, {
        provide: APP_GUARD,
        useClass: SignGuard,
    }],
    controllers: [SignController],
    exports: [ SignService, JwtControlService ]
})
export class SignModule {}