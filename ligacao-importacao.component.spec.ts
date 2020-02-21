import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LigacaoImportacaoComponent } from './ligacao-importacao.component';

describe('LigacaoImportacaoComponent', () => {
  let component: LigacaoImportacaoComponent;
  let fixture: ComponentFixture<LigacaoImportacaoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LigacaoImportacaoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LigacaoImportacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
