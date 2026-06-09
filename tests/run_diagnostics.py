import os
import shutil
from backend.excel_manager import ExcelManager, DEFAULT_EXCEL_PATH

TEST_EXCEL_PATH = r"c:\projetos\finscript\Dashboard Ocimar 2023_diagnostic.xlsx"

if os.path.exists(TEST_EXCEL_PATH):
    os.remove(TEST_EXCEL_PATH)

shutil.copy(DEFAULT_EXCEL_PATH, TEST_EXCEL_PATH)
manager = ExcelManager(TEST_EXCEL_PATH)

txs_init = manager.get_transactions()
print(f"Initial transaction count: {len(txs_init)}")

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
    }
]

added = manager.add_transactions(test_txs)
print(f"Added count: {added}")

txs_after = manager.get_transactions()
print(f"After count: {len(txs_after)}")

print("All transactions after adding:")
for tx in txs_after:
    print(f"  Line {tx['id']}: doc={tx['n_dcto']}, desc={tx['descricao']}, entradas={tx['entradas']}")

# Clean up
if os.path.exists(TEST_EXCEL_PATH):
    os.remove(TEST_EXCEL_PATH)
