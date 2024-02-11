import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

import { environment } from '../../../environments/environment';

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
        this.signOp = this.activateRoute.snapshot.paramMap.get('op') as 'up' | 'in';

        if ( !environment.signOps.includes(this.signOp) ) this.router.navigate(['**'], { skipLocationChange: true });
        
        const clientLoginValidators: ValidatorFn[] = [ Validators.minLength(4), Validators.maxLength(15), Validators.pattern(/^[a-zA-Z](.[a-zA-Z0-9_-]*)$/) ];
        const clientPasswordValidators: ValidatorFn[] = [ Validators.minLength(5), Validators.maxLength(20) ];
        
        const formControls = {
            'clientLogin': new FormControl("", this.signOp === 'up' ? [ Validators.required ].concat(clientLoginValidators) : Validators.required),
            'clientPassword': new FormControl("", this.signOp === 'up' ? [ Validators.required ].concat(clientPasswordValidators) : Validators.required)
        };

        if ( this.signOp === 'up' ) {
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

    public passwordIsVisible: boolean = false;

    ngOnInit (): void {
        this.router.events.subscribe((evt) => {
            if ( !( evt instanceof NavigationEnd ) ) return;
            else this.url = evt.url;
            
            if ( this.url === '/sign/up' || this.url === '/sign/in') window.location.reload();
        });
        
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations(`PAGETITLES.${ this.signOp === 'up' ? 'SIGNUP' : 'SIGNIN' }`, true).subscribe({
                next: translation => this.appService.setTitle(translation),
                error: () => this.appService.createErrorModal()
            });
        }
    }

    public passwordVisibleSwitch (): void {
        this.passwordIsVisible = !this.passwordIsVisible;
    }

    public sign (): void {
        return this.clientService.sign(this.signForm.value, this.signOp);
    }
}