import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule } from '@ngx-translate/core';

import { ClientComponent } from '../components/client/client.component';
import { ClientService } from '../services/client/client.service';

import { ReplacePipe } from '../pipes/replace/replace.pipe';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        TranslateModule.forChild(),
        NgbModule,
        ClientComponent,
        ReplacePipe
    ],
    providers: [ClientService],
    exports: [ ClientComponent, ReplacePipe ]
})
export class ClientModule { }