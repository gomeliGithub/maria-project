import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { CommonModule } from './common.module';

import { AppService } from '../app.service';

import { ClientService } from '../services/client/client.service';
import { ClientController } from '../controllers/client/client.controller';

import { Admin, Member, СompressedImage } from '../models/client.model';

@Module({
    imports: [ SequelizeModule.forFeature([ Admin, Member, СompressedImage ]), CommonModule ],
    providers: [ AppService, ClientService ],
    controllers: [ClientController],
    exports: [ClientService]
})
export class ClientModule {}