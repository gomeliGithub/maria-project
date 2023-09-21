import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { Admin, Member } from '../models/client.model';

import { ClientService } from '../services/client/client.service';

@Module({
    imports: [ SequelizeModule.forFeature([ Admin, Member ]) ],
    providers: [ClientService],
    // controllers: [ClientController],
    exports: [ClientService]
})
export class ClientModule {}