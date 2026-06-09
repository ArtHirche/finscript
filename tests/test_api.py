import os
import json
import shutil
import pytest
from backend.app import app, excel_manager
from backend.excel_manager import DEFAULT_EXCEL_PATH

TEST_EXCEL_PATH = r"c:\projetos\finscript\Dashboard Ocimar 2023_api_test.xlsx"

@pytest.fixture
def client():
    # Setup test environment
    assert os.path.exists(DEFAULT_EXCEL_PATH), "Planilha original não existe"
    shutil.copy(DEFAULT_EXCEL_PATH, TEST_EXCEL_PATH)
    
    # Configure Flask app to use test excel
    original_path = excel_manager.filepath
    excel_manager.filepath = TEST_EXCEL_PATH
    
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client
        
    # Teardown
    excel_manager.filepath = original_path
    if os.path.exists(TEST_EXCEL_PATH):
        try:
            os.remove(TEST_EXCEL_PATH)
        except Exception as e:
            print(f"Erro ao deletar planilha de teste: {e}")

def test_api_categories(client):
    response = client.get('/api/categories')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "RECEITAS_OPERACIONAIS" in data
    assert len(data["RECEITAS_OPERACIONAIS"]) > 0

def test_api_get_data_empty(client):
    response = client.get('/api/data')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "transactions" in data
    assert "reports" in data
    assert "dashboard" in data
    assert len(data["transactions"]) == 0 # initial spreadsheet has no transactions

def test_api_crud_transactions(client):
    # 1. Test POST (Add transaction)
    new_tx = {
        "n_dcto": 999,
        "descricao": "Aluguel Escritório",
        "data_vcto": "2026-06-25",
        "data_pgto": None,
        "parcela": "1/12",
        "entradas": 0.0,
        "saidas": 1200.0,
        "conta": "Banco",
        "grupo": "DESPESAS_ADMINISTRATIVAS",
        "subgrupo": "Aluguel"
    }
    
    response = client.post('/api/transactions', 
                           data=json.dumps(new_tx), 
                           content_type='application/json')
    assert response.status_code == 201
    res_data = json.loads(response.data)
    assert res_data["success"] is True
    assert res_data["added_count"] == 1
    
    # Verify transaction is in list
    response = client.get('/api/data')
    data = json.loads(response.data)
    txs = data["transactions"]
    assert len(txs) == 1
    assert txs[0]["n_dcto"] == 999
    assert txs[0]["descricao"] == "Aluguel Escritório"
    assert txs[0]["status"] == "Previsto"
    
    tx_id = txs[0]["id"] # Line number
    
    # 2. Test PUT (Update transaction - Pay it)
    update_data = {
        "n_dcto": 999,
        "descricao": "Aluguel Pago",
        "data_vcto": "2026-06-25",
        "data_pgto": "2026-06-25", # Paid!
        "parcela": "1/12",
        "entradas": 0.0,
        "saidas": 1200.0,
        "conta": "Banco",
        "grupo": "DESPESAS_ADMINISTRATIVAS",
        "subgrupo": "Aluguel"
    }
    
    response = client.put(f'/api/transactions/{tx_id}', 
                          data=json.dumps(update_data), 
                          content_type='application/json')
    assert response.status_code == 200
    assert json.loads(response.data)["success"] is True
    
    # Verify update
    response = client.get('/api/data')
    data = json.loads(response.data)
    txs = data["transactions"]
    assert txs[0]["descricao"] == "Aluguel Pago"
    assert txs[0]["status"] == "Realizado"
    assert txs[0]["data_pgto"] == "2026-06-25"
    
    # Verify reports (debit of 1200.0 in Banco)
    reports = data["reports"]
    assert "Banco" in reports
    assert reports["Banco"]["debit"] == 1200.0
    assert reports["Banco"]["balance"] == -1200.0
    
    # 3. Test DELETE (Remove transaction)
    response = client.delete(f'/api/transactions/{tx_id}')
    assert response.status_code == 200
    assert json.loads(response.data)["success"] is True
    
    # Verify deletion
    response = client.get('/api/data')
    data = json.loads(response.data)
    assert len(data["transactions"]) == 0
