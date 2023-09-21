import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { Admin, Member } from 'src/models/client.model';

import { ClientService } from 'src/services/client/client.service';

@Module({
    imports: [ SequelizeModule.forFeature([ Admin, Member ]) ],
    providers: [ClientService],
    // controllers: [ClientController],
    exports: [ClientService]
})
export class ClientModule {}