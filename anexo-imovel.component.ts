//Componentes
import { Component, OnInit, ElementRef, ChangeDetectorRef, ViewChild } from '@angular/core';

//PrimeNG
import { FileUpload, MessageService, ConfirmationService } from 'primeng/primeng';

//Angular
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';

//Services
import { ImovelService, Imovel } from '../imovel.service';
import { ConfiguracaoService } from 'src/app/core/services/configuracao.service';
import { AutenticacaoService } from 'src/app/core/services/autenticacao.service';


//Models
import { ConfiguracaoTabelaPesquisa } from 'src/app/core/models/configuracaoTabelaPesquisa.model';
import { ControlePermissoesModel } from 'src/app/core/models/controle-permissoes.model';
import { TransacaoModel } from 'src/app/core/models/transacao.model';


//Enviromments
import { TEMPO_VIDA_MENSAGEM, URL_BACK_ANEXOS, TRANSACAO_CADASTRO_ANEXOS, ALFANUMERICO } from 'src/environments/environment';
import { CustomValidators } from 'src/app/core/services/custom-validators';
import { URL_CADASTRO_ANEXOS_UPLOAD } from 'src/environments/environment';
import { ComponenteModel } from 'src/app/core/models/componente.model';




/** Componente de Anexo de Imóvel para Anexar arquivos e consulta de Matrícula de Imovel com opção de Delete de arquivo e Download.
** @author Tiago Ribeiro Santos
**/

@Component({
  selector: 'app-anexo-imovel',
  templateUrl: './anexo-imovel.component.html',
  styleUrls: ['./anexo-imovel.component.scss']
})
export class AnexoImovelComponent implements OnInit {


  /**
   * Arquivos selecionados
   */
  arquivosSelecionados: number = 0;

  //Tamanho total de arquivos selecionados.
  tamanhoArquivosSelecionados: number = 0;
  /**
  * Configurações da tabela de beneficiários.
  */
  configuracaoTabela2: ConfiguracaoTabelaPesquisa = new ConfiguracaoTabelaPesquisa();
  /**
   * Subscription permanente para o evento de loading. Inicializado no construtor e encerrado em ngOnDestroy.
   */
  private loadingSubscription: Subscription;

  /**
    * Formulário da parte de endereçamento e hidrometria mais código de atendimento e justificativa.
    */
  formAnexo: FormGroup;

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

  @ViewChild('fileUpload', null)
  fileUpload: FileUpload;

  /**
  * Flag que informa se o componente está sendo carregado ou não.
  */
  isLoading = true;

  /**
  * Flag que informa se o formulário já foi salvo ou não. Útil na hora de decidir se o usuário pode sair livremente da
  * tela ou não.
  */
  private formSalvo = false;

  /**
   * Armazena todas as configurações e valores do grid de monitoramento.
   */
  configuracaoTabela1: ConfiguracaoTabelaPesquisa = new ConfiguracaoTabelaPesquisa();

  // Setters e Getters
  // Formulário de  Anexo - HTML enxergar.
  get matriculaImovel() { return this.formAnexo.get('matriculaImovel'); }
  get descricao() { return this.formAnexo.get('descricao'); }

  // Outros
  get alfanumerico() { return ALFANUMERICO; }

