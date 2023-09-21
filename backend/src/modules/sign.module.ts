import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { SignController } from 'src/controllers/sign/sign.controller';
import { SignService } from 'src/services/sign/sign.service';
import { SignGuard } from 'src/guards/sign/sign.guard';
import { JwtControlService } from 'src/services/sign/jwt-control.service';

@Module({
    imports: [],
    providers: [ SignService, JwtControlService, {
        provide: APP_GUARD,
        useClass: SignGuard,
    }],
    controllers: [SignController]
})
export class SignModule {}