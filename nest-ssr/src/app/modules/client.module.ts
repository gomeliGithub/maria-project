import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { ClientComponent } from '../components/client/client.component';
import { ClientService } from '../services/client/client.service';

@NgModule({
    declarations: [ClientComponent],
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        TranslateModule.forChild()
    ],
    providers: [ClientService]
})
export class ClientModule { }