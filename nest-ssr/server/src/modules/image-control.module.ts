import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { ImageControlService } from '../services/image-control/image-control.service';

import { СompressedImage } from '../models/image-control.model';

@Module({
    imports: [ SequelizeModule.forFeature([ СompressedImage ]) ],
    providers: [ImageControlService],
    // controllers: [ImageControlController],
    exports: [ImageControlService]
})
export class ImageControlModule { }