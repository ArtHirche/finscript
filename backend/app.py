import os
import sys
from flask import Flask, jsonify, request, render_template
from backend.excel_manager import ExcelManager

# Configure project paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, 'frontend', 'static')
TEMPLATES_DIR = os.path.join(BASE_DIR, 'frontend', 'templates')

app = Flask(__name__, 
            static_folder=STATIC_DIR, 
            template_folder=TEMPLATES_DIR)

# Enable hot reloading in dev
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Initialize Excel Manager
excel_manager = ExcelManager()

@app.route('/')
def index():
    """Rota principal para servir a aplicação Single-Page HTML"""
    return render_template('index.html')

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Retorna grupos e subgrupos mapeados do Plano de contas"""
    try:
        categories = excel_manager.get_categories()
        return jsonify(categories)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data', methods=['GET'])
def get_data():
    """Retorna todas as transações, relatórios por conta e estatísticas do dashboard"""
    try:
        transactions = excel_manager.get_transactions()
        reports = excel_manager.get_reports()
        dashboard = excel_manager.get_dashboard_data()
        
        return jsonify({
            "transactions": transactions,
            "reports": reports,
            "dashboard": dashboard
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions', methods=['POST'])
def add_transactions():
    """Adiciona uma ou mais transações na planilha"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Dados inválidos"}), 400
            
        # Garante que é uma lista, mesmo que seja apenas um objeto
        new_txs = data if isinstance(data, list) else [data]
        
        # Validação simples
        for tx in new_txs:
            if not tx.get("descricao") and not tx.get("n_dcto"):
                return jsonify({"error": "Descrição ou Nº DCTO obrigatórios para cada transação"}), 400
                
        added = excel_manager.add_transactions(new_txs)
        return jsonify({"success": True, "added_count": added}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions/<int:tx_id>', methods=['PUT'])
def update_transaction(tx_id):
    """Atualiza uma transação específica"""
    try:
        tx_data = request.get_json()
        if not tx_data:
            return jsonify({"error": "Dados inválidos"}), 400
            
        success = excel_manager.update_transaction(tx_id, tx_data)
        if success:
            return jsonify({"success": True})
        return jsonify({"error": "Não foi possível atualizar"}), 400
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions/<int:tx_id>', methods=['DELETE'])
def delete_transaction(tx_id):
    """Exclui uma transação na planilha (limpando a linha)"""
    try:
        success = excel_manager.delete_transaction(tx_id)
        if success:
            return jsonify({"success": True})
        return jsonify({"error": "Não foi possível excluir"}), 400
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
