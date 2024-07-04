import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma.module';

import { AppService } from '../app.service';

import { ImageControlService } from '../services/image-control/image-control.service';

@Module({
    imports: [ PrismaModule ],
    providers: [ AppService, ImageControlService ],
    // controllers: [ImageControlController],
    exports: [ImageControlService]
})
export class ImageControlModule { }