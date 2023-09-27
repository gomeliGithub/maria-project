import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminPanelComponent } from '../components/admin-panel/admin-panel.component';
import { AdminPanelService } from '../services/admin-panel/admin-panel.service';

@NgModule({
    declarations: [AdminPanelComponent],
    imports: [
        CommonModule
    ],
    providers: [AdminPanelService]
})
export class AdminPanelModule { }
