// Angular
import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, Observable } from 'rxjs';

// PrimeNG
import { Table } from 'primeng/table';
import { MessageService, LazyLoadEvent } from 'primeng/api';

// Modelos
import { ConfiguracaoTabelaPesquisa } from 'src/app/core/models/configuracaoTabelaPesquisa.model';

// Serviços
import { AtualizacaoLigacoesEsgotoLoteService, MonitoramentoEnvelope, LigacaoEsgotoLoteStatusDTO, RegistroMonitorado, ResultadoEnvelope } from '../ligacoes-esgoto-lote.service';
import { ConfiguracaoService } from 'src/app/core/services/configuracao.service';
import { EstadoFormularioService } from 'src/app/core/services/estado-formulario.service';

// Constantes
import { TEMPO_VIDA_MENSAGEM } from 'src/environments/environment';

/**
 * Componente responsável pela exibição da etapa de acompanhamento da tela de cadastro de lacre do padrão em lote.
 * @author Raphael
 */
@Component({
  selector: 'app-ligacao-acompanhamento',
  templateUrl: './ligacao-acompanhamento.component.html',
  styleUrls: ['./ligacao-acompanhamento.component.scss']
})
export class LigacaoAcompanhamentoComponent implements OnInit, AfterViewInit, OnDestroy {
  processamentoArray: Array<LigacaoEsgotoLoteStatusDTO>;
  //Array com Informações de Arquivo Processado.
   infoProcessamento:Array<LigacaoEsgotoLoteStatusDTO>;
   infoProcessamento2:Array<LigacaoEsgotoLoteStatusDTO>;
  /**
   * Subscription permanente para o evento de loading. Inicializado no construtor e encerrado em ngOnDestroy.
   */
  private loadingSubscription: Subscription;

  /**
   * Flag que informa se o componente está sendo carregado ou não.
   */
  isLoading = true;

  /**
   * Armazena todas as configurações e valores do grid de monitoramento.
   */
  configuracaoTabela1: ConfiguracaoTabelaPesquisa = new ConfiguracaoTabelaPesquisa();

  /**
   * Armazena todas as configurações e valores do grid de resultados.
   */
  configuracaoTabela2: ConfiguracaoTabelaPesquisa = new ConfiguracaoTabelaPesquisa();

  /**
   * Identificador da tela no local storage
   */
  ID_TELA = 'cadastro/ligacaoEsgotoLote:monitoramento';

  /**
   * A tabela de dados
   */
  @ViewChild('tabelaMonitoramento', null)
  tabelaDados1: Table;

  /**
   * A tabela de dados
   */
  @ViewChild('tabelaResultado', null)
  tabelaDados2: Table;


  /**
   * Inicializa a inscrição do evento de fim de loading.
   * @param cdr Serviço detector de mudanças no View.
   * @param msgs Serviço de mensageria do PrimeNG.
   * @param servicos Serviço principal da tela de 'Lacre do Padrão em Lote'.
   * @param config Serviço com configuração gerais do sistema.
   * @param estadoTabela Serviço responsável por guarda o estado do formulário no localstorage.
   * @param datePipe Pipe para formatar data/hora.
   */
  constructor(
    private cdr: ChangeDetectorRef,
    private msgs: MessageService,
    private servicos: AtualizacaoLigacoesEsgotoLoteService,
    private config: ConfiguracaoService,
    private estadoTabela: EstadoFormularioService,
    private datePipe: DatePipe,
  ) {
    // Subscription para monitorar as requisições que devem ser carregadas ao se abrir a tela.
    // Usado para sinalizar o fim do carregamento da tela.
    this.loadingSubscription = this.servicos.getLoadingNews(2).subscribe(
      (resposta: number) => {
        // Se há duas requisições finalizadas, a tela terminou de carregar.
        if (resposta === 2) {
          this.servicos.resetLoadingCounter(2);
          // Componente carregado, remove a tela de loading.
          this.loading();
          // Força detecção de mudanças no View
          this.cdr.detectChanges();
        }
      }
    );

    // Seta as configurações básicas das tabelas
    this.configuracaoTabela1.campoOrdenacaoTabela = 'matriculaImovel';
    this.configuracaoTabela1.direcaoOrdenacaoTabela = 'DESC';
    this.configuracaoTabela2.campoOrdenacaoTabela = 'matriculaImovel';
    this.configuracaoTabela2.direcaoOrdenacaoTabela = 'DESC';
  }

  /**
   * ngOnInit dispara depois do construtor, mas antes do View ser carregado.
   */
  ngOnInit() {
  }

