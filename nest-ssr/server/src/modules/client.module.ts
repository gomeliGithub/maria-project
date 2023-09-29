import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AppService } from '../app.service';

import { ClientService } from '../services/client/client.service';
import { ClientController } from '../controllers/client/client.controller';
import { WebSocketService } from '../services/web-socket/web-socket.service';

import { Admin, Member, СompressedImage } from '../models/client.model';

@Module({
    imports: [ SequelizeModule.forFeature([ Admin, Member, СompressedImage ]) ],
    providers: [ AppService, ClientService, WebSocketService ],
    controllers: [ClientController],
    exports: [ClientService]
})
export class ClientModule {}