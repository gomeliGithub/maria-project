import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AppService } from '../app.service';
import { AdminPanelService } from '../services/admin-panel/admin-panel.service';
import { SeoManagementService } from '../services/seo-management/seo-management.service';
import { AdminPanelController } from '../controllers/admin-panel/admin-panel.controller';

import { ClientСompressedImage } from '../models/client.model';
@Module({
    imports: [ SequelizeModule.forFeature([ ClientСompressedImage ]) ],
    providers: [ AppService, AdminPanelService, SeoManagementService ],
    controllers: [AdminPanelController],
    exports: [AdminPanelService]
})
export class AdminPanelModule {}