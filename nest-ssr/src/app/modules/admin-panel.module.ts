import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminPanelComponent } from '../components/admin-panel/admin-panel.component';
import { AdminPanelService } from '../services/admin-panel/admin-panel.service';

import { BooleanPipe } from '../pipes/boolean/boolean.pipe';

@NgModule({
    declarations: [ AdminPanelComponent, BooleanPipe ],
    imports: [
        CommonModule
    ],
    providers: [AdminPanelService]
})
export class AdminPanelModule { }
