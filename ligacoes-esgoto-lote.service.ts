//Serviços de Libraries 
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

//Variáveis e ENDPOINTS 
import { URL_ESGOTO_STATUS_CRITICA, URL_ESGOTO_CRITICAR, URL_ATUALIZACAO_IMOVEL_ATUALIZAR, URL_ESGOTO_STATUS_PROCESSAR } from 'src/environments/environment';
import { URL_ESGOTO_PROCESSAR } from 'src/environments/environment';

/**
 * @author Tiago Ribeiro Santos
 
**/

/**
 * Classe que armazena o Status da importação no serviço de Ligação Esgoto Status em Lote
 */
export class LigacaoEsgotoLoteStatusDTO {
  status: string;
  dataHoraInicioProcesso: string;
  dataHoraFimProcesso: string;
  ultimoArquivoExecutado: string;
  ligacaoEsgotoLote: Array<LigacoesEsgotoLoteDTO>

}
/**
 * Classe que armazena o status de um lote de críticas em processamento.
 * "True" indica que há críticas sendo geradas e "False" para o contrário.
 */
export class StatusCritica {
  status: string;
}

/*
  Mostra Status de processamento como anda o Processamento de arquivos.
*/
export class StatusProcessamento {
  status: boolean;
}

/**
 * Armazena o resultado da pesquisa de críticas.
 */
export class CriticaEnvelope {
  lisCriticaDTO: RegistroCritica[];
  totalRegistros: number;
  totalCriticas: number;
}
/**
 * Armazena as informações de uma crítica.
 */
export class LigacaoEsgotoLoteCritica {
  id: number;
  idCritica: number;
  matriculaImovel: string;
  sitLigacaoEsgoto: string;
  esgotoTratado: string;
  dataVistoria: string;
  suspCobrancaDisponibilidade: string;
  mensagemDossie: string;
  critica: string;
}

/*
  Armazena as informações de críticas de arquivo que foram processados.
*/

export class CriticaStatusArquivo {
  id: number;
  status: string;
  dataHoraInicioProcesso: Date;
  dataHoraFimProcesso: Date;
  ultimoArquivoExecutado: string;
  ligacaoEsgotoLote: Array<LigacaoEsgotoLoteCritica>;


}
/*
* Classe com atributos e informações existentes em um Ligação de Esgoto.
*/
export class LigacoesEsgotoLoteDTO {
  id: number;
  idCritica: number;
  matriculaImovel: number;
  sitLigacaoEsgoto: string;
  esgotoTratado: string;
  dataVistoria: Date;
  suspCobrancaDisponibilidade: string;
  mensagemDossie: string;
  critica: string;
}

/*
** Classe com parâmetros para acesso de arquivo.
*/
export class LigacoesEsgotoWrapperDTO {
  nomeArquivo: string;
  ligacaoEsgotoLoteDTO: Array<LigacoesEsgotoLoteDTO>;
}




/**
 * Armazena os resultados da pesquisa de registros em processamento
 * e da pesquisa de registros com processamento concluído.
 */
export class MonitoramentoEnvelope {
  listServicoAtendimentoProcessamentoDTO: Array<RegistroMonitorado>;
  totalRegistros: number;
}

/**
 * Armazena os resultados da pesquisa de resultado do processamento.
 */
export class ResultadoEnvelope {
  listServicoAtendimentoProcessadoDTO: Array<RegistroResultado>;
  totalRegistros: number;
}

/**
 * Armazena os dados de um dos registros da tabela de resultados da API
 */
export class RegistroResultado {

  status: string;
  dataHoraInicioProcesso: Date;
  dataHoraFimProcesso: Date;
  ultimoArquivoExecutado: string;


}
/**
 * Armazena as informações de um registro em estado de processamento.(Classe para armazenar do Back)
 */
export class RegistroMonitorado {
  status: string;
  dataHoraInicioProcesso: Date;
  dataHoraFimProcesso: Date;
  ultimoArquivoExecutado: string;

}
/**
 * Armazena os dados de um dos registros da tabela de críticas.
 */
export class RegistroCritica {
  id: number;
  idCritica: number;
  matriculaImovel: string;
  sitLigacaoEsgoto: string;
  esgotoTratado: string;
  dataVistoria: number;
  suspCobrancaDisponibilidade: string;
  mensagemDossie: string;
  critica: string;
}

