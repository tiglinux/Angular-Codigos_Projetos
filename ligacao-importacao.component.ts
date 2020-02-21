import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormGroup } from '@angular/forms';




// PrimeNG
import { MenuItem, MessageService, ConfirmationService } from 'primeng/api';
import { ControlePermissoesModel } from 'src/app/core/models/controle-permissoes.model';
import { FileUpload } from 'primeng/primeng';

//Serviços
import { AtualizacaoLigacoesEsgotoLoteService, LigacoesEsgotoLoteDTO, LigacoesEsgotoWrapperDTO, LigacaoEsgotoLoteStatusDTO } from 'src/app/cadastro/components/ligacoes-esgoto-lote/ligacoes-esgoto-lote.service';
import { ConfiguracaoService } from 'src/app/core/services/configuracao.service';

//Constantes
import { TEMPO_VIDA_MENSAGEM, TRANSACAO_IMOVEL_LIGACAO_ESGOTO, URL_UPLOAD_ATUALIZACAO_ESGOTO_LOTE_DTO, URL_ESGOTO_CRITICAR } from 'src/environments/environment';
import { TransacaoModel } from 'src/app/core/models/transacao.model';
import { AutenticacaoService } from 'src/app/core/services/autenticacao.service';
import { ComponenteModel } from 'src/app/core/models/componente.model';
import { Subscription, Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpRequest, HttpEvent } from '@angular/common/http';


/**
 * Componente responsável por importar arquivo Excel com matrículas e situação de esgoto.
 * @author Tiago Ribeiro Santos
 */

@Component({
  selector: 'app-ligacao-importacao',
  templateUrl: './ligacao-importacao.component.html',
  styleUrls: ['./ligacao-importacao.component.scss'],
  providers: [AtualizacaoLigacoesEsgotoLoteService]
})
export class LigacaoImportacaoComponent implements OnInit {

  //Variavel para receber dados dos arquivos que foram enviados para serem importados.
  transicao:any;


  //const formData = new FormData();
  nomeArquivo: any;



  getData: string;

  /**
   * Subscription permanente para o evento de loading. Inicializado no construtor e encerrado em ngOnDestroy.
   */
  private loadingSubscription: Subscription;

  /**
   * Flag que informa se o componente está sendo carregado ou não.
   */
  isLoading = true;

  /**
   * Grupo de componentes do formulário reativo
   */
  grupoComponentes: FormGroup;

  /**
  * Flag que informa se o formulário já foi salvo ou não. Útil na hora de decidir se o usuário pode sair livremente da
  * tela ou não.
  */
  private formSalvo = false;


  /**
   * Breadcrumbs.
   */
  items: MenuItem[];

  /**
  * Descrição do último estado do processamento
  */
  descricaoEstadoProcessamento = 'Processando..';

  /**
   * Grupo de componentes do formulário reativo
   */
  formCadastro: FormGroup;

  ligacoesEsgotoDTOWrapper = new LigacoesEsgotoWrapperDTO();

  ligacaoEsgotoLoteDTO = new LigacoesEsgotoLoteDTO();

  /**
   * Símbolo Home do breadcrumb.
   */
  home: MenuItem;

  @ViewChild('fileUpload', null)
  fileUpload: FileUpload;
  /**
   * Quantidade de arquivos selecionados
   */
  arquivosSelecionados = 0;

  /**
  * Tamanho em MB dos arquivos selecionados
  */
  tamanhoArquivosSelecionados = 0;

  /**
 * Step selecionado.
 */
  etapa = 1;

  /**
  * Indica se o último lote de arquivos ainda está sendo processado
  */
  processando = true;


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

  get dataAquisicaoLacre() { return this.formCadastro.get('nomeArquivoLigacaoEsgoto'); }

  /**
   * O construtor padrão, responsável por providenciar acesso aos serviços utilizados pelo componente.
   * @param cdr Serviço detector de mudanças no View.
   * @param atualizacaoLigacoesEsgotoService Serviço de atualização da base de CEPs do correio

   */
  constructor(
    private cdr: ChangeDetectorRef,
    private servicoMensagem: MessageService,
    private servicoConfirmacao: ConfirmationService,
    private atualizacaoLigacoesEsgotoService: AtualizacaoLigacoesEsgotoLoteService, // Aqui é o service instanciado
    private servicos: AtualizacaoLigacoesEsgotoLoteService,
    private configuracaoService: ConfiguracaoService,
    private autentica: AutenticacaoService,
    private elementRef: ElementRef,
    private config: ConfiguracaoService,
    private http: HttpClient

  ) {

    //  this.servicos.teste()
    // Inicializa as permissões default e as atualiza com os dados do usuário logado.
    this.inicializaPermissoes();

  }

