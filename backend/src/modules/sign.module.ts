import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';

import { SignController } from 'src/controllers/sign/sign.controller';
import { SignService } from 'src/services/sign/sign.service';
import { SignGuard } from 'src/guards/sign/sign.guard';
import { JwtControlService } from 'src/services/sign/jwt-control.service';

import { AppService } from 'src/common/app.service';
import { ClientService } from 'src/services/client/client.service';

import { JWT } from 'src/models/sign.model';
import { Admin, Member } from 'src/models/client.model';

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