/**
 * Serviço de atualização da importação Planilha Excel Ligações Esgoto em Lote
 * @author Tiago Ribeiro Santos
 */

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

@Injectable()
export class AtualizacaoLigacoesEsgotoLoteService {

  transicao: LigacoesEsgotoLoteDTO[];

  /**
  * Armazena as críticas exibidas na etapa de validação.
  */
  private criticas: LigacaoEsgotoLoteCritica[];

  auxObjetoJSON: string;

  myFiles: string[] = [];
  sMsg: string = '';
  /**
   * Cabeçalho para  Requisições Http
   */
  private headers = new HttpHeaders();


  /**
    * Responsável por informar o componente da etapa 1 quando uma requisição termina de carregar.
    */
  private loadingNews1 = new Subject<number>();
  /**
   * Responsável por informar o componente da etapa 2 quando uma requisição termina de carregar.
   */
  private loadingNews2 = new Subject<number>();
  /**
   * Responsável por informar o componente da etapa 3 quando uma requisição termina de carregar.
   */
  private loadingNews3 = new Subject<number>();
  /**
   * Contador de requisições concluídas.
   */
  private loadingCounter: number[] = [0, 0, 0];
  /* Mensagem de resposta para o componente da etapa de validação
  */
  private message: string = null;


  /**
   * Construtor padrão
   * @param httpClient Cliente HTTP
   */

  /**
   * Construtor padrão.
   * @param http Serviço de requisições http.
   * @param router Router para navegação entre telas.
   */
  constructor(private httpClient: HttpClient) {

  }





  /**
       * Método usado pelos componentes para receber notícias sobre os eventos de término de loading.
       */
  getLoadingNews(etapa: number): Observable<number> {
    switch (etapa) {
      case 0: {
        return this.loadingNews1.asObservable();
      }
      case 1: {
        return this.loadingNews2.asObservable();
      }
      case 2: {
        return this.loadingNews3.asObservable();
      }
    }
  }

  //ENVIAR DADOS DO ARQUIVO PARA O CORPO DENTRO DE UMA FUNÇÃO ( CRITICAR)

  /**
   * Reseta o valor do contador de requisições especificado na entrada.
   * @param etapa Índice da etapa do componente.
   */
  resetLoadingCounter(etapa: number) {
    this.loadingCounter[etapa] = 0;
  }




  /*Upload de arquivo inteiro via PUT. Envia Put
    upload(fileToUpload): Observable<any> {
     return this.httpClient.put(URL_ESGOTO_CRITICAR, fileToUpload).pipe(map((dados: LigacaoEsgotoLoteStatusDTO) => dados));
    }
    file from event.target.files[0]
  putFile(file: File): Observable<any> {

    let formData = new FormData();
    formData.append('upload', file);

    return this.httpClient.put(URL_ESGOTO_CRITICAR, formData).pipe(map((dados: LigacaoEsgotoLoteStatusDTO) => dados));
  }
  */

  //Converte arquivos Excel extrai data e passa tudo para JSON
  /*converterJSONExcelEnviar(arquivo) {
    let leitor = new FileReader();
    let pastaTrabalho;
    let linha_XL;
    let objetoJSON;

    //Lê arquivo e traduz para String.
    leitor.readAsBinaryString(arquivo);
    //Função de leitura de arquivos.
    leitor.onload = function () {
      //Armazena resultado de Data na variavel.

      let data = leitor.result;

      //Faz leitura de arquivo XLSX de tipo binário.
      pastaTrabalho = XLSX.read(data, { type: 'binary' });
      console.log(pastaTrabalho);
      //Percorre linhas do arquivo no EXCEL
      pastaTrabalho.SheetNames.forEach((sheetName) => {
        //Aqui lê  linha por linha  da Planilha e converte para json é a linhas dos Arrays (Saindo como Object)

        linha_XL = XLSX.utils.sheet_to_json(pastaTrabalho.Sheets[sheetName]);
        //Aqui lê todas linhas e colunas associadas. (String JSON)
        objetoJSON = JSON.stringify(linha_XL); // JSON
        console.log(objetoJSON);
      });

    }
    
  }*/


