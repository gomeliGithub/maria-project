import { Component, ElementRef, Inject, OnInit, PLATFORM_ID, QueryList, ViewChildren } from '@angular/core';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';

import { Client_order_status } from '@prisma/client';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { ClientOrdersComponent } from './client-orders/client-orders.component';

import { AppService } from '../../app.service';
import { AdminPanelService } from '../../services/admin-panel/admin-panel.service';

import { IClientOrdersInfoDataArr } from 'types/global';
import { IClientOrderWithoutRelationFields } from 'types/models';

@Component({
    selector: 'app-admin-panel-orders-control',
    standalone: true,
	imports: [ CommonModule, ClientOrdersComponent, NgbModule, TranslateModule ],
    templateUrl: './admin-panel-orders-control.component.html',
    styleUrls: ['./admin-panel-orders-control.component.css'],
    host: { ngSkipHydration: 'true' }
})
export class AdminPanelOrdersControlComponent implements OnInit {
    public isPlatformBrowser: boolean;
    public isPlatformServer: boolean;

    public clientOrdersInfoData: IClientOrdersInfoDataArr[] | null;
    public clientOrders: IClientOrderWithoutRelationFields[] | null;
    public additionalOrdersExists: boolean = false;
    public additionalOrdersInfoDataExists: boolean = false;

    public prevCurrentSelectedOrdersStatusType: Client_order_status;
    public currentSelectedOrdersStatusType: Client_order_status = 'new';
    public currentSelectedClientLogin: string;

    public spinnerHidden: boolean = true;

    constructor (
        @Inject(PLATFORM_ID) private readonly platformId: string,

        private readonly _appService: AppService,
        private readonly _adminPanelService: AdminPanelService
    ) { 
        this.isPlatformBrowser = isPlatformBrowser(this.platformId);
        this.isPlatformServer = isPlatformServer(this.platformId);
    }

    @ViewChildren('clientOrder', { read: ElementRef<HTMLTableRowElement> }) public readonly clientOrderViewRefs: QueryList<ElementRef<HTMLTableRowElement>>;
    @ViewChildren('getClientOrdersButton', { read: ElementRef<HTMLButtonElement> }) public readonly getClientOrdersButtonViewRefs: QueryList<ElementRef<HTMLButtonElement>>;

    ngOnInit (): void {
        if ( this.isPlatformBrowser ) {
            this._appService.getTranslations('PAGETITLES.ADMINPANEL.ORDERSCONTROL', true).subscribe(translation => this._appService.setTitle(translation));

            this._adminPanelService.getNextClientOrdersInfoData(this, true);
            this._adminPanelService.getNextClientOrdersData(this);
        }
    }

    public clientOrdersTabClick (event: MouseEvent): void {
        const target: HTMLButtonElement = event.target as HTMLButtonElement;
        const ordersType: Client_order_status = target.getAttribute('orders-status-type') as Client_order_status;

        this.prevCurrentSelectedOrdersStatusType = this.currentSelectedOrdersStatusType;
        this.currentSelectedOrdersStatusType = ordersType;

        this.additionalOrdersExists = false;
        this.additionalOrdersInfoDataExists = false;

        this._adminPanelService.getNextClientOrdersInfoData(this, true);
        this._adminPanelService.getNextClientOrdersData(this);
    }
}