  /**
  * @param msgs Serviço de mensageria do PrimeNG.
  * @param servicos Serviço principal da tela 'Imóvel'. Responsável por todas as requisições.
  */
  constructor(
    private cdr: ChangeDetectorRef,
    private msgs: MessageService,
    private servicoConfirmacao: ConfirmationService,
    private servicos: ImovelService,
    private elementRef: ElementRef,
    private autentica: AutenticacaoService,
    private config: ConfiguracaoService,
    private http: HttpClient
  ) {


    // Inicializa as permissões default e as atualiza com os dados do usuário logado.
    this.inicializaPermissoes();

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

  ngOnInit() {
    // Inicializa-se o formulário de Arrecadação de Imóvel 

    this.formAnexo = new FormGroup(
      {
        matriculaImovel: new FormControl('', Validators.compose([
          CustomValidators.ValidaMatricula_DV
        ])),
        descricao: new FormControl('', Validators.compose([]))


      }
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
 * Carrega/descarrega a tela de loading(spinner + overlay semi-transparente)
 */
  loading() {
    this.isLoading = !this.isLoading;
  }

  /**
 * Método chamado pelo botão 'Limpar'. Limpa todos os filtros de pesquisa.
 */
  limpaFiltros() {

    this.servicoConfirmacao.confirm({
      key: 'limparAnexo',
      header: 'Confirmação',
      message: 'Descartar os arquivos selecionados?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim',
      rejectLabel: 'Não',
      // Se o usuário confirmar, limpa o formulário
      accept: () => {

        this.fileUpload.clear();

        //Limpa campo de Matrícula Imóvel


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
   * Exibe uma mensagem de alerta.
   * @param str Texto da mensagem.
   */
  mensagemAlerta(str: string) {
    setTimeout(() => {
      this.msgs.add({ severity: 'warn', summary: 'Aviso', detail: str, life: TEMPO_VIDA_MENSAGEM });
    }, 1000);
  }


  /**
   * Busca endereço do imóvel aqui eu verifico e consulto o imóvel para saber se a matrícula de Imóvel possui dados de arrecadação
   * 
   */
  carregarImovel() {
    //Campo de matrícula de imóvel.
    let matricula: any = this.formAnexo.controls.matriculaImovel.value;


    //Se matrícula não tiver nada preenchido retorna nada.
    if (matricula === null || matricula === undefined || matricula.value === '') {
      return;
    }
    //Caso contrário carrego o loading() e faço a requisição para API.
    else {
      if (matricula != null || matricula != undefined || matricula.value != '') {
        this.loading();
        this.VerificaDadosArrecadacaoImovel(matricula);
      }
    }
    this.loading();

  }

  /**
   * Função de Verificação se existe Dados de Arrecadação de Imóvel na base de Dados 
   * @author Tiago Ribeiro Santos
   * @param matricula 
   */
  VerificaDadosArrecadacaoImovel(matricula) {
    this.servicos.getArrecadacaoImovel(matricula).subscribe(
      (dados: Imovel) => {
        //Se existe Arrecadação de Imóvel exiba.
        if (dados.arrecadacaoImovelDTO != null) {
          console.log(dados.arrecadacaoImovelDTO);
        } else {  //Senão chame a msg de Alerta e informe ao user que esse num de Matrícula não existe Dados de Arrecadação.
          if (dados.arrecadacaoImovelDTO == null) {
            this.mensagemAlerta('Essa Matrícula não possui Dados de Arrecadação de Imóvel.');
          }
        }
      }
    );
  }

  //PRECISO TRABALHAR A VERIFICAÇÃO DA DESCRIÇÃO.. NÃO DEIXAR ENVIAR CASO a descrição não for enviada.
  salvar() {
    //let ArquivoUpload  = this.fileUpload.files;

    //Se O controle de permissão for menor que 2 (Leitura e escrita) retorne nada.
    if (this.controlePermissoes[0].nivelAcesso < 2) {
      return;
    }

    //Se a Verificação de Formulário for inválida retorne nada.
    if (this.verificarFormularioTransacaoInvalido()) {
      return;
    }

    //Método de verificação de descrição com retorno de arquivo enviado ou não caso o requisito de campo de Descrição seja preenchido com sucesso.
    this.verificaDescricaoImovel();

  }


  /**
   * Método para verificação de campo de Descrição para ser usado dentro do método de salvar()
   * @author
   * Tiago Ribeiro Santos
   */

  verificaDescricaoImovel() {

    let matricula: any = this.formAnexo.controls.matriculaImovel.value;
    let descricao: any = this.formAnexo.controls.descricao.value;

    //Se a Matrícula é nula ou vazia mostre mensagem de erro
    if (matricula === null || matricula === "" || matricula == undefined) {
      this.mostrarMensagemErro("Por favor informe um número de matrícula para enviar o arquivo");
      if (descricao === null || descricao === "" || descricao == undefined) { // Se descricao é nula inforrme erro.
        this.mostrarMensagemErro("Por favor , informe uma descrição para enviar o arquivo.");
      }
    }
    else if (matricula != null || matricula != "" || matricula != undefined) { //Se descrição não é nula  informe dados e faça Upload
      if (descricao == null || descricao === "" || descricao == undefined) {
        this.mostrarMensagemErro("Por favor,informe uma descrição para enviar o arquivo. ");
      } else if (descricao != null || descricao != "" || descricao != undefined) {
        //Chamo o método de verificação De Dados de Arrecadação para informar se a Matrícula de Imóvel possui dados de Arrecadação ou Não.
        this.VerificaDadosArrecadacaoImovel(matricula);
        //Se descrição estiver sido preenchido informe que o arquivo foi enviado com sucesso e envie o arquivo para a Base.
        this.fileUpload.upload();
        setTimeout(() => {
          this.msgs.add({
            severity: 'success', summary: 'Mensagem', detail: 'Arquivo enviado.', life: TEMPO_VIDA_MENSAGEM
          })
        }, 1000);
      }
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



  /**
   * Mostra uma mensagem de erro
   * @param mensagem A mensagem de erro
   */
  mostrarMensagemErro(mensagem: string) {

    if (mensagem) {

      this.msgs.add(
        { severity: 'error', summary: 'Mensagem', detail: mensagem, life: TEMPO_VIDA_MENSAGEM }
      );

    } else {

      this.msgs.add(
        { severity: 'error', summary: 'Mensagem', detail: 'Erro desconhecido', life: TEMPO_VIDA_MENSAGEM }
      );

    }

  }
  inicializaPermissoes() {
    // Maioria das telas pertencerão à apenas uma transação, mas por garantia e escalabilidade, criaremos sempre um array
    this.controlePermissoes = new Array<ControlePermissoesModel>(1);
    this.controlePermissoes[0] = new ControlePermissoesModel();

    // Todas as transacoes (endpoints do backend e acessos externos) precisam estar cadastrados.
    this.controlePermissoes[0].transacao = TRANSACAO_CADASTRO_ANEXOS;
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
  * Atualiza as permissões default com os valores do usuário logado.
  */
  atualizaPermissoes() {
    // Se o usuário possui credenciais para acessar esta tela, então...
    if (this.credencialUsuario.length > 0) {
      // Avalie cada transação
      this.credencialUsuario.forEach((nt: TransacaoModel) => {
        switch (nt.transacao) {
          // Transação: '/backend-anexos/anexos'
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

      this.msgs.add(
        { severity: 'warn', summary: 'Mensagem', detail: 'O tamanho dos arquivos selecionados ultrapassa 30MB.', life: TEMPO_VIDA_MENSAGEM }
      );

    }

    if (this.fileUpload.files.length === 0) {

      this.msgs.add(
        { severity: 'warn', summary: 'Mensagem', detail: 'Selecione pelo menos um arquivo para enviar', life: TEMPO_VIDA_MENSAGEM }
      );

      listaArquivosInvalida = true;

    }

    return listaArquivosInvalida;

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
     * Preparação do UPLOAD
     * @param evento As informações da inicialização
     */
  eventoPreparacaoUpload(evento) {
    this.fileUpload.url = URL_CADASTRO_ANEXOS_UPLOAD; // URl para consumo com API de Upload Arquivo


  }

  /**
  * Seleção do arquivo para UPLOAD
  * @param evento Informações dos arquivos a enviar //Evento de chamada quando o Uplaod tiver concluído.
  * Http Response - Resposta de Requisição  HTTP - Tiago.R. Santos
  */
  eventoSelecaoArquivo(evento) {

    //Evento é um atributo de informações de upload
    const arquivo = evento.files;

    //Armazena ID Resposta "body" dRecebida do Backend após chamar UploadArquivo/
    let idRecebidoUploadArquivo = evento.originalEvent.body.id;
    console.log(idRecebidoUploadArquivo); // Resposta do ID recebido do Backend


    setTimeout(() => {
      this.msgs.add({
        severity: 'success', summary: 'Mensagem', detail: 'Arquivo enviado.', life: TEMPO_VIDA_MENSAGEM
      })
    }, 1000);



    this.arquivosSelecionados = 0;
    this.tamanhoArquivosSelecionados = 0;
  }
}
