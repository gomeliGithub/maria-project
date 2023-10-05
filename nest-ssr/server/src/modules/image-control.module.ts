import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AppService } from '../app.service';

import { ImageControlService } from '../services/image-control/image-control.service';

import { Admin, Member, ClientСompressedImage } from '../models/client.model';

@Module({
    imports: [ SequelizeModule.forFeature([ Admin, Member, ClientСompressedImage ]) ],
    providers: [ AppService, ImageControlService ],
    // controllers: [ImageControlController],
    exports: [ImageControlService]
})
export class ImageControlModule { }