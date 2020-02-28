// Angular
import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, Observable } from 'rxjs';

// PrimeNG
import { MessageService, ConfirmationService, LazyLoadEvent } from 'primeng/api';
import { Table } from 'primeng/table';

// Interfaces
import { CanComponentDeactivate } from 'src/app/core/interfaces/can-component-deactivate.interface';

// Modelos
import { ConfiguracaoTabelaPesquisa } from 'src/app/core/models/configuracaoTabelaPesquisa.model';
import {
  Localidade,
  Bairro,
  Logradouro,
  AtividadeMacro,
  AtividadeEspecifica,
  ClassificacaoImobiliaria,
  ClassificacaoImobiliariaEnvelope,
  GrupoConsumo,
  CategoriaGrupoConsumo,
  Beneficiario,
  ImovelService,
  Imovel,
  ArrecadacaoImovelDTO
} from '../imovel.service';
import { ConfiguracaoService } from 'src/app/core/services/configuracao.service';
import { TransferenciaService } from 'src/app/core/services/transferencia.service';
import { AutenticacaoService } from 'src/app/core/services/autenticacao.service';
import { ALFANUMERICO, PTBR, TEMPO_VIDA_MENSAGEM } from 'src/environments/environment';
import { CustomValidators } from 'src/app/core/services/custom-validators';

@Component({
  selector: 'app-arrecadacao-imovel',
  templateUrl: './arrecadacao-imovel.component.html',
  styleUrls: ['./arrecadacao-imovel.component.scss']
})
export class ArrecadacaoImovelComponent implements OnInit, AfterViewInit, OnDestroy, CanComponentDeactivate {


  /*
    Label do  botão de limpar campos
  */
 limparBotao:string = 'Limpar';

  /**
   * Subscription permanente para o evento de loading. Inicializado no construtor e encerrado em ngOnDestroy.
   */
  private loadingSubscription: Subscription;

  /**
   * Flag que informa se o componente está sendo carregado ou não.
   */
  isLoading = true;

  /**
   * Linguagem usada no calendário.
   */
  locale = PTBR;

  /**
   * Registra se a tela está no modo 'cadastro' ou no modo 'edição'.
   */
  modo = 'cadastro';

  /**
   * Label do botão Cadastrar/Atualizar.
   */
  labelBotao = 'Pesquisar';

  /**
   * Formulário da parte de endereçamento e hidrometria mais código de atendimento e justificativa.
   */
  formAcompanhamento: FormGroup;

  /**
   * Formulário da parte de classificação imobiliária, atividade macro e atividades específicas.
   */
  formAtividades: FormGroup;

  /**
   * Flag que informa se o formulário já foi salvo ou não. Útil na hora de decidir se o usuário pode sair livremente da
   * tela ou não.
   */

  formSalvo = false;


  /**
   * Formulário da parte de detalhes da ligação da água.
   */
  formLigacaoAgua: FormGroup;

  /**
   * Formulário da parte da ligação do esgoto.
   */
  formLigacaoEsgoto: FormGroup;

  /**
   * Lista de localidades para o dropdown.
   */
  listaLocalidades: Localidade[];

  /**
   * Lista de bairros para o dropdown.
   */
  listaBairros: Bairro[];

  /**
   * Lista de logradouros para o dropdown.
   */
  listaLogradouros: Logradouro[];

  /**
   * Lista de atividades macro para o dropdown.
   */
  listaAtividadesMacro: AtividadeMacro[];

  /**
   * Lista das atividades micro baseadas na atividade macro selecionada.
   */
  listaAtividadesEspecificas: AtividadeEspecifica[];

  /**
   * Lista das atividades micro associadas ao imóvel
   */
  listaAtividadesEspecificasAssociadas: AtividadeEspecifica[];


  /**
   * Controla a visibilidade da janela de aviso.
   */
  dialog = false;


  /**
   * Controla a visibilidade da janela de nova categoria de classificação imobiliária.
   */
  displayDialog = false;



  /**
   * Configurações da tabela de beneficiários.
   */
  configuracaoTabela2: ConfiguracaoTabelaPesquisa = new ConfiguracaoTabelaPesquisa();



  /**
   * Configurações da tabela de classificação imobiliária.
   */
  configuracaoTabela1: ConfiguracaoTabelaPesquisa = new ConfiguracaoTabelaPesquisa();

  /**
   * Armazena as informações da economia predominante.
   */
  predominante = new ClassificacaoImobiliaria();

