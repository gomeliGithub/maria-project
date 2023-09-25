import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { ClientService } from '../services/client/client.service';

import { Admin, Member } from '../models/client.model';

@Module({
    imports: [ SequelizeModule.forFeature([ Admin, Member ]) ],
    providers: [ClientService],
    // controllers: [ClientController],
    exports: [ClientService]
})
export class ClientModule {}