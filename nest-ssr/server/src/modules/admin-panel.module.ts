import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma.module';

import { AppService } from '../app.service';
import { AdminPanelService } from '../services/admin-panel/admin-panel.service';
import { ValidateClientRequestsService } from '../services/validate-client-requests/validate-client-requests.service';
import { CronTasksService } from '../services/cron-tasks/cron-tasks.service';

import { AdminPanelController } from '../controllers/admin-panel/admin-panel.controller';

@Module({
    imports: [ PrismaModule ],
    providers: [ AppService, AdminPanelService, ValidateClientRequestsService, CronTasksService ],
    controllers: [AdminPanelController],
    exports: [AdminPanelService]
})
export class AdminPanelModule {}