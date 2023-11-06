import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { IClientOrdersInfoDataArr } from 'types/global';
import { IClientOrder } from 'types/models';

@Component({
    selector: 'app-admin-panel-orders-control',
    templateUrl: './admin-panel-orders-control.component.html',
    styleUrls: ['./admin-panel-orders-control.component.css']
})
export class AdminPanelOrdersControlComponent implements OnInit {
    constructor (
        private readonly appService: AppService,
        private readonly adminPanelService: AdminPanelService
    ) { }

    @ViewChildren('clientOrder', { read: ElementRef<HTMLTableRowElement> }) public readonly clientOrderViewRefs: QueryList<ElementRef<HTMLTableRowElement>>;
    @ViewChildren('getClientOrdersButton', { read: ElementRef<HTMLButtonElement> }) public readonly getClientOrdersButtonViewRefs: QueryList<ElementRef<HTMLButtonElement>>;

    public clientOrdersInfoData: IClientOrdersInfoDataArr[];
    public clientOrders: IClientOrder[];
    public additionalOrdersExists: boolean = false;
    public additionalOrdersInfoDataExists: boolean = false;

    public prevCurrentSelectedOrdersStatusType: string;
    public currentSelectedOrdersStatusType: string = 'new';
    public currentSelectedClientLogin: string;

    public spinnerHidden: boolean = true;

    ngOnInit (): void {
        if ( this.appService.checkIsPlatformBrowser() ) {
            this.appService.getTranslations('PAGETITLES.ADMINPANEL.ORDERSCONTROL', true).subscribe(translation => this.appService.setTitle(translation));

            this.adminPanelService.getClientOrdersInfoData(this, true);
            this.adminPanelService.getClientOrdersData(this);
        }
    }

    public clientOrdersTabClick (event: MouseEvent): void {
        const target: HTMLButtonElement = event.target as HTMLButtonElement;
        const ordersType: string = target.getAttribute('orders-status-type');

        this.prevCurrentSelectedOrdersStatusType = this.currentSelectedOrdersStatusType;
        this.currentSelectedOrdersStatusType = ordersType;

        this.additionalOrdersExists = false;
        this.additionalOrdersInfoDataExists = false;

        this.adminPanelService.getClientOrdersInfoData(this, true);
        this.adminPanelService.getClientOrdersData(this);
    }
}