import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
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
            'clientLogin': new FormControl("", [ Validators.required, Validators.minLength(4), Validators.maxLength(15), this.clientLoginValidator ]),
            'clientPassword': new FormControl("", [ Validators.required, Validators.minLength(5), Validators.maxLength(20) ])
        };

        this.signOp = this.activateRoute.snapshot.paramMap.get('op') as 'up' | 'in';

        if (this.signOp === 'up') {
            formControls['clientFullName'] = new FormControl("", [ Validators.required, Validators.minLength(3), Validators.maxLength(25) ]),
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

    public url: string;

    ngOnInit (): void {
        this.router.events.subscribe((evt) => {
            if ( !(evt instanceof NavigationEnd) ) return;
            else this.url = evt.url;
            
            if ( this.url === '/signUp' || this.url === '/signIn') window.location.reload();
        });
        
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations(`PAGETITLES.${ this.signOp === 'up' ? 'SIGNUP' : 'SIGNIN' }`, true).subscribe({
                next: translation => this.appService.setTitle(translation),
                error: () => this.appService.createErrorModal()
            });
        }
    }

    public clientLoginValidator (control: FormControl<'string'>): { [ s: string ]: boolean } | null {
        const loginPattern: RegExp = /^[a-zA-Z](.[a-zA-Z0-9_-]*)$/;

        if ( !loginPattern.test(control.value) ) return { 'clientLogin': true };

        return null;
    }

    public sign (): void {
        return this.clientService.sign(this.signForm.value, this.signOp);
    }
}