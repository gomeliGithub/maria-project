import { Component, Input } from '@angular/core';

import { AppService } from '../../app.service';

@Component({
    selector: 'app-modal',
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.css']
})
export class ModalComponent {
    constructor (
        private readonly appService: AppService
    ) { }

    @Input() title: string;
    @Input() type: string;
    @Input() body: string | undefined;

    @Input() closeButton: boolean | undefined;
    @Input() closeButtonCaption: string | undefined;

    @Input() confirmButton: boolean | undefined;
    @Input() confirmButtonCaption: string;

    @Input() closeButtonListener: Function | undefined;
    @Input() confirmButtonListener: Function | undefined;

    async ngOnInit (): Promise<void> {
        const bootstrap = await import('bootstrap');

        const modal = new bootstrap.Modal('#modal', {
            keyboard: false
        });

        modal.show();
    }

    destroyModal (): void {
        const modal = document.getElementById('modal');

        if ( modal ) modal.remove();
    }

    async hideModal (): Promise<void> {
        const bootstrap = await import('bootstrap');

        const modal = bootstrap.Modal.getInstance('#modal');

        if ( modal ) modal.dispose();
    }
}