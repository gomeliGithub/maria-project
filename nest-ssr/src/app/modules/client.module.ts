import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { ClientComponent } from '../components/client/client.component';
import { ClientService } from '../services/client/client.service';

@NgModule({
    declarations: [ClientComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    providers: [ClientService]
})
export class ClientModule { }