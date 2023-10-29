import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { AdminPanelComponent } from '../components/admin-panel/admin-panel.component';
import { AdminPanelOrdersControlComponent } from '../components/admin-panel-orders-control/admin-panel-orders-control.component';
import { AdminPanelService } from '../services/admin-panel/admin-panel.service';

import { ImageSizePipe } from '../pipes/image-size/image-size.pipe';
import { BooleanPipe } from '../pipes/boolean/boolean.pipe';

@NgModule({
    declarations: [ AdminPanelComponent, AdminPanelOrdersControlComponent, ImageSizePipe, BooleanPipe ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslateModule.forChild()
    ],
    providers: [AdminPanelService]
})
export class AdminPanelModule { }
