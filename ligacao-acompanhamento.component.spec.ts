import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LigacaoAcompanhamentoComponent } from './ligacao-acompanhamento.component';

describe('LigacaoAcompanhamentoComponent', () => {
  let component: LigacaoAcompanhamentoComponent;
  let fixture: ComponentFixture<LigacaoAcompanhamentoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LigacaoAcompanhamentoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LigacaoAcompanhamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
