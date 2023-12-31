import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AppService } from '../app.service';

import { ImageControlService } from '../services/image-control/image-control.service';

import { Admin, ClientCompressedImage, ImagePhotographyType } from '../models/client.model';

@Module({
    imports: [ SequelizeModule.forFeature([ Admin, ClientCompressedImage, ImagePhotographyType ]) ],
    providers: [ AppService, ImageControlService ],
    // controllers: [ImageControlController],
    exports: [ImageControlService]
})
export class ImageControlModule { }