  //Atualiza Criticas e Manda arquivo
  //atualizaArquivo(registro:LigacoesEsgotoLoteDTO):Observable<LigacoesEsgotoLoteDTO>{
  //return this.httpClient.put(URL_ESGOTO_CRITICAR,)
  //}


  /**
   * Pesquisa da tabela de críticas.
   * @param pagina Página da tabela.
   * @param itensPorPagina Número de items por página.
   * @param campoOrdenacao Id da coluna de ordenação.
   * @param ordenacao Orientação da ordenação (ascendente ou descendente).
   
  /** 
  * @param registro Parâmetros de Atributos de Imovel 
  */
  //Atualiza registro e insere corpo da Classe Ligações Esgoto DTO na arquivo
  AtualizaCriticar(registro: LigacoesEsgotoWrapperDTO) {
    return this.httpClient.put(URL_ESGOTO_CRITICAR, registro);
  }





  /* Soma mais um ao contador de requisições selecionado na entrada e repassa a notícia para os componentes inscritos.
  * @param etapa Índice da etapa do componente.
  */
  addLoadingCounter(etapa: number) {
    switch (etapa) {
      case 0: {
        this.loadingNews1.next(++this.loadingCounter[etapa]);
        break;
      }
      case 1: {
        this.loadingNews2.next(++this.loadingCounter[etapa]);
        break;
      }
      case 2: {
        this.loadingNews3.next(++this.loadingCounter[etapa]);
        break;
      }
    }
  }





  /* Envia os ids dos registros sem crítica para atualização.*/

  confirmaAtualizacao(): Observable<any> {
    const ids2 = new Array<number>();
    if (this.criticas.length > 0) {
      this.criticas.forEach((elemento: LigacaoEsgotoLoteCritica) => {

        // Se o registro não possuir uma crítica, envia o id para atualização
        if (!elemento.critica) {
          ids2.push(elemento.id);
        }

      });
    }

    const dadosRequisicao = {
      ids: ids2
    };

    // Se houver elementos sem crítica, faz a requisição, senão, retorna null.
    if (ids2.length === 0) {
      this.message = 'Todos os registros selecionados possuem críticas.';
      return null;
    } else {
      return this.httpClient.put(URL_ATUALIZACAO_IMOVEL_ATUALIZAR, dadosRequisicao);
    }
  }

  /**
   * Retorna a mensagem salva.
   */
  getMessage(): string {
    return this.message;
  }
  /**
   * Esvazia o buffer de mensagem.
   */
  emptyMessage() {
    this.message = null;
  }
  /**
   * Pesquisa da tabela de críticas.
   * @param pagina Página da tabela.
   * @param itensPorPagina Número de items por página.
   * @param campoOrdenacao Id da coluna de ordenação.
   * @param ordenacao Orientação da ordenação (ascendente ou descendente).
   */
  /**


  /**
  * Retorna a lista de críticas armazenadas.
  */
  getCriticas(): LigacaoEsgotoLoteCritica[] {
    if (this.criticas) {
      return this.criticas;
    } else {
      return null;
    }
  }
  getTabelaCriticas(pagina: any, itensPorPagina: any, campoOrdenacao: string, ordenacao: string): Observable<LigacaoEsgotoLoteStatusDTO> {
    let parametros: HttpParams = new HttpParams();

    parametros = parametros.set('page', pagina);
    parametros = parametros.set('size', itensPorPagina);
    parametros = parametros.set('sort', campoOrdenacao + ',' + ordenacao);

    return this.httpClient.get(URL_ESGOTO_STATUS_CRITICA, { params: parametros })
      .pipe(map(
        (dados: LigacaoEsgotoLoteStatusDTO) => {
          console.log(dados);
          return dados;
        }
      ));
  }
  //Mostra Atributos envia Parâmetros que recebem da API que serão exibidos na tela Validação. 
  /*LigacoesEsgotoLote é um Array de Objetos
  mostraDadosArquivo(arquivo: LigacoesEsgotoLoteDTO[]) {
    this.transicao = new Array<LigacoesEsgotoLoteDTO>();
    this.transicao = arquivo;
    console.log(this.transicao);
  }
*/
  getMostraDadosArquivo(): Array<LigacoesEsgotoLoteDTO> {
    return this.transicao;
  }

