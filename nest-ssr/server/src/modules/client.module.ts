import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AppService } from '../app.service';

import { ClientService } from '../services/client/client.service';

import { Admin, Member, СompressedImage } from '../models/client.model';

@Module({
    imports: [ SequelizeModule.forFeature([ Admin, Member, СompressedImage ]) ],
    providers: [ AppService, ClientService ],
    // controllers: [ClientController],
    exports: [ClientService]
})
export class ClientModule {}