  /**
   * Número total de economias da categoria predominante.
   */
  totalEconomias = 0;

  /**
   * Armazena as informações da nova categoria de classificação imobiliária.
   */
  novaClassImo: ClassificacaoImobiliaria;

  /**
   * Armazena a lista de classificações imobiliárias expostas no grid.
   */
  listaClassificacoes: ClassificacaoImobiliaria[];

  /**
   * Armazena a lista de grupos de consumo para o dropdown.
   */
  listaGruposConsumo: GrupoConsumo[];


  /**
   * Armazena a lista de categorias de grupos de consumo.
   */
  listaCategorias: CategoriaGrupoConsumo[];

  /**
   * Lista de grupos de consumo auxiliar.
   */
  listaGruposConsumoAux: { [dcGrupoConsumo: string]: GrupoConsumo; } = {};
  // Setters e Getters
  // Formulário de Arrecadação de Imóvel
  get matriculaImovel() { return this.formAcompanhamento.get('matriculaImovel'); }
  get agenciaArrecadora() { return this.formAcompanhamento.get('agenciaArrecadora'); }
  get agenteArrecador() { return this.formAcompanhamento.get('agenteArrecador'); }
  get contaCorrente() { return this.formAcompanhamento.get('contaCorrente'); }
  get dataInclusaoD() { return this.formAcompanhamento.get('dataInclusaoD');}


  // Outros
  get alfanumerico() { return ALFANUMERICO; }

  /**
   * O construtor é responsável por inicializar as permissões de acesso com seus valores default e providenciar
   * acesso aos serviços usados pelo componente.
   * @param cdr Serviço detector de mudanças no View.
   * @param msgs Serviço de mensageria do PrimeNG.
   * @param servicos Serviço principal da tela 'Imóvel'. Responsável por todas as requisições.
   * @param config Serviço com configuração gerais do sistema.
   * @param elementRef Serviço de referência à elementos do View.
   * @param confirmationWindow Serviço responsável pela janela de confirmação.
   * @param autentica Serviço de autenticação do usuário logado.
   */
  constructor(
    private cdr: ChangeDetectorRef,
    private msgs: MessageService,
    private servicos: ImovelService,
    private config: ConfiguracaoService,
    private elementRef: ElementRef,
    private confirmationWindow: ConfirmationService,
    private areaTransferencia: TransferenciaService,
    private autentica: AutenticacaoService
  ) {

    // Subscription para monitorar as requisições que devem ser carregadas ao se abrir a tela.
    // Usado para sinalizar o fim do carregamento da tela.
    this.loadingSubscription = this.servicos.getLoadingNews(0).subscribe(
      (resposta: number) => {
        // Se há duas requisições finalizadas, a tela terminou de carregar.
        if (resposta === 5) {
          this.servicos.resetLoadingCounter(0);
          // Componente carregado, remove a tela de loading.
          this.loading();
          // Direciona o foco para o primeiro elemento da tela.
          this.config.direcionarFocoParaElemento('#matriculaImovel', this.elementRef);
          // Força detecção de mudanças no View
          this.cdr.detectChanges();
        }
      }
    );

    // Seta as configurações básicas das tabelas
    this.configuracaoTabela2.campoOrdenacaoTabela = 'nis';
    this.configuracaoTabela2.direcaoOrdenacaoTabela = 'ASC';
  }


  /**
   * ngOnInit dispara depois do construtor, mas antes da tela ser exibida.
   */
  ngOnInit() {
    // Inicializa-se o formulário de Arrecadação de Imóvel 

    this.formAcompanhamento = new FormGroup(
      {
        matriculaImovel: new FormControl('', Validators.compose([
          CustomValidators.ValidaMatricula_DV
        ])),
        agenciaArrecadora: new FormControl('', Validators.compose([])),
        agenteArrecador: new FormControl('', Validators.compose([])),
        contaCorrente: new FormControl('', Validators.compose([])),
        dataInclusaoD: new FormControl('', Validators.compose([]))
      }
    );


  }

