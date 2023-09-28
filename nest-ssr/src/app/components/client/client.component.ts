import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-client',
    templateUrl: './client.component.html',
    styleUrls: ['./client.component.css']
})
export class ClientComponent {
    constructor (
        private readonly activateRoute: ActivatedRoute
    ) {
        const formControls = {
            'clientLogin': new FormControl("Имя вашего аккаунта", [ Validators.required, this.clientLoginValidator ]),
            'clientPassword': new FormControl("Ваш пароль", [ Validators.required, this.clientPasswordValidator ]),
            'clientFullName': new FormControl("Ваше собственное ФИО", [ Validators.required, this.clientFullNameValidator ]),
        };

        this.signOp = this.activateRoute.snapshot.paramMap.get('op') as string;

        if (this.signOp === 'up') formControls['clientEmail'] = new FormControl("Ваша электронная почта", Validators.email);

        this.signForm = new FormGroup(formControls);
    }

    public signForm: FormGroup<{
        clientLogin: FormControl<string>;
        clientPassword: FormControl<string>;
        clientFullName: FormControl<string>;
        clientEmail?: FormControl<string>;
    }>;

    public signOp: string;

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
}