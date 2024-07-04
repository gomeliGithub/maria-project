import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma.module';

import { AppService } from '../app.service';

import { ClientService } from '../services/client/client.service';
import { JwtControlService } from '../services/sign/jwt-control.service';
import { MailService } from '../services/mail/mail.service';

import { ClientController } from '../controllers/client/client.controller';

@Module({
    imports: [ PrismaModule ],
    providers: [ AppService, ClientService, JwtControlService, MailService ],
    controllers: [ClientController],
    exports: [ClientService]
})
export class ClientModule {}