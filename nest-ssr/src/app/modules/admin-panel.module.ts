import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule } from '@ngx-translate/core';

import { AdminPanelComponent } from '../components/admin-panel/admin-panel.component';
import { AdminPanelOrdersControlComponent } from '../components/admin-panel-orders-control/admin-panel-orders-control.component';
import { ClientOrdersComponent } from '../components/admin-panel-orders-control/client-orders/client-orders.component';
import { AdminPanelService } from '../services/admin-panel/admin-panel.service';

import { ImageSizePipe } from '../pipes/image-size/image-size.pipe';
import { BooleanPipe } from '../pipes/boolean/boolean.pipe';

@NgModule({
    declarations: [ AdminPanelComponent, AdminPanelOrdersControlComponent, ClientOrdersComponent, ImageSizePipe, BooleanPipe ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslateModule.forChild(),
        NgbModule
    ],
    providers: [AdminPanelService]
})
export class AdminPanelModule { }
