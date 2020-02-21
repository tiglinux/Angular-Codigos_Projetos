// Angular
import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Subscription, Observable } from 'rxjs';

// PrimeNG
import { Table } from 'primeng/table';
import { MessageService, Message, LazyLoadEvent } from 'primeng/api';

// Componentes
import { LigacoesEsgotoLoteComponent } from '../ligacoes-esgoto-lote.component';

// Modelos
import { ConfiguracaoTabelaPesquisa } from 'src/app/core/models/configuracaoTabelaPesquisa.model';
import { ControlePermissoesModel } from 'src/app/core/models/controle-permissoes.model';
import { TransacaoModel } from 'src/app/core/models/transacao.model';
import { ComponenteModel } from 'src/app/core/models/componente.model';
import { StatusCritica, CriticaEnvelope, LigacaoEsgotoLoteStatusDTO } from '../ligacoes-esgoto-lote.service';

// Serviços
import { AtualizacaoLigacoesEsgotoLoteService } from '../ligacoes-esgoto-lote.service';
import { ConfiguracaoService } from 'src/app/core/services/configuracao.service';
import { EstadoFormularioService } from 'src/app/core/services/estado-formulario.service';
import { AutenticacaoService } from 'src/app/core/services/autenticacao.service';
import { LigacoesEsgotoLoteDTO} from '../ligacoes-esgoto-lote.service';

// Constantes
import { TEMPO_VIDA_MENSAGEM, TRANSACAO_CADASTRO_LACRE_LOTE } from 'src/environments/environment';


/**
 * Componente responsável pela exibição do carregamento de importação do arquivo excel na tela de Validação.
 * @author Tiago Ribeiro Santos
 */
@Component({
  selector: 'app-ligacao-validacao',
  templateUrl: './ligacao-validacao.component.html',
  styleUrls: ['./ligacao-validacao.component.scss']
})
export class LigacaoEsgotoValidacaoComponent implements OnInit, AfterViewInit, OnDestroy {
  funcaoDataVistoria :void;
  arrayDataVistoria : Array<Date>;

  dataVistoriaAux:any;

  ligacaoEsgotoLote: LigacaoEsgotoLoteStatusDTO;

  //Flag de Processando para saber se existe um arquivo sendo processado ou não do tipo boolean.
  processando:boolean = true;

  status:string;

  /*Data formatada que irá receber do Back e com formatação própria de Data */
  dataVistoriaFormatada:Array<string>;

  /**
   * Subscription permanente para o evento de loading. Inicializado no construtor e encerrado em ngOnDestroy.
   */
  private loadingSubscription: Subscription;

  /**
   * Flag que informa se o componente está sendo carregado ou não.
   */
  isLoading = true;

  /**
   * Armazena todas as configurações e valores do grid.
   */
  configuracaoTabela: ConfiguracaoTabelaPesquisa = new ConfiguracaoTabelaPesquisa();
  /**
   * Identificador da tela no local storage
   */
  ID_TELA = 'cadastro/ligacaoEsgotoLote:validacao';

  /**
   * A tabela de dados
   */
  @ViewChild('tabelaCriticas', null)
  tabelaDados: Table;

  /**
   * Armazena a mensagem de aviso para o status da crítica
   */
  message: Message[];

  /**
   * Número total de registros com críticas.
   */
  totalCriticas = 0;

  /**
   * Armeza os valores que irão decidir como as permissões de acesso do usuário logado afetam o que é
   * mostrado em tela.
   */
  controlePermissoes: ControlePermissoesModel[];

  /**
   * Lista das transações e seus respectivos componentes e exceções às regras que o usuário logado possui
   * acesso.
   */
  private credencialUsuario: TransacaoModel[];
  date: Date;

