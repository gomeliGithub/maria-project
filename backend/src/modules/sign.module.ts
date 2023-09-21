import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';

import { SignController } from '../controllers/sign/sign.controller';
import { SignService } from '../services/sign/sign.service';
import { SignGuard } from '../guards/sign/sign.guard';
import { JwtControlService } from '../services/sign/jwt-control.service';

import { AppService } from '../app.service';
import { ClientService } from '../services/client/client.service';

import { JWT } from '../models/sign.model';
import { Admin, Member } from '../models/client.model';

@Module({
    imports: [ SequelizeModule.forFeature([ JWT, Admin, Member ]) ],
    providers: [ SignService, JwtControlService, AppService, ClientService, {
        provide: APP_GUARD,
        useClass: SignGuard,
    }],
    controllers: [SignController],
    exports: [ SignService, JwtControlService ]
})
export class SignModule {}