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

    @ViewChildren('clientOrder', { read: ElementRef<HTMLTableRowElement> }) private readonly clientOrderViewRefs: QueryList<ElementRef<HTMLTableRowElement>>;
    @ViewChildren('getClientOrdersButton', { read: ElementRef<HTMLButtonElement> }) private readonly getClientOrdersButtonViewRefs: QueryList<ElementRef<HTMLButtonElement>>;

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

            this.getClientOrdersInfo(true);
        }
    }

    public clientOrdersTabClick (event: MouseEvent): void {
        const target: HTMLButtonElement = event.target as HTMLButtonElement;
        const ordersType: string = target.getAttribute('orders-status-type');

        this.prevCurrentSelectedOrdersStatusType = this.currentSelectedOrdersStatusType;
        this.currentSelectedOrdersStatusType = ordersType;

        this.additionalOrdersExists = false;
        this.additionalOrdersInfoDataExists = false;

        this.getClientOrdersInfo(true);
    }

    public getClientOrdersInfo (existsCountZero = false): void {
        this.adminPanelService.getClientOrders({
            getInfoData: 'true',
            status: this.currentSelectedOrdersStatusType,
            ordersLimit: 2,
            existsCount: existsCountZero || (existsCountZero && this.prevCurrentSelectedOrdersStatusType !== this.currentSelectedOrdersStatusType) ? 0 : this.getClientOrdersButtonViewRefs.length
        }).subscribe({
            next: clientOrdersInfoData => {
                if ( !this.additionalOrdersInfoDataExists
                    && (existsCountZero || this.prevCurrentSelectedOrdersStatusType !== this.currentSelectedOrdersStatusType) 
                ) this.clientOrdersInfoData = clientOrdersInfoData.infoData && clientOrdersInfoData.infoData.length !== 0 ? clientOrdersInfoData.infoData : null;
                else this.clientOrdersInfoData = this.clientOrdersInfoData.concat(clientOrdersInfoData.infoData);

                this.additionalOrdersInfoDataExists = clientOrdersInfoData.additionalOrdersInfoDataExists;
            },
            error: () => this.appService.createErrorModal()
        });
    }

    public getClientOrders (event?: MouseEvent, existsCountZero = false): void {
        const target: HTMLDivElement = event ? event.target as HTMLDivElement : null;

        let clientLogin: string = null;

        if ( existsCountZero ) {
            clientLogin = target.getAttribute('client-login'); debugger;

            this.currentSelectedClientLogin = clientLogin !== 'guest' ? clientLogin : this.appService.getTranslations('ADMINPANEL.GUESTLOGINTEXT');
        }

        if ( existsCountZero ) this.additionalOrdersExists = false;

        let existsCount: number = null;

        if ( existsCountZero || (existsCountZero && this.prevCurrentSelectedOrdersStatusType !== this.currentSelectedOrdersStatusType)
            || this.prevCurrentSelectedOrdersStatusType !== this.currentSelectedOrdersStatusType
        ) existsCount = 0;
        else existsCount = this.clientOrderViewRefs.length;

        this.adminPanelService.getClientOrders({
            getInfoData: 'false',
            status: this.currentSelectedOrdersStatusType,
            memberLogin: existsCountZero ? clientLogin : this.currentSelectedClientLogin,
            ordersLimit: 2,
            existsCount
        }).subscribe({
            next: clientOrdersData => {
                if ( !this.additionalOrdersExists
                    && (existsCountZero || this.prevCurrentSelectedOrdersStatusType !== this.currentSelectedOrdersStatusType) 
                ) this.clientOrders = clientOrdersData.orders && clientOrdersData.orders.length !== 0 ? clientOrdersData.orders : null;
                else this.clientOrders = this.clientOrders.concat(clientOrdersData.orders);

                this.additionalOrdersExists = clientOrdersData.additionalOrdersExists;
            },
            error: () => this.appService.createErrorModal()
        });
    }
}