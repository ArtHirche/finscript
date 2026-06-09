# Finscript - Dashboard Financeiro e Gerenciador de Transações Excel

Finscript é uma aplicação web local de alto padrão desenvolvida em Python (Flask) e tecnologias front-end modernas (HTML5, Vanilla CSS com glassmorphic dark mode, Vanilla JS e ApexCharts). O projeto funciona como uma interface rica para ler, analisar e inserir transações no arquivo Excel `Dashboard.xlsx` sem corromper suas fórmulas originais ou estrutura nativa.

## Funcionalidades

- **Dashboard Financeiro Premium**:
  - Indicadores superiores (contas vencendo hoje, atrasadas, recebimentos vencendo hoje e recebimentos atrasados).
  - Gráfico comparativo de Fluxo de Caixa Mensal (Entradas vs Saídas).
  - Detalhamento de despesas mensais (TTGM) e anuais (TTGA) por subgrupo.
  - Projeção de fluxo de caixa baseada na data prevista de crédito/débito.
- **Relatório Financeiro**:
  - Crédito total, Débito total e Saldo líquido por conta (Banco, Cédula, etc.).
- **Gerenciador de Transações**:
  - Tabela interativa com busca, filtros por conta, status, categoria e datas.
  - Caixa de edição múltipla para inserir transações de duas formas:
    - **Modo Visual**: Tabela dinâmica onde você adiciona novas linhas e preenche campos com seletores automáticos vinculados ao Plano de Contas.
    - **Modo Lote (CSV)**: Área de texto para colar linhas de dados separadas por vírgula para processamento imediato.
- **Integração Excel Segura**:
  - Salva e lê dados diretamente do arquivo Excel sem sobrescrever ou desconfigurar as fórmulas e pivot tables nativas da planilha original.

## Estrutura do Projeto

A estrutura segue padrões modernos de desenvolvimento de mercado:

```text
finscript/
│
├── backend/
│   ├── app.py             # Servidor Flask & API REST
│   └── excel_manager.py   # Motor de leitura/escrita e cálculos (openpyxl)
│
├── frontend/
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css  # Folha de estilo (Vanilla CSS, Glassmorphism, Dark Mode)
│   │   └── js/
│   │       └── app.js     # Lógica JS, integração com API e ApexCharts
│   └── templates/
│       └── index.html     # Template HTML principal (Single-Page App)
│
├── tests/
│   ├── test_excel_manager.py  # Testes unitários do excel_manager
│   └── test_api.py            # Testes de integração da API REST Flask
│
├── requirements.txt       # Dependências do Python
├── .gitignore             # Arquivos ignorados pelo Git
├── LICENSE                # Licença MIT
└── run.bat                # Script de inicialização automática no Windows
```

## Instalação e Execução

### Pré-requisitos
- Python 3.10 ou superior instalado no sistema.

### Inicialização Rápida (Windows)
Apenas dê dois cliques no arquivo `run.bat` na raiz do projeto. O script irá:
1. Instalar as dependências necessárias automaticamente.
2. Iniciar o servidor Flask local.
3. Abrir o navegador padrão em `http://127.0.0.1:5000`.

### Inicialização Manual (Qualquer SO)
1. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
2. Execute o servidor:
   ```bash
   python -m backend.app
   ```
3. Abra o navegador em `http://127.0.0.1:5000`.

## Testes Automatizados

Os testes do projeto utilizam o `pytest` e criam cópias temporárias da planilha de produção para garantir que os dados não sejam afetados durante os testes.

Para rodar todos os testes automatizados:
```bash
python -m pytest
```

## Licença

Este projeto está licenciado sob a licença MIT - consulte o arquivo [LICENSE](LICENSE) para obter mais detalhes.
