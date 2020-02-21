import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LigacaoValidacaoComponent } from './ligacao-validacao.component';

describe('LigacaoValidacaoComponent', () => {
  let component: LigacaoValidacaoComponent;
  let fixture: ComponentFixture<LigacaoValidacaoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LigacaoValidacaoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LigacaoValidacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