  /**
  * Consulta o backend para saber se há críticas sendo geradas ou não. Consulta Status de Críticas no momento.
  * e retorna as criticas
  */
  getStatusCriticas(): Observable<StatusCritica> {
    return this.httpClient.get(URL_ESGOTO_STATUS_CRITICA)
      .pipe(map(
        (dados: StatusCritica) => {
          return dados;
        }
      ));
  }
  /**
   * Consulta o  (Status)'/status' "estado" do trabalho de importação de arquivos de Ligação Esgoto em Lote
   * Método de consulta de Status. Mostra o Status atual de Ligações de Esgoto , Mostra Status do Processamento do Arquivo.
   * Consulta Criticas 
   */
  consultarStatusArquivoProcessadoCriticar(): Observable<LigacaoEsgotoLoteStatusDTO> {
    //pipe() serve para ler dados de uma fonte, assim que eles estão disponíveis. E escreve em outro local.
    //o map() cria um novo array com os dados que ele mapeia,iterando a cada elemento
    return this.httpClient.get<LigacaoEsgotoLoteStatusDTO>(URL_ESGOTO_STATUS_CRITICA).pipe(map((dados: LigacaoEsgotoLoteStatusDTO) => dados));

  }

  /*
  Status de Processamento de arquivo . Mostra o Estado de Processamento atual.
*/
  getStatusProcessamento(): Observable<LigacaoEsgotoLoteStatusDTO[]> {

    return this.httpClient.get<LigacaoEsgotoLoteStatusDTO[]>(URL_ESGOTO_STATUS_PROCESSAR).pipe(map((dados: LigacaoEsgotoLoteStatusDTO[]) => { return dados; }));
  }

  /**
    * Faz requisição PUT para atualizar e processar o arquivo. Quando o user clica em confirmar ele processa o arquivo.
   */

  processarRegistroTabela(registro: LigacaoEsgotoLoteStatusDTO): Observable<LigacaoEsgotoLoteStatusDTO> {
    const corpo = {
      nomeArquivo: registro.ultimoArquivoExecutado,
      ligacaoEsgotoLoteDTO: registro.ligacaoEsgotoLote
    }
    return this.httpClient.put(URL_ESGOTO_PROCESSAR, corpo).pipe(map((dados: LigacaoEsgotoLoteStatusDTO) => dados));;

  }
  /**
    * Faz uma requisição para receber os valores à serem exibidos no grid de resultados da etapa de monitoramento.
    * Fica na Tabela de ACOMPANHAMENTO em 'PROCESSAMENTO CONCLUIDO '
    */
  /**
   * Faz uma requisição para receber os valores à serem exibidos no grid de resultados da etapa de monitoramento.
   */
  /**
    * Faz uma requisição para receber os valores à serem exibidos no grid de monitoramento da etapa de monitoramento.
    */
  getAcompanhamento() {
    return this.httpClient.get(URL_ESGOTO_STATUS_PROCESSAR);
  }


  getTabelaMonitoramento(pagina: any, itensPorPagina: any, campoOrdenacao: string, ordenacao: string): Observable<LigacaoEsgotoLoteStatusDTO> {
    let parametros: HttpParams = new HttpParams();

    parametros = parametros.set('page', pagina);
    parametros = parametros.set('size', itensPorPagina);
    parametros = parametros.set('sort', campoOrdenacao + ',' + ordenacao);

    return this.httpClient.get<LigacaoEsgotoLoteStatusDTO>(URL_ESGOTO_STATUS_CRITICA, { params: parametros }).pipe(map((dados: LigacaoEsgotoLoteStatusDTO) => { return dados; }));

  }



  /**
   * Faz uma requisição para receber os valores à serem exibidos no grid de resultados da etapa de monitoramento.
   */
  getTabelaResultados(pagina: any, itensPorPagina: any, campoOrdenacao: string, ordenacao: string): Observable<LigacaoEsgotoLoteStatusDTO[]> {
    let parametros: HttpParams = new HttpParams();

    parametros = parametros.set('page', pagina);
    parametros = parametros.set('size', itensPorPagina);
    parametros = parametros.set('sort', campoOrdenacao + ',' + ordenacao);


    return this.httpClient.get<LigacaoEsgotoLoteStatusDTO[]>(URL_ESGOTO_STATUS_PROCESSAR, { params: parametros }).pipe(map((dados: LigacaoEsgotoLoteStatusDTO[]) => { return dados; }));

  }

}

