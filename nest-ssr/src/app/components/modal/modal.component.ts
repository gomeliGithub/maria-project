import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-modal',
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.css']
})
export class ModalComponent {
    constructor () { }

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

    public destroyModal (): void {
        const modal = document.getElementById('modal');

        if ( modal ) modal.remove();
    }

    public async hideModal (): Promise<void> {
        const bootstrap = await import('bootstrap');

        const modal = bootstrap.Modal.getInstance('#modal');

        if ( modal ) modal.dispose();
    }
}