  /**
   * O construtor é responsável por inicializar as permissões de acesso com seus valores default e providenciar
   * acesso aos serviços usados pelo componente.
   * @param cdr Serviço detector de mudanças no View.
   * @param msgs Serviço de mensageria do PrimeNG.
   * @param servicos Serviço principal da tela de 'Lacre do Padrão em Lote'.
   * @param config Serviço com configuração gerais do sistema.
   * @param estadoTabela Serviço responsável por guarda o estado do formulário no localstorage.
   * @param host Componente host.
   * @param dataPipe Pipe para formatar data/hora.
   * @param autentica Serviço de autenticação do usuário logado.
   */
  constructor(
    private cdr: ChangeDetectorRef,
    private msgs: MessageService,
    private servicos: AtualizacaoLigacoesEsgotoLoteService,
    private config: ConfiguracaoService,
    private estadoTabela: EstadoFormularioService,
    private host: LigacoesEsgotoLoteComponent,
    private datePipe: DatePipe,
    private autentica: AutenticacaoService
  ) {
    // Subscription para monitorar as requisições que devem ser carregadas ao se abrir a tela.
    // Usado para sinalizar o fim do carregamento da tela.
    this.loadingSubscription = this.servicos.getLoadingNews(1).subscribe(
      (resposta: number) => {
        // Se há duas requisições finalizadas, a tela terminou de carregar.
        if (resposta === 2) {
          this.servicos.resetLoadingCounter(1);
          // Componente carregado, remove a tela de loading.
          this.loading();
          // Força detecção de mudanças no View
          this.cdr.detectChanges();
        }
      }
    );

    // Seta as configurações básicas da tabela
    this.configuracaoTabela.campoOrdenacaoTabela = 'matriculaImovel';
    this.configuracaoTabela.direcaoOrdenacaoTabela = 'DESC';

    // Inicializa as permissões default e as atualiza com os dados do usuário logado.
    this.inicializaPermissoes();
  }

  /**
   * ngOnInit dispara depois do construtor, mas antes do View ser carregado.
   */
  ngOnInit() {
    // Ativa as permissões
    this.ativaPermissoes();

    // Ativa as exceções às regras para cada transação
    this.controlePermissoes.forEach((transacao: ControlePermissoesModel) => {
      transacao.excecoes.forEach((index: number) => {
        this.ativaExcecoes(index);
      });
    });
  }