  /**
   * Dispara após o View terminar de ser carregado.
   */
  ngAfterViewInit() {
    // Inicializa a tabela de monitoramento
   
    this.servicos.getStatusProcessamento()
      .subscribe(
        (valor) =>{
          //Armazena resposta do server.
          this.processamentoArray = valor;
          console.log(this.processamentoArray);
        },
        error =>{
          alert(`O arquivo não foi processado corretamente!`);
        }
      );

    this.recuperarTabela1();

   
    // Inicializa a tabela de resultados
    this.recuperarTabela2();

    this.cdr.detectChanges();
  }

  //Respota da Crítica vou usar para processamento.

  /**
   * Método chamado antes da destruição do componente. Remove inscrições de eventos.
   */
  ngOnDestroy(): void {
    this.loadingSubscription.unsubscribe();
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
      this.msgs.add({ severity: 'success', summary: 'Sucesso', detail: str, life: TEMPO_VIDA_MENSAGEM});
    }, 1000);
  }

  /**
   * Exibe uma mensagem de erro.
   * @param str Texto da mensagem.
   */
  mensagemErro(str: string) {
    setTimeout(() => {
      this.msgs.add({ severity: 'error', summary: 'Erro', detail: str, life: TEMPO_VIDA_MENSAGEM});
    }, 1000);
  }

  /**
   * Exibe uma mensagem de alerta.
   * @param str Texto da mensagem.
   */
  mensagemAlerta(str: string) {
    setTimeout(() => {
      this.msgs.add({ severity: 'warn', summary: 'Aviso', detail: str, life: TEMPO_VIDA_MENSAGEM});
      }, 1000);
  }

  /**
   * Exibe uma mensagem de informação.
   * @param str Texto da mensagem.
   */
  mensagemInformacao(str: string) {
    setTimeout(() => {
      this.msgs.add({ severity: 'info', summary: 'Mensagem', detail: str, life: TEMPO_VIDA_MENSAGEM});
      }, 1000);
  }

  /**
   * Tabela de monitoramento: Carrega a tabela com o último estado salvo se existir.
   */
  recuperarTabela1() {
    const estadoTabelaDados = this.estadoTabela.recuperarEstadoTabela(this.ID_TELA + '_TABELA1');

    if (estadoTabelaDados.existemDados) {
      this.configuracaoTabela1.paginaAtual = estadoTabelaDados.paginaSelecionada;
      this.configuracaoTabela1.itensPorPagina = estadoTabelaDados.itensPorPagina;

      this.pesquisarPagina1(
        this.configuracaoTabela1.paginaAtual,
        this.configuracaoTabela1.itensPorPagina.valor
      );

      this.tabelaDados1.first = estadoTabelaDados.paginaSelecionada * estadoTabelaDados.itensPorPagina.valor;
    } else {
      this.pesquisar1();
    }
  }

  /**
   * Tabela de resultados: Carrega a tabela com o último estado salvo se existir.
   */
  recuperarTabela2() {
    const estadoTabelaDados = this.estadoTabela.recuperarEstadoTabela(this.ID_TELA + '_TABELA2');

    if (estadoTabelaDados.existemDados) {
      this.configuracaoTabela2.paginaAtual = estadoTabelaDados.paginaSelecionada;
      this.configuracaoTabela2.itensPorPagina = estadoTabelaDados.itensPorPagina;

      this.pesquisarPagina2(
        this.configuracaoTabela2.paginaAtual,
        this.configuracaoTabela2.itensPorPagina.valor
      );

      this.tabelaDados2.first = estadoTabelaDados.paginaSelecionada * estadoTabelaDados.itensPorPagina.valor;
    } else {
      this.pesquisar2();
    }
  }

  /**
   * Tabela de monitoramento: Método disparado quando o valor do dropdown de número de registros por página é alterado.
   * @param $event Evento disparado pelo dropdown.
   */
  numeroRegistrosChange1($event) {
    // Se o número de registros por página mudar, refaz a pesquisa
    this.pesquisar1();
  }

  /**
   * Tabela de resultados: Método disparado quando o valor do dropdown de número de registros por página é alterado.
   * @param $event Evento disparado pelo dropdown.
   */
  numeroRegistrosChange2($event) {
    // Se o número de registros por página mudar, refaz a pesquisa
    this.pesquisar2();
  }

  /**
   * Tabela de monitoramento: Inicia a cadeia de processos necessários para uma consulta ao banco de dados.
   */
  pesquisar1() {
    this.tabelaDados1.first = 0;
    this.pesquisarPagina1(null, null);
  }

  /**
   * Tabela de resultados: Inicia a cadeia de processos necessários para uma consulta ao banco de dados.
   */
  pesquisar2() {
    this.tabelaDados2.first = 0;
    this.pesquisarPagina2(null, null);
  }

  /**
   * Tabela de monitoramento: Executa as chamadas ao serviço de pesquisa.
   */
  pesquisarPagina1(pagina, itensPorPagina) {
    // Se não for a carga inicial da tabela, sobe a tela de loading.
    if ( !this.isLoading ) {
      this.loading();
      this.servicos.addLoadingCounter(2);
    }

    // Faz a requisição ao backend
    this.pesquisarObservablePagina1(pagina, itensPorPagina).subscribe(

      (dados: LigacaoEsgotoLoteStatusDTO) => {
        //Aqui exibo tudo o que estiver na listade Registros.
        this.infoProcessamento2 = new Array<LigacaoEsgotoLoteStatusDTO>();
        this.infoProcessamento2.push(dados);
        console.log(this.infoProcessamento2);


        this.configuracaoTabela1.listaRegistros =  this.infoProcessamento2;
        console.log(this.configuracaoTabela1.listaRegistros);

        this.configuracaoTabela1.numeroRegistros = this.infoProcessamento2.length;
        console.log(this.configuracaoTabela1.numeroRegistros);

        //Tamanho de registros encontrados

        if (this.configuracaoTabela1.numeroRegistros === 0) {
          this.mensagemAlerta('Não foram encontrados registros para exibir na tabela.');
        }

        // Informa a conclusão da requisição
        this.servicos.addLoadingCounter(2);

      },

      (e: HttpErrorResponse) => {

        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(2);
        // Exibe a mensagem de erro para o usuário
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          this.mensagemErro(e.error.tituloStatus);
        }

      }
    );

  }

  /**
   * Tabela de resultados: Executa as chamadas ao serviço de pesquisa.
   */
  pesquisarPagina2(pagina, itensPorPagina) {
    // Se não for a carga inicial da tabela, sobe a tela de loading.
    if ( !this.isLoading ) {
      this.loading();
      this.servicos.addLoadingCounter(2);
    }
    // Faz a requisição ao backend
    this.pesquisarObservablePagina2(pagina, itensPorPagina).subscribe(

      (dados: LigacaoEsgotoLoteStatusDTO) => {
        console.log(dados);
        console.log(typeof(dados));
        this.infoProcessamento = new Array<LigacaoEsgotoLoteStatusDTO>();
        this.infoProcessamento.push(dados);
        console.log(this.infoProcessamento);
        this.configuracaoTabela2.listaRegistros =  this.infoProcessamento;
        
        //this.configuracaoTabela2.numeroRegistros = this.infoProcessamento.length;

        if (this.configuracaoTabela2.numeroRegistros === 0) {
          this.mensagemAlerta('Não foram encontrados registros para exibir na tabela.');
        }

        // Informa a conclusão da requisição
        this.servicos.addLoadingCounter(2);

      },

      (e: HttpErrorResponse) => {

        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(2);
        // Exibe a mensagem de erro para o usuário
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          this.mensagemErro(e.error.tituloStatus);
        }

      }
    );

  }

  /**
   * Tabela de monitoramento: Executa as chamadas ao serviço de pesquisa.
   */
  pesquisarObservablePagina1(pagina, itensPorPagina): Observable<any> {

    this.estadoTabela.salvarEstadoTabela(
      {
        existemDados: true,
        paginaSelecionada: pagina,
        itensPorPagina: this.configuracaoTabela1.itensPorPagina
      }
      , this.ID_TELA + '_TABELA1'
    );

    if (pagina == null) {
      pagina = 0;
    }

    if (itensPorPagina == null) {
      itensPorPagina = this.configuracaoTabela1.itensPorPagina.valor;
    }

    this.configuracaoTabela1.pesquisa = true;

    return this.servicos.getTabelaMonitoramento(
      pagina, itensPorPagina, this.configuracaoTabela1.campoOrdenacaoTabela, this.configuracaoTabela1.direcaoOrdenacaoTabela
    );
  }

  /**
   * Tabela de resultados: Executa as chamadas ao serviço de pesquisa.
   */
  pesquisarObservablePagina2(pagina, itensPorPagina): Observable<any> {

    this.estadoTabela.salvarEstadoTabela(
      {
        existemDados: true,
        paginaSelecionada: pagina,
        itensPorPagina: this.configuracaoTabela2.itensPorPagina
      }
      , this.ID_TELA + '_TABELA2'
    );

    if (pagina == null) {
      pagina = 0;
    }

    if (itensPorPagina == null) {
      itensPorPagina = this.configuracaoTabela2.itensPorPagina.valor;
    }

    this.configuracaoTabela2.pesquisa = true;

    return this.servicos.getTabelaResultados(
      pagina, itensPorPagina, this.configuracaoTabela2.campoOrdenacaoTabela, this.configuracaoTabela2.direcaoOrdenacaoTabela
    );
  }

  /** Em PROCESSAMENTO (TABELA)
   * Tabela de monitoramento: Tratamento do evento de carregamento da tabela.
   * Ao trocar de página, uma nova requisição deve ser feita.
   * @param event Evento disparado pela tabela com as informações da pagina a ser carregada.
   */
  carregarPaginaTabela1(event: LazyLoadEvent) {
    if (!this.configuracaoTabela1.pesquisa) {
      return;
    }

    if (event.sortField !== undefined) {
      this.configuracaoTabela1.campoOrdenacaoTabela = event.sortField;
    }

    if (event.sortOrder !== undefined) {

      if (event.sortOrder === 1) {
        this.configuracaoTabela1.direcaoOrdenacaoTabela = 'ASC';
      } else {
        this.configuracaoTabela1.direcaoOrdenacaoTabela = 'DESC';
      }

    }

    this.configuracaoTabela1.paginaAtual = (event.first / this.configuracaoTabela1.itensPorPagina.valor);
    this.pesquisarPagina1( this.configuracaoTabela1.paginaAtual, this.configuracaoTabela1.itensPorPagina.valor );

  }

  /**
   * Tabela de resultados: Tratamento do evento de carregamento da tabela.
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

    this.pesquisarPagina2( this.configuracaoTabela2.paginaAtual, this.configuracaoTabela2.itensPorPagina.valor );

  }

  /**
   * Método responsável por exportar o arquivo formato CSV com os dados do grid de monitoramento.
   */
  gerarCSV1() {
    // Subir a tela de loading antes da requisição
    if ( !this.isLoading ) {
      this.loading();
      this.servicos.addLoadingCounter(2);
    }

    // Faz a pesquisa sem restrição de paginação
    this.pesquisarObservablePagina1(0, this.configuracaoTabela1.numeroRegistros).subscribe(

      (dados: MonitoramentoEnvelope) => {

        // Adiciona a informação do usuário, data e hora
        let csv = this.config.gerarLinhaArquivoCsv(
          [
            this.config.gerarCabecalhoCSV()
          ], ';', true);

        // Adiciona o cabeçalho das colunas
        csv += this.config.gerarLinhaArquivoCsv(
          [
            'Data Fim Processo',
            'Data Inicio Processo',
            'Status',
            'Último Arquivo Executado',
          ], ';', false);

        // Inicia-se a gravação dos dados
        dados.listServicoAtendimentoProcessamentoDTO.forEach(registro => {

          csv += this.config.gerarLinhaArquivoCsv(
            [
              this.datePipe.transform(registro.dataHoraFimProcesso, 'dd/MM/yyyy'),
              this.datePipe.transform(registro.dataHoraInicioProcesso, 'dd/MM/yyyy'),
              registro.status,
              registro.ultimoArquivoExecutado,
            ]
            , ';', false
          );
        });


        this.config.fazerDownload(csv, 'monitoramento_ligacao-esgoto.csv');

        // Confirma o fim da requisição.
        this.servicos.addLoadingCounter(2);

      },
      (e: HttpErrorResponse) => {

        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(2);
        // Exibe a mensagem de erro para o usuário
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          this.mensagemErro(e.error.tituloStatus);
        }

      }

    );
  }

  /**
   * Método responsável por exportar o arquivo formato CSV com os dados do grid de resultados do processamento.
   */
  gerarCSV2() {
    // Subir a tela de loading antes da requisição
    if ( !this.isLoading ) {
      this.loading();
      this.servicos.addLoadingCounter(2);
    }
    // Faz a pesquisa sem restrição de paginação
    this.pesquisarObservablePagina2(0, this.configuracaoTabela2.numeroRegistros).subscribe(

      (dados: MonitoramentoEnvelope) => {
      
        // Adiciona a informação do usuário, data e hora
        let csv = this.config.gerarLinhaArquivoCsv(
          [
            this.config.gerarCabecalhoCSV()
          ], ';', true);

        // Adiciona o cabeçalho das colunas
        csv += this.config.gerarLinhaArquivoCsv(
          [
            'Data Fim Processo',
            'Data Inicio Processo',
            'Status',
            'Último Arquivo Executado',
          ], ';', false);

        // Inicia-se a gravação dos dados
        dados.listServicoAtendimentoProcessamentoDTO.forEach( registro => {

          csv += this.config.gerarLinhaArquivoCsv(
            [
              this.datePipe.transform(registro.dataHoraFimProcesso, 'dd/MM/yyyy'),
              this.datePipe.transform(registro.dataHoraInicioProcesso, 'dd/MM/yyyy'),
              registro.status,
              registro.ultimoArquivoExecutado,
            ]
            , ';', false
          );
        });


        this.config.fazerDownload(csv, 'resultado_processamento_ligacao-esgoto.csv');

        // Confirma o fim da requisição.
        this.servicos.addLoadingCounter(2);

      },
      (e: HttpErrorResponse) => {

        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(2);
        // Exibe a mensagem de erro para o usuário
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          this.mensagemErro(e.error.tituloStatus);
        }

      }

    );
  }

}
