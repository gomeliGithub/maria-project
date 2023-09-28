import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

@Component({
    selector: 'app-client',
    templateUrl: './client.component.html',
    styleUrls: ['./client.component.css']
})
export class ClientComponent implements OnInit {
    constructor (
        private readonly router: Router,
        private readonly activateRoute: ActivatedRoute,
        private readonly appService: AppService,
        private readonly clientService: ClientService
    ) {
        const formControls = {
            'clientLogin': new FormControl("", [ Validators.required, this.clientLoginValidator ]),
            'clientPassword': new FormControl("", [ Validators.required, this.clientPasswordValidator ])
        };

        this.signOp = this.activateRoute.snapshot.paramMap.get('op') as 'up' | 'in';

        if (this.signOp === 'up') {
            formControls['clientFullName'] = new FormControl("", [ Validators.required, this.clientFullNameValidator ]),
            formControls['clientEmail'] = new FormControl("", Validators.email);
        }

        this.signForm = new FormGroup(formControls);
    }

    public signForm: FormGroup<{
        clientLogin: FormControl<string>;
        clientPassword: FormControl<string>;
        clientFullName?: FormControl<string>;
        clientEmail?: FormControl<string>;
    }>;

    public signOp: 'up' | 'in';

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {}
    }

    public clientLoginValidator (control: FormControl<'string'>): { [ s: string ]: boolean } | null {
        const loginPattern: RegExp = /^[a-zA-Z](.[a-zA-Z0-9_-]*)$/;

        if ( !loginPattern.test(control.value) ) return { "clientLogin": true };

        return null;
    }

    public clientPasswordValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        if ( control.value.length < 4 ) return { "clientPassword": true };

        return null;
    }

    public clientFullNameValidator (control: FormControl<string>): { [ s: string ]: boolean } | null {
        if ( control.value.length < 10 ) return { "clientFullName": true };

        return null;
    }

    public sign (event: SubmitEvent): void {
        return this.clientService.sign(this.signForm.value, this.signOp);
    }
}