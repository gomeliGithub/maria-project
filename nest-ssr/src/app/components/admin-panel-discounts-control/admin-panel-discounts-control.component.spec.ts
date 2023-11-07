import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPanelDiscountsControlComponent } from './admin-panel-discounts-control.component';

describe('AdminPanelDiscountsControlComponent', () => {
  let component: AdminPanelDiscountsControlComponent;
  let fixture: ComponentFixture<AdminPanelDiscountsControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminPanelDiscountsControlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPanelDiscountsControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