  /**
   * Dispara após o View terminar de ser carregado.
   */
  ngAfterViewInit() {
    // Checa área de transferência. Seta campo com valor da área de transferência. E realiza a pesquisa.
    const aux = this.areaTransferencia.getMatriculaImovel();
    if (aux) {
      this.matriculaImovel.setValue(aux);
      this.matriculaImovel.markAsDirty();

      this.pesquisar();
    } else {
      // Não há valor à pesquisar logo uma requisição a menos.
      this.servicos.addLoadingCounter(0);
    }

    // Carrega a lista de localidades para o dropdown
    this.carregaListaLocalidades();

    // Carrega a lista de atividades macro para o dropdown
    this.carregaListaAtividadesMacro();

    // Carrega a lista de categorias de grupos de consumo para o dropdown
    this.carregaListaCategoriasGruposConsumo();

    // Carrega lista de grupos de consumo para o dropdown
    this.carregaListaGruposConsumo();

    // Força detecção de mudanças no View
    this.cdr.detectChanges();
  }

  /**
   * Carrega/descarrega a tela de loading(spinner + overlay semi-transparente)
   */
  loading() {
    this.isLoading = !this.isLoading;
  }

  /**
   * Exibe uma mensagem de sucesso.
   * @param str Texto da mensagem.
   */
  mensagemSucesso(str: string) {
    setTimeout(() => {
      this.msgs.add({ severity: 'success', summary: 'Sucesso', detail: str, life: TEMPO_VIDA_MENSAGEM });
    }, 1000);
  }

  /**
   * Exibe uma mensagem de erro.
   * @param str Texto da mensagem.
   */
  mensagemErro(str: string) {
    setTimeout(() => {
      this.msgs.add({ severity: 'error', summary: 'Erro', detail: str, life: TEMPO_VIDA_MENSAGEM });
    }, 1000);
  }

  /**
   * Exibe uma mensagem de alerta.
   * @param str Texto da mensagem.
   */
  mensagemAlerta(str: string) {
    setTimeout(() => {
      this.msgs.add({ severity: 'warn', summary: 'Aviso', detail: str, life: TEMPO_VIDA_MENSAGEM });
    }, 1000);
  }

  /**
   * Exibe uma mensagem de informação.
   * @param str Texto da mensagem.
   */
  mensagemInformacao(str: string) {
    setTimeout(() => {
      this.msgs.add({ severity: 'info', summary: 'Mensagem', detail: str, life: TEMPO_VIDA_MENSAGEM });
    }, 1000);
  }
  /**
     * Método obrigatório para todas as telas de cadastro. Diz o que fazer quando um usuário tenta sair da
     * página ou atualizá-la.
     */
  @HostListener('window:beforeunload')
  canDeactivate() {
    // Se o formulário estiver em branco ou já tiver sido salvo, libera o usuário.
    if (this.formAcompanhamento.pristine || this.formSalvo) {
      return true;
    } else {
      // Caso contrário abre uma caixa de dialogo padrão do browser perguntando se o usuário quer mesmo
      // deixar a página.
      this.dialog = true;
      return false;
    }
  }

  /**
   * Método chamado antes da destruição do componente. Remove inscrições de eventos.
   */
  ngOnDestroy(): void {
    this.loadingSubscription.unsubscribe();
  }

  pesquisar() {
    // Se houver um valor válido de matrícula de imóvel, armazena na área de transferência.
    if (this.matriculaImovel.valid) {
      this.areaTransferencia.setMatriculaImovel(this.matriculaImovel.value);
    } else {
      // return;
    }

    console.log('Formulário de Arrecadação de Imóvel DTO:');
    console.log(this.formAcompanhamento);
    this.pesquisarClassImo();

    // this.servicos.addLoadingCounter(0);
  }
  /*
  limpar() {

    //Aqui eu limpo todos os campos da consulta quando é pressionado o botão 'limpar'
    this.formAcompanhamento.controls.matriculaImovel.enable();

    this.formAcompanhamento.controls.matriculaImovel.setValue('');
    this.formAcompanhamento.controls.agenciaArrecadora.setValue('');
    this.formAcompanhamento.controls.agenteArrecadador.setValue('');
    this.formAcompanhamento.controls.contaCorrente.setValue('');
    this.formAcompanhamento.controls.dataInclusaoD.setValue('');


    this.formSalvo = false;

  }
  */

  excluir() {
  }


