import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-modal',
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.css']
})
export class ModalComponent implements OnInit {
    constructor (
        public readonly activeModal: NgbActiveModal
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

    ngOnInit (): void { }

    public closeModal (): void {
        this.activeModal.close();
    }
}