  /**
   * Dispara após o View terminar de ser carregado.
   */
  ngAfterViewInit() {
    // Carrega aviso de lote em processamento
    this.checaBackground();

    //Get no StatusCritica Apresenta valor do resultado da requisição GET de Status Crítica.
    this.servicos.consultarStatusArquivoProcessadoCriticar()
      .subscribe(
        valor =>{
          //Armazena resposta do server.
          this.ligacaoEsgotoLote = valor;
          console.log(this.ligacaoEsgotoLote);
        },
        erro  =>{
          alert(`O arquivo não foi processado corretamente!`);
        }
      );


    // Inicializa a tabela de críticas
    this.carregarTabela();
  }

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
   * Faz a requisição para o backend para checar se há críticas sendo geradas ou não e se houver informa o usuário.
   */
  checaBackground() {
    this.servicos.getStatusCriticas().subscribe(
      (resposta: StatusCritica) => {
        // Atualiza a flag com a resposta da requisição e informa o usuário, caso necessário
        console.log(resposta.status);//String = 'Processando
        if ( resposta.status =='Processando') { // if status está processando. //Verifica se resposta.status ='Processando'
          this.status = resposta.status;
          this.message = [];
          this.message.push({key: 'info', severity: 'info', summary: 'Informativo', detail: 'Há um lote de críticas sendo processado. Clique na aba Importação e depois volte a aba Validação novamente.'});
        }
      
        // Informa a conclusão da requisição
        this.servicos.addLoadingCounter(1);
      },
      (e: HttpErrorResponse) => {
        // Exibe a mensagem de erro
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          this.mensagemErro(e.error.tituloStatus);
        }
        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(1);
      }
    );
  }

  /**
   * Carrega a tabela com o último estado salvo se existir.
   */
  carregarTabela() {
    const estadoTabelaDados = this.estadoTabela.recuperarEstadoTabela(this.ID_TELA + '_TABELA');

    if (estadoTabelaDados.existemDados) {
      this.configuracaoTabela.paginaAtual = estadoTabelaDados.paginaSelecionada;
      this.configuracaoTabela.itensPorPagina = estadoTabelaDados.itensPorPagina;

      this.pesquisarPagina(
        this.configuracaoTabela.paginaAtual,
        this.configuracaoTabela.itensPorPagina.valor
      );

      this.tabelaDados.first = estadoTabelaDados.paginaSelecionada * estadoTabelaDados.itensPorPagina.valor;
    } else {
      this.pesquisar();
    }
  }

  /**
   * Inicia a cadeia de processos necessários para uma consulta ao banco de dados.
   */
  pesquisar() {
    this.tabelaDados.first = 0;
    this.pesquisarPagina(null, null);
  }

  /**
   * Executa as chamadas ao serviço de pesquisa.
   */
  pesquisarPagina(pagina, itensPorPagina) {
    // Se não for a carga inicial da tabela, sobe a tela de loading.
    if ( !this.isLoading ) {
      this.loading();
      this.servicos.addLoadingCounter(1);
    }
    // Faz a requisição ao backend
    this.pesquisarObservablePagina(pagina, itensPorPagina).subscribe(

      (dados: LigacaoEsgotoLoteStatusDTO) => {
        //Trabalhar Data. falta.
        this.funcaoDataVistoria = dados.ligacaoEsgotoLote.forEach(vistoria =>{
          console.log(vistoria['dataVistoria']); // 2019/02/10 -> 20190210

        });
       
        console.log(this.arrayDataVistoria); 


        this.configuracaoTabela.listaRegistros =  dados.ligacaoEsgotoLote; // undefined
        console.log(this.configuracaoTabela.listaRegistros);

        this.configuracaoTabela.numeroRegistros = dados.ligacaoEsgotoLote.length;
        
        console.log(this.configuracaoTabela.numeroRegistros);
        //this.totalCriticas = dados.totalCriticas;

        if (this.configuracaoTabela.numeroRegistros === 0) {
          this.mensagemAlerta('Não foram encontrados registros para exibir na tabela.');
        }
        // Informa a conclusão da requisição
        this.servicos.addLoadingCounter(1);

      },

      (e: HttpErrorResponse) => {
        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(1);
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          this.mensagemErro(e.error.tituloStatus);
        }
      }

    );
  }
  formatarData(dataVistoria){
    let latest_date =this.datePipe.transform(dataVistoria, 'yyyy-MM-dd');

    
    return latest_date;
  }

  /**
   * Executa as chamadas ao serviço de pesquisa.
   */
  pesquisarObservablePagina(pagina, itensPorPagina): Observable<LigacaoEsgotoLoteStatusDTO> {
    this.estadoTabela.salvarEstadoTabela(
      {
        existemDados: true,
        paginaSelecionada: pagina,
        itensPorPagina: this.configuracaoTabela.itensPorPagina
      }
      , this.ID_TELA + '_TABELA'
    );

    if (pagina == null) {
      pagina = 0;
    }

    if (itensPorPagina == null) {
      itensPorPagina = this.configuracaoTabela.itensPorPagina.valor;
    }

    this.configuracaoTabela.pesquisa = true;

    return this.servicos.getTabelaCriticas(
      pagina, itensPorPagina, this.configuracaoTabela.campoOrdenacaoTabela, this.configuracaoTabela.direcaoOrdenacaoTabela
    );
  }

  /**
   * Tratamento do evento de carregamento da tabela.
   * Ao trocar de página, uma nova requisição deve ser feita.
   * @param event Evento disparado pela tabela com as informações da pagina a ser carregada.
   */
  carregarPaginaTabela(event: LazyLoadEvent) {
    if (!this.configuracaoTabela.pesquisa) {
      return;
    }


    if (event.sortField !== undefined) {
      this.configuracaoTabela.campoOrdenacaoTabela = event.sortField;
    }

    if (event.sortOrder !== undefined) {

      if (event.sortOrder === 1) {
        this.configuracaoTabela.direcaoOrdenacaoTabela = 'ASC';
      } else {
        this.configuracaoTabela.direcaoOrdenacaoTabela = 'DESC';
      }

    }

    this.configuracaoTabela.paginaAtual = (event.first / this.configuracaoTabela.itensPorPagina.valor);
    this.pesquisarPagina( this.configuracaoTabela.paginaAtual, this.configuracaoTabela.itensPorPagina.valor );

  }

  /**
   * Método disparado quando o valor do dropdown de número de registros por página é alterado.
   * @param $event Evento disparado pelo dropdown.
   */
  numeroRegistrosChange($event) {
    // Se o número de registros por página mudar, refaz a pesquisa
    this.pesquisar();
  }

  /**
   * Método responsável por exportar o arquivo formato CSV com os dados do grid de monitoramento.
   */
  gerarCSV() {
    // Sobe a tela de loading antes de fazer a requisição.
    this.loading();
    this.servicos.addLoadingCounter(1);
    // Faz a pesquisa sem restrição de paginação
    this.pesquisarObservablePagina(0, this.configuracaoTabela.numeroRegistros).subscribe(

      (dados: LigacaoEsgotoLoteStatusDTO) => {

        // Adiciona a informação do usuário, data e hora
        let csv = this.config.gerarLinhaArquivoCsv(
          [
            this.config.gerarCabecalhoCSV()
          ], ';', true);

        // Adiciona o cabeçalho das colunas
        csv += this.config.gerarLinhaArquivoCsv(
          [ 
            'ID',
            'ID Crítica',
            'Matrícula Imóvel',
            'Situação de Ligação do Esgoto',
            'Esgoto Tratado',
            'Data de Vistoria',
            'Mensagem Dôssie',
            'Suspensão Cobrança',
          ], ';', false);

        // Inicia-se a gravação dos dados
        dados.ligacaoEsgotoLote.forEach( registro => {
         

          csv += this.config.gerarLinhaArquivoCsv(
            [
              registro.id.toString(),
              registro.idCritica.toString(),
              registro.matriculaImovel.toString(),
              registro.sitLigacaoEsgoto,
              registro.esgotoTratado,
              registro.dataVistoria.toString(),
              registro.mensagemDossie,
              registro.suspCobrancaDisponibilidade,
              
            ]
            , ';', false
          );
          
        });


        this.config.fazerDownload(csv, 'ligacaoValidacao_criticas.csv');

        // Confirma o fim da requisição.
        this.servicos.addLoadingCounter(1);

      },
      (e: HttpErrorResponse) => {
        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(1);
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          this.mensagemErro(e.error.tituloStatus);
        }

      }

    );
  }


  /*formatarData(dataVistoria){
    
    return dataVistoria;
  }
*/
  
  /**
   * Método chamado pelo botão 'Retornar'. Navega para a etapa de importação.
   */
  retornar() {
    this.host.marcaImportacao();
  }

  /**
   * Método chamado pelo botão 'Confirmar'.
   * Chama a requisição para iniciar o processo de cadastro dos lacres de padrão sem crítica.
   */
  confirmaCadastro() {
    if (this.controlePermissoes[0].nivelAcesso < 2) {
      return;
    }
    if(this.status == 'Processando'){// Se status estiver como 'Processando' eu retorno nada e ele desativa o botão
      return;
    }else{ // Senão eu retorno como falso e ativo o botão.
      if(this.status =='Processado'){
        return false;
      }
    }
    // Caso não haja registros válidos, alerte o usuário
    if (this.configuracaoTabela.numeroRegistros - this.totalCriticas === 0) {
      this.mensagemErro('Não foi possível prosseguir. Todos os registros possuem críticas.');
      return;
    }
    // Sobe a tela de loading antes de fazer a requisição.
    this.loading();
    this.servicos.addLoadingCounter(1);
    //Aqui eu dou um put para processar o Registro de Tabela com a requisição para a API 'Processar'
    this.servicos.processarRegistroTabela(this.ligacaoEsgotoLote).subscribe(
      (resposta) =>{
        this.mensagemSucesso('Registros processados encaminhados para Acompanhamento.');
        this.servicos.addLoadingCounter(1);
      },
      (e: HttpErrorResponse) => {
        // Requisição concluída em erro, mas concluída. Informa a conclusão da requisição.
        this.servicos.addLoadingCounter(1);
        if (e.error.descricaoExcessao) {
          this.mensagemErro(e.error.descricaoExcessao);
        } else {
          this.mensagemErro(e.error.tituloStatus);
        }
      }
    );
  }

  /**
   * Inicializa os valores padrões dos componentes e em seguida atualiza tais valores com o que foi carregado
   * das informações do usuário logado.
   */
  inicializaPermissoes() {
    // Maioria das telas pertencerão à apenas uma transação, mas por garantia e escalabilidade, criaremos sempre um array
    this.controlePermissoes = new Array<ControlePermissoesModel>(1);
    this.controlePermissoes[0] = new ControlePermissoesModel();

    // Todas as transacoes (endpoints do backend e acessos externos) precisam estar cadastrados.
    this.controlePermissoes[0].transacao = TRANSACAO_CADASTRO_LACRE_LOTE;
    // 2 - Escrita; 1 - Leitura; 0 - Indisponível
    this.controlePermissoes[0].nivelAcesso = 2;
    // if(switchTransacao), então true == enabled
    this.controlePermissoes[0].switchTransacao = true;

    // Todos os componentes controlados pelo sistema devem estar cadastrados
    // 0 == indisponível, 1 == somente leitura, 2 == leitura e escrita
    this.controlePermissoes[0].componentes = [
      { idComponente: 'botaoConfirmar', nivelAcesso: 2 }   // 0
    ];
    // [disabled] = switchComponent, então true == disabled
    this.controlePermissoes[0].switchComponentes = [
      false  // 0
    ];

    // O default é não haver exceções à regra ativas, por isso a lista vazia
    this.controlePermissoes[0].excecoes = [];
    // *ngIf = switchExcecao, então true == enabled
    this.controlePermissoes[0].switchExcecao = [];

    // Lista as transações utilizadas neste componente
    const urlTrans: string[] = new Array(1);
    urlTrans[0] = this.controlePermissoes[0].transacao;
    // Depois carrega as permissões do usuário, se houver, para aquelas transações
    this.credencialUsuario = this.autentica.carregaCredenciaisUsuario(urlTrans);
    // Atualiza as permissões com base no que foi carregado do usuário
    this.atualizaPermissoes();
  }

  /**
   * Atualiza as permissões default com os valores do usuário logado.
   */
  atualizaPermissoes() {
    // Se o usuário possui credenciais para acessar esta tela, então...
    if (this.credencialUsuario.length > 0) {
      // Avalie cada transação
      this.credencialUsuario.forEach((nt: TransacaoModel) => {
        switch (nt.transacao) {
          // Transação: '/backend-cadastro/logradouro'
          case this.controlePermissoes[0].transacao: {
            // Atualiza o nível de acesso da transação
            this.controlePermissoes[0].nivelAcesso = nt.nivelAcesso;
            // Atualiza o nível de acesso dos componentes
            this.atualizaComponentes(this.controlePermissoes[0], nt);
            // Atualiza a lista de exceções à regra que devem ser ativadas
            this.controlePermissoes[0].excecoes = nt.regras;
            break;
          }

          default: {
            console.log('Erro! Transação não encontrada.');
            break;
          }
        }
      });
    }
  }

  /**
   * Atualiza as permissões de acesso à componentes baseado no nível de acesso do usuário à transação.
   * @param controle Dados de controle da transação
   * @param dadoUsuario Permissões de acesso do usuário
   */
  atualizaComponentes(controle: ControlePermissoesModel, dadoUsuario: TransacaoModel) {
    // Se o nível de acesso à transação for 1 (Somente leitura), seta o nível de acesso de todos os
    // componentes para somente leitura
    if (controle.nivelAcesso === 1) {
      controle.componentes.forEach((componente: ComponenteModel) => {
        // 0 == indisponível, 1 == somente leitura, 2 == leitura e escrita
        componente.nivelAcesso = 1;
      });
    } else { // Caso contrário, avalia componente a componente
      controle.componentes.forEach((componenteControle: ComponenteModel) => {

        dadoUsuario.componentes.forEach((componenteUsuario: ComponenteModel) => {
          if (componenteControle.idComponente === componenteUsuario.idComponente) {
            componenteControle.nivelAcesso = componenteUsuario.nivelAcesso;
          }
        });

      });
    }
  }

  /**
   * Ativa as permissões seguindo a lista de permissões atualizada
   */
  ativaPermissoes() {
    // Se o componente for um formulário, ative/desative pelo formulário
    // this.ativaFormulario(this.grupoComponentes, this.controlePermissoes[0].componentes[0]);

    // Se o componente não for um formulário, use o switch para setar o atributo disabled no html
    this.ativaSwitch(0, 0);  // Botão Confirmar
  }

  /**
   * Ativa ou desativa um componente que não é um formulário.
   * @param transacao Índice da transação na lista controlePermissoes
   * @param index Índice do componente baseado na lista controlePermissoes[transacao].componentes
   */
  ativaSwitch(transacao: number, index: number) {
    if (this.controlePermissoes[transacao].componentes[index].nivelAcesso === 2) { // Nível de acesso 2 == escrita
      this.controlePermissoes[transacao].switchComponentes[index] = false; // [disabled] = false
    } else { // else nível de acesso 1 => somente leitura
      this.controlePermissoes[transacao].switchComponentes[index] = true; // [disabled] = true
    }
  }

  /**
   * Ativa a exceção à regra passada na entrada.
   * @param index índice da regra à ser ativada
   */
  ativaExcecoes(index: number) {
    // Esta tela não possui exceções, este é apenas um exemplo de como lidar com elas
    // Cada regra deve ter seu próprio índice e função de ativação
    switch (index) {

      case 0: {
        // this.ativaRegra0();
        break;
      }

      default: {
        // console.log('Erro! índice de exceção à regra não encontrado.');
        break;
      }
    }
  }

  /**
   * Exceção à regra 0: Nome do cliente não precisa ser validado.
   */
  ativaRegra0() {
    // Esta tela ainda não possui exceções às regras definidas, esta serve como exemplo
    // Remove os validadores em atividade
    // this.nomeCliente.clearValidators();
    // Adiciona novos
    /* this.nomeCliente.setValidators(Validators.compose([
        Validators.required
      ])
    ); */
    // Sempre set update quando trocar validadores
    // this.nomeCliente.updateValueAndValidity();
    // Ativa o switch. Importante para remover a máscara do campo
    // this.controlePermissoes[0].switchExcecao[0] = false;
  }
}
