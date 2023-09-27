import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AppService } from '../app.service';
import { CommonService } from '../services/common/common.service';
import { AdminPanelService } from '../services/admin-panel/admin-panel.service';
import { AdminPanelController } from '../controllers/admin-panel/admin-panel.controller';

import { СompressedImage } from '../models/client.model';

@Module({
    imports: [ SequelizeModule.forFeature([ СompressedImage ])],
    providers: [ AppService, CommonService, AdminPanelService ],
    controllers: [AdminPanelController],
})
export class AdminPanelModule {}