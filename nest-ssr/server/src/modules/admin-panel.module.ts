import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AppService } from '../app.service';
import { AdminPanelService } from '../services/admin-panel/admin-panel.service';
import { SeoManagementService } from '../services/seo-management/seo-management.service';
import { AdminPanelController } from '../controllers/admin-panel/admin-panel.controller';

import { ClientCompressedImage, ClientOrder, ImagePhotographyType, Member } from '../models/client.model';
import { Discount } from '../models/admin-panel.model';

@Module({
    imports: [ SequelizeModule.forFeature([ ClientCompressedImage, ImagePhotographyType, ClientOrder, Discount, Member ]) ],
    providers: [ AppService, AdminPanelService, SeoManagementService ],
    controllers: [AdminPanelController],
    exports: [AdminPanelService]
})
export class AdminPanelModule {}