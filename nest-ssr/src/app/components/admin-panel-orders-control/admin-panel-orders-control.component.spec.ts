import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPanelOrdersControlComponent } from './admin-panel-orders-control.component';

describe('AdminPanelOrdersControlComponent', () => {
    let component: AdminPanelOrdersControlComponent;
    let fixture: ComponentFixture<AdminPanelOrdersControlComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ AdminPanelOrdersControlComponent ]
        }).compileComponents();

        fixture = TestBed.createComponent(AdminPanelOrdersControlComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});