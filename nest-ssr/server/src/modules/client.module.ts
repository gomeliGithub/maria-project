import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AppService } from '../app.service';

import { ClientService } from '../services/client/client.service';
import { JwtControlService } from '../services/sign/jwt-control.service';
import { MailService } from '../services/mail/mail.service';

import { ClientController } from '../controllers/client/client.controller';

import { Admin, Member, ClientCompressedImage, ImagePhotographyType, ClientOrder } from '../models/client.model';
import { JWT_token } from '../models/sign.model';

@Module({
    imports: [ SequelizeModule.forFeature([ Admin, Member, ClientCompressedImage, ImagePhotographyType, ClientOrder, JWT_token ]) ],
    providers: [ AppService, ClientService, JwtControlService, MailService ],
    controllers: [ClientController],
    exports: [ClientService]
})
export class ClientModule {}