  ngOnInit() {
    // Inicializa os breadcrumbs 
    this.home = { icon: 'pi pi-home', routerLink: '/' };
    this.items = [
      { label: 'Cadastro', disabled: true },
      { label: 'Imóveis', disabled: true },
      { label: 'Ligações de Esgoto em Lote', disabled: false, routerLink: '/cadastro/ligacoesEsgotoEmLote' }
    ];

    this.grupoComponentes = new FormGroup(
      {}
    );

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
    // Componente carregado, remove a tela de loading.
    this.loading();

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
 * Chamado quando se clica no botão da etapa de 'Seleção'.
 */
  marcaImportacao() {
    this.etapa = 1;
  }

  /**
   * Chamado quando se clica no botão da etapa de 'Validação'.
   */
  marcaValidacao() {
    this.etapa = 2;
  }

  /**
   * Chamado quando se clica no botão da etapa de 'Acompanhamento'.
   */
  marcaAcompanhamento() {
    this.etapa = 3;


  }


  /**
  * Método chamado pelo botão 'Limpar'. Limpa todos os filtros de pesquisa.
  */
  limpaFiltros() {

    this.servicoConfirmacao.confirm({
      key: 'limparLigacaoEsgoto',
      header: 'Confirmação',
      message: 'Descartar os arquivos selecionados?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim',
      rejectLabel: 'Não',
      // Se o usuário confirmar, limpa o formulário
      accept: () => {

        this.fileUpload.clear();

        this.arquivosSelecionados = 0;
        this.tamanhoArquivosSelecionados = 0;

        this.formSalvo = false;

      },
      // Em caso contrário, só fecha a caixa de diálogo
      reject: () => {
        console.log(`Janela fechada!`);
      }

    });

  }
  /**
  * Seleção do arquivo para UPLOAD
  * @param evento Informações dos arquivos a enviar //Evento de chamada quando o Uplaod tiver concluído.
  * Http Response - Resposta de Requisição  HTTP
  */
  eventoSelecaoArquivo(evento) {
    //Propriedades , atributos do Arquivo recebido por requisição HTTP. (Response) - LigacaoEsgotoLoteDTO
    //Evento é um atributo de informações de upload
    //const arquivo = evento.files;
    //this.servicos.transicao = arquivo; //Transicao recebe resposta do BackEND Arquivo
    
    //Aqui percorro os arquivos que foram selecionados e enviados.
    //this.servicos.transicao.forEach( n =>{
      //console.log(n);
    //})
    
    //this.servicos.getMostraDadosArquivo(); // 
    //this.servicos.mostraDadosArquivo(arquivo);

    setTimeout(() => {

      this.servicoMensagem.add(
        { severity: 'success', summary: 'Mensagem', detail: 'Arquivos enviados.', life: TEMPO_VIDA_MENSAGEM }
      );

    }, 1000);

    this.atualizarEstadoProcessamento(evento);

    this.arquivosSelecionados = 0;
    this.tamanhoArquivosSelecionados = 0;

  }

  /**
  * Adição de um arquivo na lista de UPLOAD
  * @param evento Informações dos arquivos escolhidos
  */
  eventoAposSelecionarArquivo(evento) {

    let tamanhoArquivos = 0;

    this.fileUpload.files.forEach(
      arquivo => {
        tamanhoArquivos += arquivo.size;
      }
    );

    this.arquivosSelecionados = this.fileUpload.files.length;
    this.tamanhoArquivosSelecionados = tamanhoArquivos / 1000000;

  }
  /**
     * Detalhes dos erros de UPLOAD
     * @param evento O evento com as informações
     */
  eventoErro(evento) {

    this.mostrarMensagemErro(evento.error.error.descricaoExcessao ? evento.error.error.descricaoExcessao : 'Erro ao enviar os arquivos');
    console.log('Erro de upload');
    console.log(evento);

  }

  /**
   * Remoção de um arquivo na lista de UPLOAD
   * @param evento Informações dos arquivos escolhidos
   */
  eventoRemoverArquivo(evento) {

    let tamanhoArquivos = 0;

    this.fileUpload.files.forEach(
      arquivo => {
        tamanhoArquivos += arquivo.size;
      }
    );

    this.arquivosSelecionados = this.fileUpload.files.length - 1;
    this.tamanhoArquivosSelecionados = (tamanhoArquivos - evento.file.size) / 1000000;

  }

  /*AtaualizarArquivo(event){
    //Aqui capturo o nome o objeto do arquivo
    let ArquivoUpload  = this.fileUpload.files;
    
    //Anexa arquivos ao formulário virtual
    for(let arquivo of ArquivoUpload){
      console.log(arquivo);
     }
    const HttpUploadOptions = {
      headers: new HttpHeaders({ "Content-Type": "multipart/form-data" })
    }
    this.http.put(URL_ESGOTO_CRITICAR, ArquivoUpload,headers)
      .subscribe(event => {
        console.log('Arquivo enviado com sucesso!');
      });
  }
  /**
   * Salva as alterações no registro em edição.
   */


  salvar() {
    //let ArquivoUpload  = this.fileUpload.files;
    if (this.controlePermissoes[0].nivelAcesso < 2) {
      return;
    }

    if (this.verificarFormularioTransacaoInvalido()) {
      return;
    }

    this.fileUpload.upload();


  }


  /**
   * Verifica se os controles do formulário de transação estão válidos
   * e mostra mensagens em caso negativo
   */
  verificarFormularioTransacaoInvalido(): boolean {

    let tamanhoArquivos = 0;

    this.fileUpload.files.forEach(
      arquivo => {
        tamanhoArquivos += arquivo.size;
      }
    );

    let listaArquivosInvalida = tamanhoArquivos > 30000000;

    if (listaArquivosInvalida) {

      this.servicoMensagem.add(
        { severity: 'warn', summary: 'Mensagem', detail: 'O tamanho dos arquivos selecionados ultrapassa 30MB.', life: TEMPO_VIDA_MENSAGEM }
      );

    }

    if (this.fileUpload.files.length === 0) {

      this.servicoMensagem.add(
        { severity: 'warn', summary: 'Mensagem', detail: 'Selecione pelo menos um arquivo para enviar', life: TEMPO_VIDA_MENSAGEM }
      );

      listaArquivosInvalida = true;

    }

    return listaArquivosInvalida;

  }
  //Consulta Status de processamento de arquivos XLS
  mostrarStatusArquivoProcessamento(){
    this.atualizacaoLigacoesEsgotoService.consultarStatusArquivoProcessadoCriticar()
      .subscribe(dados => { //Aqui eu monitoro a saída de dados para saber a resposta
        console.log(dados)
      },
        error => {
          console.log('Erro em apresentar Status de arquivos.')
        });
  }


 
  /**
   * Mostra uma mensagem de erro
   * @param mensagem A mensagem de erro
   */
  mostrarMensagemErro(mensagem: string) {

    if (mensagem) {

      this.servicoMensagem.add(
        { severity: 'error', summary: 'Mensagem', detail: mensagem, life: TEMPO_VIDA_MENSAGEM }
      );

    } else {

      this.servicoMensagem.add(
        { severity: 'error', summary: 'Mensagem', detail: 'Erro desconhecido', life: TEMPO_VIDA_MENSAGEM }
      );

    }

  }
  inicializaPermissoes() {
    // Maioria das telas pertencerão à apenas uma transação, mas por garantia e escalabilidade, criaremos sempre um array
    this.controlePermissoes = new Array<ControlePermissoesModel>(1);
    this.controlePermissoes[0] = new ControlePermissoesModel();

    // Todas as transacoes (endpoints do backend e acessos externos) precisam estar cadastrados.
    this.controlePermissoes[0].transacao = TRANSACAO_IMOVEL_LIGACAO_ESGOTO;
    // 2 - Escrita; 1 - Leitura; 0 - Indisponível
    this.controlePermissoes[0].nivelAcesso = 2;
    // if(switchTransacao), então true == enabled
    this.controlePermissoes[0].switchTransacao = true;

    // Todos os componentes controlados pelo sistema devem estar cadastrados
    // 0 == indisponível, 1 == somente leitura, 2 == leitura e escrita
    this.controlePermissoes[0].componentes = [
      { idComponente: 'nomeArquivoLigacaoEsgoto', nivelAcesso: 2 },   // 0
      { idComponente: 'btnEnviarArquivo', nivelAcesso: 2 },           // 1
      { idComponente: 'btnLimparFiltro', nivelAcesso: 2 }
    ];
    // [disabled] = switchComponent, então true == disabled
    this.controlePermissoes[0].switchComponentes = [
      false,  // 0
      false,  // 1
      false,  // 2
      false,  // 3
      false   // 4
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
          // Transação: '/backend-imovel/ligacaoEsgotoLote'
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
    // this.ativaFormulario(this.formCadastro, this.controlePermissoes[0].componentes[0]);
    // this.ativaFormulario(this.formCadastro, this.controlePermissoes[0].componentes[1]);
    // this.ativaFormulario(this.formCadastro, this.controlePermissoes[0].componentes[2]);
    // this.ativaFormulario(this.formCadastro, this.controlePermissoes[0].componentes[3]);

    // Se o componente não for um formulário, use o switch para setar o atributo disabled no html
    this.ativaSwitch(0, 1);  // Botão Validar
  }

  /**
   * Ativa ou desativa um campo de formulário
   * @param form Formulário ao qual o componente pertence
   * @param comp Componente à ter seu status alterado
   */
  ativaFormulario(form: FormGroup, comp: ComponenteModel) {
    if (comp.nivelAcesso === 2) { // Nível de acesso 2 == escrita
      form.get(comp.idComponente).enable();
    } else { // else nível de acesso 1 => somente leitura
      form.get(comp.idComponente).disable();
    }
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


  atualizarCritica() {
    //Carrega spinner e loading.
    this.loading();

    /*this.ligacaoEsgotoLoteDTO.matriculaImovel = "6";
    this.ligacaoEsgotoLoteDTO.sitLigacaoEsgoto = "100";
    this.ligacaoEsgotoLoteDTO.esgotoTratado = "Na";
    this.ligacaoEsgotoLoteDTO.dataVistoria = "20200125";
    this.ligacaoEsgotoLoteDTO.suspCobrancaDisponibilidade = "S";
    this.ligacaoEsgotoLoteDTO.mensagemDossie = "";
    this.ligacaoEsgotoLoteDTO.critica = "";
    */
    //Lista de Ligacoes EsgotoLoteDTO. ligacaoEsgoto é uma Lista por isso é um Array.
    this.ligacoesEsgotoDTOWrapper.ligacaoEsgotoLoteDTO = new Array<LigacoesEsgotoLoteDTO>();
    //Adiciona posições  (atributos) , matriculaImovel...dataVistioria na LISTA
    this.ligacoesEsgotoDTOWrapper.ligacaoEsgotoLoteDTO.push(this.ligacaoEsgotoLoteDTO);

    this.servicos.AtualizaCriticar(this.ligacoesEsgotoDTOWrapper).subscribe(
      (dados: any) => {
        console.log(dados);
      }
    );

  }
  /**
   * Preparação do UPLOAD
   * @param evento As informações da inicialização
   */
  eventoPreparacaoUpload(evento) {

    this.fileUpload.url = URL_UPLOAD_ATUALIZACAO_ESGOTO_LOTE_DTO;

  }
/**
  * Adição de um arquivo na lista de UPLOAD
  * @param evento Informações dos arquivos escolhidos
  */
   //Atualiza Estado de Processamento de Arquivo que está sendo processado ou não.
   atualizarEstadoProcessamento(evento) {

    this.loading(); //Spinner de loading

    this.atualizacaoLigacoesEsgotoService.consultarStatusArquivoProcessadoCriticar().subscribe(
      dados => {
        
        if (dados) { // Se existem dados exibidos

          this.processando = !(dados.dataHoraFimProcesso); // Processamento irá acontecer até HoraFimProcesso não ser finalizado.
          this.transicao = evento.files; //Aqui pego o nome dos arquivos que estão sendo processados.

          console.log(dados.dataHoraFimProcesso);
          console.log(this.processando);
          console.log(this.transicao);

          console.log(dados.dataHoraInicioProcesso.slice(0,4)+               dados.dataHoraInicioProcesso.slice(5,7) +dados.dataHoraInicioProcesso.slice(8,10)               );

          this.descricaoEstadoProcessamento =
            'Envio: ' + (dados.dataHoraInicioProcesso.slice(8,10) +'/'+dados.dataHoraInicioProcesso.slice(5,7)+'/'+dados.dataHoraInicioProcesso.slice(0,4)+ 

            (dados.dataHoraFimProcesso ? (' - Término processamento: ' +
              (((dados.dataHoraFimProcesso.slice(8,10)+'/'+dados.dataHoraFimProcesso.slice(5,7)+'/'+dados.dataHoraFimProcesso.slice(0,4))))) : '') +


            (dados.ultimoArquivoExecutado ? (' - ' + dados.ultimoArquivoExecutado) : '') +

            ' - ' + dados.status + '  Estamos Processando ainda o arquivo.. Aguarde até o final da importação...');

        } else {

          this.processando = false;
          this.descricaoEstadoProcessamento = 'pronto';

        }

      },
      erro => {

        this.descricaoEstadoProcessamento = 'Ocorreu um erro ao consultar o estado do trabalho';

        this.loading();
        this.mostrarMensagemErro(erro.error.descricaoExcessao);

      }
    );

  }



}
