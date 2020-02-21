import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';


// PrimeNG
import { MenuItem, MessageService, ConfirmationService } from 'primeng/api';
import { ControlePermissoesModel } from 'src/app/core/models/controle-permissoes.model';
import { FileUpload } from 'primeng/primeng';

//Serviços
import { AtualizacaoLigacoesEsgotoLoteService } from './ligacoes-esgoto-lote.service';
import { ConfiguracaoService } from 'src/app/core/services/configuracao.service';

//Constantes
import { TEMPO_VIDA_MENSAGEM } from 'src/environments/environment';



/**
 * Componente responsável .
 * @author Tiago Ribeiro Santos
 */

@Component({
  selector: 'app-ligacoes-esgoto-lote',
  templateUrl: './ligacoes-esgoto-lote.component.html',
  styleUrls: ['./ligacoes-esgoto-lote.component.scss'],
  providers: [AtualizacaoLigacoesEsgotoLoteService]
})
export class LigacoesEsgotoLoteComponent implements OnInit, AfterViewInit {

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
  descricaoEstadoProcessamento = 'processando';


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
   * O construtor padrão, responsável por providenciar acesso aos serviços utilizados pelo componente.
   * @param cdr Serviço detector de mudanças no View.
   * @param atualizacaoLigacoesEsgotoService Serviço de atualização da base de CEPs do correio

   */
  constructor(
    private cdr: ChangeDetectorRef,
    private servicoMensagem: MessageService,
    private servicoConfirmacao: ConfirmationService,
    private atualizacaoLigacoesEsgotoService: AtualizacaoLigacoesEsgotoLoteService,
    private configuracaoService: ConfiguracaoService
  ) {

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
      }

    });

  }
  /**
  * Seleção do arquivo para UPLOAD
  * @param evento Informações dos arquivos a enviar
  */
  eventoSelecaoArquivo(evento) {

    setTimeout(() => {

      this.servicoMensagem.add(
        { severity: 'success', summary: 'Mensagem', detail: 'Arquivos enviados.', life: TEMPO_VIDA_MENSAGEM }
      );

    }, 1000);

    //this.atualizarEstadoProcessamento();

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

  /**
   * Salva as alterações no registro em edição.
   */
  salvar() {

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
}
