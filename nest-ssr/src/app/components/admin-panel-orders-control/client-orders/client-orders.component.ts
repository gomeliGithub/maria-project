import { Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChildren } from '@angular/core';

import { AppService } from '../../../app.service';
import { AdminPanelService } from '../../../services/admin-panel/admin-panel.service';

import { IClientOrdersInfoDataArr } from 'types/global';
import { IClientOrder } from 'types/models';

@Component({
  	selector: 'app-admin-panel-client-orders',
  	templateUrl: './client-orders.component.html',
  	styleUrls: ['./client-orders.component.css']
})
export class ClientOrdersComponent {
	constructor (
		private readonly appService: AppService,
		private readonly adminPanelService: AdminPanelService
	) { }

    public firstSelectClient: boolean = false;

	@Input() public clientOrdersInfoData: IClientOrdersInfoDataArr[];
	@Input() public prevCurrentSelectedOrdersStatusType: string;
	@Input() public currentSelectedOrdersStatusType: string;
	@Input() public additionalOrdersInfoDataExists: boolean;
	@Input() public currentSelectedClientLogin: string;
	@Input() public clientOrders: IClientOrder[];
	@Input() public additionalOrdersExists: boolean;
	@Input() public spinnerHidden: boolean;

	@Output() public clientOrdersInfoDataChange = new EventEmitter();
	@Output() public prevCurrentSelectedOrdersStatusTypeChange = new EventEmitter();
	@Output() public currentSelectedOrdersStatusTypeChange = new EventEmitter();
	@Output() public additionalOrdersInfoDataExistsChange = new EventEmitter();
	@Output() public currentSelectedClientLoginChange = new EventEmitter();
	@Output() public clientOrdersChange = new EventEmitter();
	@Output() public additionalOrdersExistsChange = new EventEmitter();
	@Output() public spinnerHiddenChange = new EventEmitter();

	set clientOrdersInfoDataValue (value: IClientOrdersInfoDataArr[]) {
	  	this.clientOrdersInfoData = value;
	  	this.clientOrdersInfoDataChange.emit(this.clientOrdersInfoData);
	}

	set prevCurrentSelectedOrdersStatusTypeValue (value: string) {
	  	this.prevCurrentSelectedOrdersStatusType = value;
	  	this.prevCurrentSelectedOrdersStatusTypeChange.emit(this.prevCurrentSelectedOrdersStatusType);
	}

	set currentSelectedOrdersStatusTypeValue (value: string) {
		this.currentSelectedOrdersStatusType = value;
		this.currentSelectedOrdersStatusTypeChange.emit(this.currentSelectedOrdersStatusType);
  	}

  	set additionalOrdersInfoDataExistsValue (value: boolean) {
		this.additionalOrdersInfoDataExists = value;
		this.additionalOrdersInfoDataExistsChange.emit(this.additionalOrdersInfoDataExists);
	}

	set currentSelectedClientLoginValue (value: string) {
		this.currentSelectedClientLogin = value;
		this.currentSelectedClientLoginChange.emit(this.currentSelectedClientLogin);
	}

	set clientOrdersValue (value: IClientOrder[]) {
		this.clientOrders = value;
		this.clientOrdersChange.emit(this.clientOrders);
	}

	set additionalOrdersExistsValue (value: boolean) {
		this.additionalOrdersExists = value;
		this.additionalOrdersExistsChange.emit(this.additionalOrdersExists);
	}
	
	set spinnerHiddenValue (value: boolean) {
		this.spinnerHidden = value;
		this.spinnerHiddenChange.emit(this.spinnerHidden);
	}

	@ViewChildren('clientOrder', { read: ElementRef<HTMLTableRowElement> }) public readonly clientOrderViewRefs: QueryList<ElementRef<HTMLTableRowElement>>;
	@ViewChildren('getClientOrdersButton', { read: ElementRef<HTMLButtonElement> }) public readonly getClientOrdersButtonViewRefs: QueryList<ElementRef<HTMLButtonElement>>;
	
	public getClientOrdersInfo (existsCountZero = false): void {
        this.adminPanelService.getClientOrdersInfoData(this, existsCountZero);
    }

	public getClientOrders (event?: MouseEvent, existsCountZero = false): void {
        this.adminPanelService.getClientOrdersData(this, event, existsCountZero);
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

                this.appService.createErrorModal();
            }
        });
    }
}