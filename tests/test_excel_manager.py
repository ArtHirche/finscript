import os
import shutil
import pytest
import datetime
import openpyxl
from backend.excel_manager import ExcelManager, DEFAULT_EXCEL_PATH

TEST_EXCEL_PATH = r"c:\projetos\finscript\Dashboard Ocimar 2023_test_run.xlsx"

@pytest.fixture
def temp_excel():
    # Setup: copy original excel to a test path
    assert os.path.exists(DEFAULT_EXCEL_PATH), "Planilha original não existe para rodar os testes"
    shutil.copy(DEFAULT_EXCEL_PATH, TEST_EXCEL_PATH)
    
    # Return manager with test file
    manager = ExcelManager(TEST_EXCEL_PATH)
    yield manager
    
    # Teardown: delete test file
    if os.path.exists(TEST_EXCEL_PATH):
        try:
            os.remove(TEST_EXCEL_PATH)
        except Exception as e:
            print(f"Erro ao limpar arquivo de teste: {e}")

def test_get_categories(temp_excel):
    categories = temp_excel.get_categories()
    assert isinstance(categories, dict)
    assert len(categories) > 0
    # Verifica se alguns grupos padrão estão presentes
    assert "RECEITAS_OPERACIONAIS" in categories
    assert "DESPESAS_OPERACIONAIS" in categories
    # Verifica se há subgrupos
    assert len(categories["RECEITAS_OPERACIONAIS"]) > 0

def test_add_and_get_transactions(temp_excel):
    # Inicialmente, a planilha Financeiro deve estar limpa de dados significativos
    txs_init = temp_excel.get_transactions()
    initial_count = len(txs_init)
    
    # Dados de teste
    test_txs = [
        {
            "n_dcto": 101,
            "descricao": "Teste Entrada 1",
            "data_vcto": "2026-06-10",
            "data_pgto": "2026-06-10",
            "parcela": "1/1",
            "entradas": 1500.0,
            "saidas": 0.0,
            "conta": "Banco",
            "grupo": "RECEITAS_OPERACIONAIS",
            "subgrupo": "Prestação de Serviços"
        },
        {
            "n_dcto": 102,
            "descricao": "Teste Saída 1",
            "data_vcto": "2026-06-11",
            "data_pgto": None,
            "parcela": "1/1",
            "entradas": 0.0,
            "saidas": 500.0,
            "conta": "Cédula",
            "grupo": "DESPESAS_OPERACIONAIS",
            "subgrupo": "Alimentação"
        }
    ]
    
    # Adiciona transações
    added = temp_excel.add_transactions(test_txs)
    assert added == 2
    
    # Obtém novamente
    txs_after = temp_excel.get_transactions()
    assert len(txs_after) == initial_count + 2
    
    # Verifica os valores salvos
    t1 = [t for t in txs_after if t["n_dcto"] == 101][0]
    assert t1["descricao"] == "Teste Entrada 1"
    assert t1["entradas"] == 1500.0
    assert t1["status"] == "Realizado"
    assert t1["conta"] == "Banco"
    
    t2 = [t for t in txs_after if t["n_dcto"] == 102][0]
    assert t2["descricao"] == "Teste Saída 1"
    assert t2["saidas"] == 500.0
    assert t2["status"] == "Previsto"
    assert t2["vencida"] in ["Vencida", "No prazo"] # Depende da data corrente vs 2026-06-11

def test_update_transaction(temp_excel):
    # Adiciona uma transação para poder editar
    test_txs = [{
        "n_dcto": 201,
        "descricao": "Original",
        "data_vcto": "2026-06-15",
        "data_pgto": None,
        "parcela": "1/1",
        "entradas": 0.0,
        "saidas": 200.0,
        "conta": "Banco",
        "grupo": "DESPESAS_OPERACIONAIS",
        "subgrupo": "Combustível"
    }]
    temp_excel.add_transactions(test_txs)
    
    # Busca a transação adicionada para pegar seu ID (linha)
    txs = temp_excel.get_transactions()
    tx = [t for t in txs if t["n_dcto"] == 201][0]
    tx_id = tx["id"]
    
    # Dados de atualização
    update_data = {
        "n_dcto": 201,
        "descricao": "Atualizada",
        "data_vcto": "2026-06-15",
        "data_pgto": "2026-06-16", # agora está paga
        "parcela": "1/1",
        "entradas": 0.0,
        "saidas": 250.0, # alterou valor
        "conta": "Cédula", # alterou conta
        "grupo": "DESPESAS_OPERACIONAIS",
        "subgrupo": "Combustível"
    }
    
    success = temp_excel.update_transaction(tx_id, update_data)
    assert success is True
    
    # Recarrega e valida
    txs_updated = temp_excel.get_transactions()
    tx_updated = [t for t in txs_updated if t["id"] == tx_id][0]
    assert tx_updated["descricao"] == "Atualizada"
    assert tx_updated["saidas"] == 250.0
    assert tx_updated["conta"] == "Cédula"
    assert tx_updated["status"] == "Realizado"
    assert tx_updated["data_pgto"] == "2026-06-16"

