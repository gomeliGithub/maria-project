import { AfterViewChecked, Component, ComponentRef, ElementRef, OnInit, QueryList, ViewChild, ViewChildren, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { ModalComponent } from '../modal/modal.component';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { IClientOrdersInfoData } from 'types/global';
import { IClientOrder } from 'types/models';

@Component({
    selector: 'app-admin-panel-orders-control',
    templateUrl: './admin-panel-orders-control.component.html',
    styleUrls: ['./admin-panel-orders-control.component.css']
})
export class AdminPanelOrdersControlComponent implements OnInit, AfterViewChecked {
    constructor (
        private readonly http: HttpClient,

        private readonly appService: AppService,
        private readonly adminPanelService: AdminPanelService
    ) { }

    @ViewChild(ModalComponent) modalWindowComponent: ModalComponent
    @ViewChild('appModal', { read: ViewContainerRef, static: false })
    private readonly modalViewRef: ViewContainerRef;
    private readonly modalComponentRef: ComponentRef<ModalComponent>;

    @ViewChildren('clientOrder', { read: ElementRef<HTMLTableRowElement> }) private readonly clientOrderViewRefs: QueryList<ElementRef<HTMLTableRowElement>>;
    @ViewChildren('getClientOrdersButton', { read: ElementRef<HTMLButtonElement> }) private readonly getClientOrdersButtonViewRefs: QueryList<ElementRef<HTMLButtonElement>>;

    public clientOrdersInfoData: IClientOrdersInfoData[];
    public clientOrders: IClientOrder[];

    public firstSelectClient: boolean = false;

    public currentSelectedClientLogin: string;

    public spinnerHidden: boolean = true;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.ADMINPANELORDERSCONTROL', true).subscribe(translation => this.appService.setTitle(translation));

            this.adminPanelService.getClientOrders().subscribe({
                next: clientOrdersInfoData => this.clientOrdersInfoData = clientOrdersInfoData && clientOrdersInfoData.length !== 0 ? clientOrdersInfoData : null,
                error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
            });
        }
    }

    ngAfterViewChecked (): void {
        if ( !this.firstSelectClient && this.getClientOrdersButtonViewRefs.first ) {
            this.getClientOrdersButtonViewRefs.first.nativeElement.click();

            this.firstSelectClient = true;
        }
    }

    public getClientOrders (event: MouseEvent): void {
        const target: HTMLDivElement = event.target as HTMLDivElement;

        const clientLogin: string = target.getAttribute('client-login');
        const noIsCurrentClientSelected: boolean = this.getClientOrdersButtonViewRefs.some(button => button.nativeElement.getAttribute('client-login') !== clientLogin);

        this.currentSelectedClientLogin = clientLogin;

        this.adminPanelService.getClientOrders({ 
            memberLogin: clientLogin,
            existsCount: noIsCurrentClientSelected ? 0 : this.clientOrderViewRefs.length
        }).subscribe({
            next: clientOrders => this.clientOrders = clientOrders && clientOrders.length !== 0 ? clientOrders : null,
            error: () => this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef)
        });
    }

    public changeClientOrderStatus (event: MouseEvent): void {
        const target: HTMLTableCellElement = event.target as HTMLTableCellElement;
        const targetRow: HTMLTableRowElement = target.parentElement.parentElement as HTMLTableRowElement;

        const clientOrderId: number = parseInt(targetRow.getAttribute('order-id'), 10);

        this.spinnerHidden = false;

        this.adminPanelService.changeClientOrderStatus(clientOrderId, this.currentSelectedClientLogin).subscribe({
            next: () => window.location.reload(),
            error: () => {
                this.spinnerHidden = true;

                this.appService.createErrorModal(this.modalViewRef, this.modalComponentRef);
            }
        });
    }
}