  /**
   * Busca endereço do imóvel
   */
  carregarImovel() {
    let matricula: any = this.formAcompanhamento.controls.matriculaImovel.value;
    console.log(`No campo está sendo digitado : ${matricula}`);

    if (matricula === null || matricula === undefined || matricula.value === '') {
      return;
    }

    this.loading();

    this.servicos.getArrecadacaoImovel(matricula).subscribe(
      (dados: Imovel) => {
        console.log(dados.arrecadacaoImovelDTO); // Voltando  Resposta de arrecadação

          if(dados.arrecadacaoImovelDTO != null){
            /*
            * Aqui eu seto os campos Input do HTML para receber a resposta de requisição GET Arrecadaçcao Imovel DTO
              Tiago Ribeiro Santos
            */
            this.formAcompanhamento.controls.agenciaArrecadora.setValue(dados.arrecadacaoImovelDTO.agenciaArrecadadora);
            this.formAcompanhamento.controls.agenteArrecador.setValue(dados.arrecadacaoImovelDTO.agenteArrecadador);
            this.formAcompanhamento.controls.contaCorrente.setValue(dados.arrecadacaoImovelDTO.contaCorrente);
            this.formAcompanhamento.controls.dataInclusaoD.setValue(dados.arrecadacaoImovelDTO.dataInclusaoD);
        }else{
          if(dados.arrecadacaoImovelDTO == null){
            this.mensagemAlerta('Essa Matrícula não possui Dados de Arrecadação de Imóvel.');
          }
        }
      }
    );
    this.loading();
  }
  /**
   * Faz a requisição que carrega o dropdown de localidades.
   */
  carregaListaLocalidades() {
    this.servicos.getListaLocalidades().subscribe(
      (dados: Localidade[]) => {
        this.listaLocalidades = dados;
        // Informa a conclusão da requisição
        this.servicos.addLoadingCounter(0);
      },
      (e: HttpErrorResponse) => {
        // Repassa o erro para o usuário
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          if (e.error.tituloStatus) {
            this.mensagemErro(e.error.tituloStatus);
          } else {
            this.mensagemErro(e.statusText);
          }
        }
        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(0);
      }
    );
  }


  /**
   * Faz a requisição que carrega o dropdown de atividades macro.
   */
  carregaListaAtividadesMacro() {
    this.servicos.getListaAtividadesMacro().subscribe(
      (dados: AtividadeMacro[]) => {
        // Povoa o dropdown...
        this.listaAtividadesMacro = dados;
        // E informa a conclusão da requisição
        this.servicos.addLoadingCounter(0);
      },
      (e: HttpErrorResponse) => {
        // Repassa o erro para o usuário
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          if (e.error.tituloStatus) {
            this.mensagemErro(e.error.tituloStatus);
          } else {
            this.mensagemErro(e.statusText);
          }
        }
        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(0);
      }
    );
  }





  /**
   * Faz a requisição que carrega o dropdown de categorias de grupos de consumo.
   */
  carregaListaCategoriasGruposConsumo() {
    this.servicos.getListaCategoriaGruposConsumo().subscribe(
      (dados: CategoriaGrupoConsumo[]) => {
        // Povoa o dropdown...
        this.listaCategorias = dados;
        // E informa a conclusão da requisição
        this.servicos.addLoadingCounter(0);
      },
      (e: HttpErrorResponse) => {
        // Repassa o erro para o usuário
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          if (e.error.tituloStatus) {
            this.mensagemErro(e.error.tituloStatus);
          } else {
            this.mensagemErro(e.statusText);
          }
        }
        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(0);
      }
    );
  }

  /**
   * Faz a requisição que carrega o dropdown de grupos de consumo.
   */
  carregaListaGruposConsumo() {
    this.servicos.getListaGruposConsumo().subscribe(
      (dados: GrupoConsumo[]) => {
        // Povoa o dropdown...
        this.listaGruposConsumo = dados;
        // E informa a conclusão da requisição
        this.servicos.addLoadingCounter(0);
      },
      (e: HttpErrorResponse) => {
        // Repassa o erro para o usuário
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          if (e.error.tituloStatus) {
            this.mensagemErro(e.error.tituloStatus);
          } else {
            this.mensagemErro(e.statusText);
          }
        }
        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(0);
      }
    );
  }

  /**
   * Método de pesquisa de classificação imobiliária.
   */
  pesquisarClassImo() {
    // Pesquisa a classificação imobiliária


    this.pesquisarPagina1(null, null);



  }


  /**
   * Executa as chamadas ao serviço de pesquisa de classificação imobiliária.
   */
  pesquisarPagina1(pagina, itensPorPagina) {
    // Se não for a carga inicial da tabela, sobe a tela de loading.
    if (!this.isLoading) {
      this.loading();
      this.servicos.addLoadingCounter(0);
      this.servicos.addLoadingCounter(0);
      this.servicos.addLoadingCounter(0);
      this.servicos.addLoadingCounter(0);
    }
    // Faz a requisição
    this.pesquisarObservablePagina1(pagina, itensPorPagina).subscribe(

      (dados: ClassificacaoImobiliariaEnvelope) => {
        console.log('Lista de classificações imobiliárias:');
        console.log(dados);

        this.configuracaoTabela1.listaRegistros = dados.classificacaoImobiliariaDTO;

        this.listaClassificacoes = [];

        this.totalEconomias = 0;

        this.configuracaoTabela1.listaRegistros.forEach(
          (element: ClassificacaoImobiliaria) => {
            this.listaClassificacoes[element.idClassificacaoImobiliaria] = element;
            // Calcula predominância
            this.totalEconomias += (Number)(element.economias);
            if (element.predominante) {
              this.predominante = element;
            }
          });

        if (dados.totalRegistros !== 'null') {
          this.configuracaoTabela1.numeroRegistros = parseInt(dados.totalRegistros, 0);
          if (this.configuracaoTabela1.numeroRegistros === 0) {
            this.mensagemAlerta('Imóvel não encontrado.');
          }
        }

        // Informa a conclusão da requisição
        this.servicos.addLoadingCounter(0);

      },

      (e: HttpErrorResponse) => {
        // Repassa o erro para o usuário
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          if (e.error.tituloStatus) {
            this.mensagemErro(e.error.tituloStatus);
          } else {
            this.mensagemErro(e.statusText);
          }
        }
        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(0);
      }

    );
  }



  /**
   * Responsável por fazer a requisição ao backend. (Tabela de classificação imobiliária)
   */
  pesquisarObservablePagina1(pagina, itensPorPagina): Observable<ClassificacaoImobiliariaEnvelope> {
    if (pagina == null) {
      pagina = 0;
    }

    if (itensPorPagina == null) {
      itensPorPagina = this.configuracaoTabela1.itensPorPagina.valor;
    }

    this.configuracaoTabela1.pesquisa = true;

    return this.servicos.getClassificacaoImobiliaria(
      this.matriculaImovel.value, pagina, itensPorPagina,
      this.configuracaoTabela1.campoOrdenacaoTabela, this.configuracaoTabela1.direcaoOrdenacaoTabela
    );
  }

  /**
   * Responsável por fazer a requisição ao backend.(Tabela de beneficiários)
   */
  pesquisarObservablePagina2(pagina, itensPorPagina): Observable<any> {
    if (pagina == null) {
      pagina = 0;
    }

    if (itensPorPagina == null) {
      itensPorPagina = this.configuracaoTabela2.itensPorPagina.valor;
    }

    this.configuracaoTabela2.pesquisa = true;

    return this.servicos.getBeneficiarios(
      this.matriculaImovel.value, pagina, itensPorPagina,
      this.configuracaoTabela2.campoOrdenacaoTabela, this.configuracaoTabela2.direcaoOrdenacaoTabela
    );
  }

  /**
   * Tratamento do evento de carregamento da tabela de beneficiários.ng
   * Ao trocar de página, uma nova requisição deve ser feita.
   * @param event Evento disparado pela tabela com as informações da pagina a ser carregada.
   */
  carregarPaginaTabela2(event: LazyLoadEvent) {
    if (!this.configuracaoTabela2.pesquisa) {
      return;
    }

    if (event.sortField !== undefined) {
      this.configuracaoTabela2.campoOrdenacaoTabela = event.sortField;
    }

    if (event.sortOrder !== undefined) {

      if (event.sortOrder === 1) {
        this.configuracaoTabela2.direcaoOrdenacaoTabela = 'ASC';
      } else {
        this.configuracaoTabela2.direcaoOrdenacaoTabela = 'DESC';
      }

    }

    this.configuracaoTabela2.paginaAtual = (event.first / this.configuracaoTabela2.itensPorPagina.valor);



  }

  onRowEditInit(classificacao: ClassificacaoImobiliaria) {
    this.listaClassificacoes[classificacao.idClassificacaoImobiliaria] = { ...classificacao };
    this.listaGruposConsumoAux[classificacao.dcGrupoConsumo] = this.listaGruposConsumo.find(grupo => grupo.dcGrupoConsumo === classificacao.dcGrupoConsumo);
  }

  

 

 
 

  /**
   * Método para efetuar a pesquisa quando pressionada a tecla Enter
   * @param event
   */
  onKeydown(event) {
    if (event.key === 'Enter') {
      this.pesquisar();
    }
  }
}