def test_delete_transaction(temp_excel):
    # Adiciona
    test_txs = [{
        "n_dcto": 301,
        "descricao": "Deletar",
        "data_vcto": "2026-06-20",
        "data_pgto": None,
        "parcela": "1/1",
        "entradas": 100.0,
        "saidas": 0.0,
        "conta": "Banco",
        "grupo": "RECEITAS_OPERACIONAIS",
        "subgrupo": "Vendas"
    }]
    temp_excel.add_transactions(test_txs)
    
    txs = temp_excel.get_transactions()
    tx = [t for t in txs if t["n_dcto"] == 301][0]
    tx_id = tx["id"]
    
    # Deleta
    success = temp_excel.delete_transaction(tx_id)
    assert success is True
    
    # Verifica se sumiu das transações válidas
    txs_after = temp_excel.get_transactions()
    match = [t for t in txs_after if t["n_dcto"] == 301]
    assert len(match) == 0

def test_reports_and_dashboard_calculations(temp_excel):
    # Adiciona algumas transações
    test_txs = [
        {
            "n_dcto": 401,
            "descricao": "Venda 1",
            "data_vcto": "2026-06-01",
            "data_pgto": "2026-06-01",
            "parcela": "1/1",
            "entradas": 2000.0,
            "saidas": 0.0,
            "conta": "Banco",
            "grupo": "RECEITAS_OPERACIONAIS",
            "subgrupo": "Receitas de Vendas"
        },
        {
            "n_dcto": 402,
            "descricao": "Almoço",
            "data_vcto": "2026-06-02",
            "data_pgto": "2026-06-02",
            "parcela": "1/1",
            "entradas": 0.0,
            "saidas": 150.0,
            "conta": "Banco",
            "grupo": "DESPESAS_OPERACIONAIS",
            "subgrupo": "Alimentação"
        },
        {
            "n_dcto": 403,
            "descricao": "Mercado",
            "data_vcto": "2026-06-03",
            "data_pgto": None,
            "parcela": "1/1",
            "entradas": 0.0,
            "saidas": 300.0,
            "conta": "Cédula",
            "grupo": "DESPESAS_ADMINISTRATIVAS",
            "subgrupo": "Mercado"
        }
    ]
    temp_excel.add_transactions(test_txs)
    
    # Testa Relatórios
    reports = temp_excel.get_reports()
    assert "Banco" in reports
    assert "Cédula" in reports
    assert reports["Banco"]["credit"] == 2000.0
    assert reports["Banco"]["debit"] == 150.0
    assert reports["Banco"]["balance"] == 1850.0
    assert reports["Cédula"]["debit"] == 300.0
    assert reports["Cédula"]["balance"] == -300.0
    
    # Testa Dashboard
    dash = temp_excel.get_dashboard_data()
    assert "kpis" in dash
    assert "ttgm" in dash
    assert "ttga" in dash
    assert "timeline" in dash
    
    # TTGM deve ter a saída de Alimentação e Mercado para Junho de 2026 (ym: 2026-06)
    ym = "2026-06"
    assert ym in dash["ttgm"]
    assert dash["ttgm"][ym]["Alimentação"] == 150.0
    assert dash["ttgm"][ym]["Mercado"] == 300.0
    
    # TTGA deve ter o ano 2026
    assert "2026" in dash["ttga"]
    assert dash["ttga"]["2026"]["Alimentação"] == 150.0
