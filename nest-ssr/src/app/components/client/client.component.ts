import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { ReplacePipe } from '../../pipes/replace/replace.pipe';

import { AppService } from '../../app.service';
import { ClientService } from '../../services/client/client.service';

@Component({
    selector: 'app-client',
    standalone: true,
    imports: [ CommonModule, RouterModule, ReactiveFormsModule, ReplacePipe, NgbModule, TranslateModule ],
    templateUrl: './client.component.html',
    styleUrls: ['./client.component.css']
})
export class ClientComponent implements OnInit {
    public isPlatformBrowser: boolean;
    public isPlatformServer: boolean;

    public signOperation: 'in' | 'up';

    public signForm: FormGroup<{
        clientLogin: FormControl<string | null>;
        clientPassword: FormControl<string | null>;
        clientFullName?: FormControl<string | null>;
        clientEmail?: FormControl<string | null>;
    }>;

    public passwordIsVisible: boolean = false;

    constructor (
        @Inject(PLATFORM_ID) private readonly platformId: string,

        private readonly _activateRoute: ActivatedRoute,

        private readonly _appService: AppService,
        private readonly _clientService: ClientService
    ) {
        this.isPlatformBrowser = isPlatformBrowser(this.platformId);
        this.isPlatformServer = isPlatformServer(this.platformId);
        
        this._activateRoute.url.subscribe(url => {
            this.signOperation = url.join(' ') as 'in' | 'up';
            
            const clientLoginValidators: ValidatorFn[] = [ Validators.pattern(/^[a-zA-Z](.[a-zA-Z0-9_-]*){4,}$/) ];
            const clientPasswordValidators: ValidatorFn[] = [ Validators.pattern(/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{6,}/g) ];
            
            const formControls = {
                'clientLogin': new FormControl("", this.signOperation === 'up' ? [ Validators.required ].concat(clientLoginValidators) : Validators.required),
                'clientPassword': new FormControl("", this.signOperation === 'up' ? [ Validators.required ].concat(clientPasswordValidators) : Validators.required)
            };

            if ( this.signOperation === 'up' ) {
                formControls['clientFullName'] = new FormControl("", [ Validators.required, Validators.minLength(3), Validators.maxLength(25) ]),
                formControls['clientEmail'] = new FormControl("", Validators.email);
            }

            this.signForm = new FormGroup(formControls);
        });
    }

    ngOnInit (): void {
        if ( this.isPlatformBrowser ) {
            this._appService.getTranslations(`PAGETITLES.${ this.signOperation === 'up' ? 'SIGNUP' : 'SIGNIN' }`, true).subscribe({
                next: translation => this._appService.setTitle(translation),
                error: () => this._appService.createErrorModal()
            });
        }
    }

    public passwordVisibleSwitch (): void {
        this.passwordIsVisible = !this.passwordIsVisible;
    }

    public signFormSubmit (): void {
        return this._clientService.sign(this.signForm.value, this.signOperation);
    }
}