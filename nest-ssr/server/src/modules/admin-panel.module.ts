import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { CommonModule } from './common.module';

import { AppService } from '../app.service';
import { AdminPanelService } from '../services/admin-panel/admin-panel.service';
import { AdminPanelController } from '../controllers/admin-panel/admin-panel.controller';

import { СompressedImage } from '../models/client.model';

@Module({
    imports: [ SequelizeModule.forFeature([ СompressedImage ]), CommonModule ],
    providers: [ AppService, AdminPanelService ],
    controllers: [AdminPanelController],
})
export class AdminPanelModule {}