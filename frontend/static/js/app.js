// ==========================================================================
// FINSCRIPT FRONTEND ENGINE - APPLICATION JAVASCRIPT
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let state = {
        transactions: [],
        categories: {},
        reports: {},
        dashboard: {},
        isEditMode: false,
        editRowId: null
    };

    // Chart instances
    let charts = {
        cashflow: null,
        subgroup: null,
        projection: null
    };

    // DOM Elements
    const tabButtons = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabTitle = document.getElementById('tab-title');
    const tabSubtitle = document.getElementById('tab-subtitle');
    const openAddModalBtn = document.getElementById('open-add-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const saveModalBtn = document.getElementById('save-modal-btn');
    const addModal = document.getElementById('add-modal');
    
    // Modal Subtabs
    const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
    const modalTabContents = document.querySelectorAll('.modal-tab-content');
    
    // Grid Table Elements
    const modalGridBody = document.getElementById('modal-grid-body');
    const addGridRowBtn = document.getElementById('add-grid-row-btn');
    const bulkTabHeader = document.getElementById('bulk-tab-header');
    
    // Bulk Elements
    const bulkTextarea = document.getElementById('bulk-text');
    const parseBulkBtn = document.getElementById('parse-bulk-btn');
    
    // Filters
    const txSearch = document.getElementById('tx-search');
    const filterConta = document.getElementById('filter-conta');
    const filterStatus = document.getElementById('filter-status');
    const filterVencida = document.getElementById('filter-vencida');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    // Selects in charts
    const subgroupPeriodSelect = document.getElementById('subgroup-period-select');
    const subgroupMonthSelect = document.getElementById('subgroup-month-select');

    // ======================================================================
    // 1. Navigation & Tabs
    // ======================================================================
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
            
            // Update Page Titles
            if (targetTab === 'dashboard-tab') {
                tabTitle.textContent = 'Dashboard Financeiro';
                tabSubtitle.textContent = 'Visão geral do fluxo de caixa e despesas';
                // Trigger chart resizing to prevent layout bugs
                setTimeout(() => {
                    Object.values(charts).forEach(c => c && c.windowResizeHandler());
                }, 50);
            } else if (targetTab === 'reports-tab') {
                tabTitle.textContent = 'Relatórios de Contas';
                tabSubtitle.textContent = 'Demonstrativos e saldos por conta';
            } else if (targetTab === 'transactions-tab') {
                tabTitle.textContent = 'Gerenciador de Lançamentos';
                tabSubtitle.textContent = 'Lista completa e filtros de transações';
            }
        });
    });

    // ======================================================================
    // 2. Data Fetching
    // ======================================================================
    async function fetchCategories() {
        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                state.categories = await response.json();
            } else {
                console.error("Erro ao carregar categorias");
            }
        } catch (error) {
            console.error("Erro na requisição das categorias:", error);
        }
    }

    async function fetchAllData() {
        try {
            const response = await fetch('/api/data');
            if (response.ok) {
                const data = await response.json();
                state.transactions = data.transactions;
                state.reports = data.reports;
                state.dashboard = data.dashboard;
                
                // Refresh UI
                updateKPIs();
                renderReportsTable();
                renderTransactionsTable();
                initOrUpdateCharts();
                populateMonthSelector();
            } else {
                console.error("Erro ao carregar dados financeiros");
            }
        } catch (error) {
            console.error("Erro na requisição dos dados:", error);
        }
    }

    // ======================================================================
    // 3. UI Render: KPIs & Tables
    // ======================================================================
    function formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    }

    function updateKPIs() {
        const kpis = state.dashboard.kpis || {};
        document.getElementById('kpi-atrasadas').textContent = formatCurrency(kpis.contas_atrasadas);
        document.getElementById('kpi-vencendo').textContent = formatCurrency(kpis.contas_vencendo_hoje);
        document.getElementById('kpi-recebimentos-hoje').textContent = formatCurrency(kpis.recebimentos_vencendo_hoje);
        document.getElementById('kpi-recebimentos-atrasados').textContent = formatCurrency(kpis.recebimentos_atrasados);
    }

    function renderReportsTable() {
        const tbody = document.querySelector('#reports-table tbody');
        tbody.innerHTML = '';
        
        const accounts = Object.keys(state.reports);
        if (accounts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--text-muted);">Nenhuma conta movimentada ainda.</td></tr>`;
            return;
        }

        accounts.forEach(acc => {
            const report = state.reports[acc];
            const tr = document.createElement('tr');
            
            const balanceClass = report.balance >= 0 ? 'badge-success' : 'badge-danger';
            
            tr.innerHTML = `
                <td><strong>${acc}</strong></td>
                <td class="text-right" style="color: var(--success);">${formatCurrency(report.credit)}</td>
                <td class="text-right" style="color: var(--danger);">${formatCurrency(report.debit)}</td>
                <td class="text-right">
                    <span class="badge ${balanceClass}">${formatCurrency(report.balance)}</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderTransactionsTable() {
        const tbody = document.querySelector('#transactions-table tbody');
        tbody.innerHTML = '';
        
        // Apply Filters
        const searchVal = txSearch.value.toLowerCase();
        const contaVal = filterConta.value;
        const statusVal = filterStatus.value;
        const vencidaVal = filterVencida.value;
        
        const filtered = state.transactions.filter(tx => {
            const matchesSearch = !searchVal || (tx.descricao && tx.descricao.toLowerCase().includes(searchVal));
            const matchesConta = !contaVal || tx.conta === contaVal;
            const matchesStatus = !statusVal || tx.status === statusVal;
            const matchesVencida = !vencidaVal || tx.vencida === vencidaVal;
            return matchesSearch && matchesConta && matchesStatus && matchesVencida;
        });

        document.getElementById('tx-count').textContent = `Mostrando ${filtered.length} lançamentos`;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="text-center" style="color: var(--text-muted); padding: 30px;">Nenhum lançamento corresponde aos filtros.</td></tr>`;
            return;
        }

        // Sort by row/id desc (newer first)
        filtered.sort((a, b) => b.id - a.id);

        filtered.forEach(tx => {
            const tr = document.createElement('tr');
            
            const statusBadge = tx.status === 'Realizado' ? 'badge-success' : 'badge-warning';
            const vencidaBadge = tx.vencida === 'Vencida' ? 'badge-danger' : 'badge-success';
            
            const valor = tx.entradas > 0 ? tx.entradas : tx.saidas;
            const valorColor = tx.entradas > 0 ? 'var(--success)' : 'var(--danger)';
            const prefixo = tx.entradas > 0 ? '+' : '-';
            
            tr.innerHTML = `
                <td><code style="color: var(--text-muted);">${tx.n_dcto || ''}</code></td>
                <td><strong>${tx.descricao || ''}</strong></td>
                <td>${tx.data_vcto ? tx.data_vcto.split('-').reverse().join('/') : ''}</td>
                <td>${tx.data_pgto ? tx.data_pgto.split('-').reverse().join('/') : ''}</td>
                <td>${tx.parcela || '1/1'}</td>
                <td>${tx.conta || ''}</td>
                <td>
                    <span style="font-size:0.8rem; color:var(--text-secondary);">${tx.grupo || ''}</span><br>
                    <span style="font-size:0.85rem; font-weight:600; color:white;">${tx.subgrupo || ''}</span>
                </td>
                <td class="text-right" style="color: ${valorColor}; font-weight:600;">
                    ${prefixo} ${formatCurrency(valor)}
                </td>
                <td><span class="badge ${statusBadge}">${tx.status}</span></td>
                <td><span class="badge ${vencidaBadge}">${tx.vencida}</span></td>
                <td class="text-center">
                    <button class="btn-icon-primary edit-tx-btn" data-id="${tx.id}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-icon-danger delete-tx-btn" data-id="${tx.id}" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add Edit & Delete Event Listeners
        document.querySelectorAll('.edit-tx-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')));
        });
        
        document.querySelectorAll('.delete-tx-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteTransaction(btn.getAttribute('data-id')));
        });
    }

    // Filter controls
    txSearch.addEventListener('input', renderTransactionsTable);
    filterConta.addEventListener('change', renderTransactionsTable);
    filterStatus.addEventListener('change', renderTransactionsTable);
    filterVencida.addEventListener('change', renderTransactionsTable);
    clearFiltersBtn.addEventListener('click', () => {
        txSearch.value = '';
        filterConta.value = '';
        filterStatus.value = '';
        filterVencida.value = '';
        renderTransactionsTable();
    });

    // ======================================================================
    // 4. Charts Management (ApexCharts)
    // ======================================================================
    function initOrUpdateCharts() {
        const dashboard = state.dashboard || {};
        
        // --- CHART 1: CASH FLOW (ENTRADAS VS SAÍDAS MENSAL) ---
        const monthlyData = calculateMonthlyTotals();
        const cashflowOptions = {
            chart: {
                type: 'bar',
                height: 320,
                background: 'transparent',
                toolbar: { show: false }
            },
            theme: { mode: 'dark' },
            colors: [state.transactions.length > 0 ? '#10B981' : '#6B7280', '#F43F5E'], // Emerald, Rose
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    columnWidth: '55%'
                }
            },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['transparent'] },
            series: [
                { name: 'Receitas (Entradas)', data: monthlyData.entradas },
                { name: 'Despesas (Saídas)', data: monthlyData.saidas }
            ],
            xaxis: {
                categories: monthlyData.labels,
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: {
                    formatter: (val) => formatCurrency(val)
                }
            },
            grid: {
                borderColor: 'rgba(255, 255, 255, 0.05)',
                strokeDashArray: 4
            },
            legend: { position: 'top', horizontalAlign: 'right' },
            tooltip: {
                theme: 'dark',
                y: { formatter: (val) => formatCurrency(val) }
            }
        };

        if (charts.cashflow) {
            charts.cashflow.updateOptions(cashflowOptions);
        } else {
            charts.cashflow = new ApexCharts(document.querySelector("#cashflow-chart"), cashflowOptions);
            charts.cashflow.render();
        }

        // --- CHART 2: EXPENSES BREAKDOWN BY SUBGROUP ---
        renderSubgroupChart();

        // --- CHART 3: CASH FLOW TIMELINE PROJECTION ---
        const timeline = dashboard.timeline || [];
        const timelineDates = timeline.map(t => t.date);
        const timelineEntradas = timeline.map(t => t.entradas);
        const timelineSaidas = timeline.map(t => t.saidas);
        
        // Calculate cumulative balance
        let balanceAcc = 0;
        const timelineBalance = timeline.map(t => {
            balanceAcc += (t.entradas - t.saidas);
            return balanceAcc;
        });

        const projectionOptions = {
            chart: {
                type: 'area',
                height: 280,
                background: 'transparent',
                toolbar: { show: false }
            },
            theme: { mode: 'dark' },
            colors: ['#8B5CF6', '#10B981', '#F43F5E'], // Violet, Emerald, Rose
            stroke: { curve: 'smooth', width: 2 },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.3,
                    opacityTo: 0.02,
                    stops: [0, 90, 100]
                }
            },
            series: [
                { name: 'Saldo Projetado', data: timelineBalance },
                { name: 'Entradas Previstas', data: timelineEntradas },
                { name: 'Saídas Previstas', data: timelineSaidas }
            ],
            xaxis: {
                type: 'datetime',
                categories: timelineDates,
                axisBorder: { show: false }
            },
            yaxis: {
                labels: { formatter: (val) => formatCurrency(val) }
            },
            grid: {
                borderColor: 'rgba(255, 255, 255, 0.05)'
            },
            tooltip: {
                x: { format: 'dd/MM/yyyy' },
                y: { formatter: (val) => formatCurrency(val) }
            }
        };

        if (charts.projection) {
            charts.projection.updateOptions(projectionOptions);
        } else {
            charts.projection = new ApexCharts(document.querySelector("#projection-chart"), projectionOptions);
            charts.projection.render();
        }
    }

    function calculateMonthlyTotals() {
        const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const entradas = Array(12).fill(0.0);
        const saidas = Array(12).fill(0.0);
        
        const currentYear = new Date().getFullYear();

        state.transactions.forEach(tx => {
            const dateStr = tx.data_pgto || tx.data_vcto;
            if (dateStr) {
                const date = new Date(dateStr + 'T00:00:00');
                if (date.getFullYear() === currentYear) {
                    const m = date.getMonth();
                    entradas[m] += tx.entradas;
                    saidas[m] += tx.saidas;
                }
            }
        });

        return {
            labels: months,
            entradas,
            saidas
        };
    }

    function populateMonthSelector() {
        // Find all unique months in transactions to populate dropdown
        const monthsMap = {};
        
        state.transactions.forEach(tx => {
            const dateStr = tx.data_pgto || tx.data_vcto;
            if (dateStr) {
                const date = new Date(dateStr + 'T00:00:00');
                const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const name = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
                monthsMap[ym] = name.charAt(0).toUpperCase() + name.slice(1);
            }
        });

        const sortedYMs = Object.keys(monthsMap).sort().reverse();
        
        // Store current select val
        const currentVal = subgroupMonthSelect.value;
        subgroupMonthSelect.innerHTML = '';

        if (sortedYMs.length === 0) {
            const now = new Date();
            const ymNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            subgroupMonthSelect.innerHTML = `<option value="${ymNow}">Este Mês</option>`;
            return;
        }

        sortedYMs.forEach(ym => {
            const opt = document.createElement('option');
            opt.value = ym;
            opt.textContent = monthsMap[ym];
            subgroupMonthSelect.appendChild(opt);
        });

        if (currentVal && sortedYMs.includes(currentVal)) {
            subgroupMonthSelect.value = currentVal;
        }
    }

    function renderSubgroupChart() {
        const isMonthly = subgroupPeriodSelect.value === 'monthly';
        const selectedPeriod = isMonthly ? subgroupMonthSelect.value : new Date().getFullYear().toString();
        
        let subgroupData = {};
        
        if (isMonthly) {
            // Read ttgm from state
            subgroupData = state.dashboard.ttgm[selectedPeriod] || {};
        } else {
            // Read ttga from state
            subgroupData = state.dashboard.ttga[selectedPeriod] || {};
        }

        const labels = Object.keys(subgroupData);
        const values = Object.values(subgroupData);

        const subgroupOptions = {
            chart: {
                type: 'donut',
                height: 320,
                background: 'transparent'
            },
            theme: { mode: 'dark' },
            labels: labels.length > 0 ? labels : ['Sem dados'],
            series: values.length > 0 ? values : [0.1], // small dummy value to show empty donut
            colors: ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'],
            dataLabels: { enabled: true },
            legend: { position: 'bottom' },
            tooltip: {
                theme: 'dark',
                y: { formatter: (val) => formatCurrency(val) }
            },
            noData: {
                text: 'Nenhuma despesa para este período',
                align: 'center',
                verticalAlign: 'middle',
                style: { color: 'var(--text-muted)', fontSize: '14px' }
            }
        };

        if (charts.subgroup) {
            charts.subgroup.updateOptions(subgroupOptions);
        } else {
            charts.subgroup = new ApexCharts(document.querySelector("#subgroup-chart"), subgroupOptions);
            charts.subgroup.render();
        }
    }

    subgroupPeriodSelect.addEventListener('change', () => {
        if (subgroupPeriodSelect.value === 'monthly') {
            subgroupMonthSelect.style.display = 'block';
        } else {
            subgroupMonthSelect.style.display = 'none';
        }
        renderSubgroupChart();
    });

    subgroupMonthSelect.addEventListener('change', renderSubgroupChart);

    // ======================================================================
    // 5. Multi-line Modal UI & Operations
    // ======================================================================
    
    // Modal Tab Swapping
    modalTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modalTabBtns.forEach(b => b.classList.remove('active'));
            modalTabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetContent = btn.getAttribute('data-modal-tab');
            document.getElementById(targetContent).classList.add('active');
        });
    });

    function resetModal() {
        modalGridBody.innerHTML = '';
        bulkTextarea.value = '';
        document.getElementById('modal-status-msg').textContent = '';
        
        // Reset modal subtabs
        modalTabBtns.forEach(b => b.classList.remove('active'));
        modalTabContents.forEach(c => c.classList.remove('active'));
        
        modalTabBtns[0].classList.add('active');
        modalTabContents[0].classList.add('active');
        
        state.isEditMode = false;
        state.editRowId = null;
        bulkTabHeader.style.display = 'block'; // Ensure bulk mode tab is visible in add mode
        
        document.getElementById('modal-title-text').textContent = 'Lançamento de Transações';
    }

    function createGridRow(data = {}) {
        const tr = document.createElement('tr');
        
        // Gen Group options
        const groups = Object.keys(state.categories);
        let groupOpts = `<option value="">-- Selecione --</option>`;
        groups.forEach(g => {
            const selected = data.grupo === g ? 'selected' : '';
            groupOpts += `<option value="${g}" ${selected}>${g}</option>`;
        });

        // Gen Account options
        const accountList = ['Banco', 'Cédula'];
        let accountOpts = '';
        accountList.forEach(acc => {
            const selected = data.conta === acc ? 'selected' : '';
            accountOpts += `<option value="${acc}" ${selected}>${acc}</option>`;
        });

        // Determine if paid
        const isPaid = !!data.data_pgto;
        const paidChecked = isPaid ? 'checked' : '';
        const pgtoDate = data.data_pgto || '';
        
        // Determine value & type
        let val = '';
        let type = 'Saída';
        if (data.entradas > 0) {
            val = data.entradas;
            type = 'Entrada';
        } else if (data.saidas > 0) {
            val = data.saidas;
            type = 'Saída';
        }

        tr.innerHTML = `
            <td>
                <input type="text" class="grid-input col-dcto" value="${data.n_dcto || ''}" placeholder="Doc">
            </td>
            <td>
                <input type="text" class="grid-input col-desc" value="${data.descricao || ''}" placeholder="Descrição...">
            </td>
            <td>
                <input type="date" class="grid-input col-vcto" value="${data.data_vcto || ''}">
            </td>
            <td style="text-align: center;">
                <label class="grid-checkbox-label">
                    <input type="checkbox" class="grid-checkbox col-pago" ${paidChecked}>
                </label>
            </td>
            <td>
                <input type="date" class="grid-input col-pgto" value="${pgtoDate}" ${isPaid ? '' : 'disabled'}>
            </td>
            <td>
                <input type="text" class="grid-input col-part" value="${data.parcela || '1/1'}" placeholder="1/1">
            </td>
            <td>
                <input type="number" step="0.01" min="0" class="grid-input col-val" value="${val}" placeholder="0,00">
            </td>
            <td>
                <select class="grid-select col-tipo">
                    <option value="Saída" ${type === 'Saída' ? 'selected' : ''}>Saída</option>
                    <option value="Entrada" ${type === 'Entrada' ? 'selected' : ''}>Entrada</option>
                </select>
            </td>
            <td>
                <select class="grid-select col-conta">
                    ${accountOpts}
                </select>
            </td>
            <td>
                <div class="double-select-cell">
                    <select class="grid-select col-grupo">
                        ${groupOpts}
                    </select>
                    <select class="grid-select col-subgrupo">
                        <option value="">-- Subgrupo --</option>
                    </select>
                </div>
            </td>
            <td style="text-align: center;">
                <button class="btn-icon-danger btn-remove-grid-row" title="Remover"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;

        modalGridBody.appendChild(tr);

        // Setup dynamic subcategories binding on Group change
        const groupSelect = tr.querySelector('.col-grupo');
        const subgrupoSelect = tr.querySelector('.col-subgrupo');

        function updateSubgroups(selectedGroup, selectedSub = '') {
            subgrupoSelect.innerHTML = `<option value="">-- Subgrupo --</option>`;
            if (selectedGroup && state.categories[selectedGroup]) {
                state.categories[selectedGroup].forEach(sub => {
                    const opt = document.createElement('option');
                    opt.value = sub;
                    opt.textContent = sub;
                    if (selectedSub === sub) opt.selected = true;
                    subgrupoSelect.appendChild(opt);
                });
            }
        }

        // Initialize subgroups if group exists
        if (data.grupo) {
            updateSubgroups(data.grupo, data.subgrupo);
        }

        groupSelect.addEventListener('change', () => {
            updateSubgroups(groupSelect.value);
        });

        // Setup dynamic "Pago?" checkbox binding to Payment Date input
        const pagoCheckbox = tr.querySelector('.col-pago');
        const pgtoInput = tr.querySelector('.col-pgto');
        const vctoInput = tr.querySelector('.col-vcto');

        pagoCheckbox.addEventListener('change', () => {
            if (pagoCheckbox.checked) {
                pgtoInput.disabled = false;
                // If payment date is empty, default to vencimento date
                if (!pgtoInput.value) {
                    pgtoInput.value = vctoInput.value || new Date().toISOString().split('T')[0];
                }
            } else {
                pgtoInput.value = '';
                pgtoInput.disabled = true;
            }
        });

        // Setup delete row listener
        tr.querySelector('.btn-remove-grid-row').addEventListener('click', () => {
            // Ensure at least 1 row is left
            if (modalGridBody.querySelectorAll('tr').length > 1) {
                tr.remove();
            } else {
                alert("O lançamento precisa conter pelo menos uma linha.");
            }
        });
    }

    // Modal triggers
    openAddModalBtn.addEventListener('click', () => {
        resetModal();
        createGridRow(); // Add one initial empty row
        addModal.classList.add('active');
    });

    addGridRowBtn.addEventListener('click', () => {
        createGridRow();
    });

    function closeModal() {
        addModal.classList.remove('active');
        resetModal();
    }

    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    // ======================================================================
    // 6. CSV Bulk Text Parser
    // ======================================================================
    parseBulkBtn.addEventListener('click', () => {
        const text = bulkTextarea.value.trim();
        if (!text) {
            alert("Por favor, cole alguma linha de texto separada por vírgula.");
            return;
        }

        const lines = text.split('\n');
        let loadedCount = 0;
        let errors = [];

        // Clear existing empty grid row if it's the only one
        const rows = modalGridBody.querySelectorAll('tr');
        const firstRowDesc = rows[0]?.querySelector('.col-desc').value;
        const firstRowVal = rows[0]?.querySelector('.col-val').value;
        if (rows.length === 1 && !firstRowDesc && !firstRowVal) {
            modalGridBody.innerHTML = '';
        }

        lines.forEach((line, idx) => {
            line = line.trim();
            if (!line) return; // skip empty lines

            const cols = line.split(',').map(c => c.trim());
            
            // Format: doc, descrição, data_vencimento, pago_sn, conta, grupo, subgrupo, valor, tipo
            if (cols.length < 8) {
                errors.push(`Linha ${idx+1}: Menos de 8 colunas fornecidas.`);
                return;
            }

            const doc = cols[0];
            const desc = cols[1];
            const vcto = cols[2];
            const pago_sn = cols[3].toUpperCase();
            const conta = cols[4];
            const grupo = cols[5];
            const subgrupo = cols[6];
            const val = parseFloat(cols[7]);
            const tipo = cols[8] ? cols[8].trim() : 'Saída'; // Entrada or Saída

            if (isNaN(val)) {
                errors.push(`Linha ${idx+1}: Valor inválido: ${cols[7]}`);
                return;
            }

            // Map variables
            const data = {
                n_dcto: doc,
                descricao: desc,
                data_vcto: vcto,
                data_pgto: (pago_sn === 'S' || pago_sn === 'Y' || pago_sn === 'SIM' || pago_sn === '1') ? vcto : null,
                parcela: '1/1',
                entradas: tipo.toLowerCase() === 'entrada' ? val : 0.0,
                saidas: tipo.toLowerCase() === 'saída' || tipo.toLowerCase() === 'saida' ? val : 0.0,
                conta: conta,
                grupo: grupo,
                subgrupo: subgrupo
            };

            createGridRow(data);
            loadedCount++;
        });

        if (errors.length > 0) {
            alert(`Processamento completo com alguns erros:\n\n${errors.join('\n')}`);
        } else {
            // Swap tab back to Visual Grid
            modalTabBtns[0].click();
            document.getElementById('modal-status-msg').innerHTML = `<span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> ${loadedCount} linhas carregadas no Grid! Revise antes de salvar.</span>`;
        }
    });

    // ======================================================================
    // 7. Save and Delete Actions
    // ======================================================================
    saveModalBtn.addEventListener('click', async () => {
        const rows = modalGridBody.querySelectorAll('tr');
        const transactionsToSave = [];
        let validationError = null;

        rows.forEach((row, idx) => {
            if (validationError) return;

            const doc = row.querySelector('.col-dcto').value.trim();
            const desc = row.querySelector('.col-desc').value.trim();
            const vcto = row.querySelector('.col-vcto').value;
            const pago = row.querySelector('.col-pago').checked;
            const pgto = row.querySelector('.col-pgto').value;
            const part = row.querySelector('.col-part').value.trim();
            const val = parseFloat(row.querySelector('.col-val').value);
            const tipo = row.querySelector('.col-tipo').value;
            const conta = row.querySelector('.col-conta').value;
            const grupo = row.querySelector('.col-grupo').value;
            const subgrupo = row.querySelector('.col-subgrupo').value;

            // Simple validation
            if (!desc) {
                validationError = `Linha ${idx+1}: Descrição é obrigatória.`;
                return;
            }
            if (!vcto) {
                validationError = `Linha ${idx+1}: Data de Vencimento é obrigatória.`;
                return;
            }
            if (isNaN(val) || val <= 0) {
                validationError = `Linha ${idx+1}: Valor deve ser um número maior que zero.`;
                return;
            }
            if (pago && !pgto) {
                validationError = `Linha ${idx+1}: Como está marcada como Paga, informe a Data de Pagamento.`;
                return;
            }

            const tx = {
                n_dcto: doc ? parseFloat(doc) || doc : null,
                descricao: desc,
                data_vcto: vcto,
                data_pgto: pago ? pgto : null,
                parcela: part || '1/1',
                entradas: tipo === 'Entrada' ? val : 0.0,
                saidas: tipo === 'Saída' ? val : 0.0,
                conta: conta,
                grupo: grupo,
                subgrupo: subgrupo
            };

            transactionsToSave.push(tx);
        });

        if (validationError) {
            alert(validationError);
            return;
        }

        // Save
        const statusMsg = document.getElementById('modal-status-msg');
        statusMsg.style.color = 'var(--text-primary)';
        statusMsg.textContent = 'Salvando no Excel...';

        try {
            let url = '/api/transactions';
            let method = 'POST';
            let payload = transactionsToSave;

            if (state.isEditMode) {
                url = `/api/transactions/${state.editRowId}`;
                method = 'PUT';
                payload = transactionsToSave[0]; // edit is single item
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: json = JSON.stringify(payload)
            });

            if (response.ok) {
                statusMsg.style.color = 'var(--success)';
                statusMsg.textContent = 'Gravado com sucesso!';
                setTimeout(() => {
                    closeModal();
                    fetchAllData();
                }, 1000);
            } else {
                const err = await response.json();
                statusMsg.style.color = 'var(--danger)';
                statusMsg.textContent = `Erro: ${err.error || 'Falha ao salvar'}`;
            }
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            statusMsg.style.color = 'var(--danger)';
            statusMsg.textContent = 'Erro de conexão.';
        }
    });

    async function openEditModal(txId) {
        resetModal();
        state.isEditMode = true;
        state.editRowId = txId;
        
        // Find transaction
        const tx = state.transactions.find(t => t.id == txId);
        if (!tx) {
            alert("Lançamento não encontrado.");
            return;
        }

        // Change modal labels
        document.getElementById('modal-title-text').textContent = 'Editar Lançamento';
        bulkTabHeader.style.display = 'none'; // Hide bulk mode tab in edit mode

        // Load grid row with data
        createGridRow(tx);
        addModal.classList.add('active');
    }

    async function deleteTransaction(txId) {
        if (!confirm("Deseja realmente excluir este lançamento do Excel? Essa ação limpará a linha na tabela.")) {
            return;
        }

        try {
            const response = await fetch(`/api/transactions/${txId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchAllData();
            } else {
                const err = await response.json();
                alert(`Erro: ${err.error || 'Não foi possível excluir'}`);
            }
        } catch (error) {
            console.error("Erro na exclusão:", error);
            alert("Erro de conexão.");
        }
    }

    // ======================================================================
    // 8. Initialization
    // ======================================================================
    async function init() {
        await fetchCategories();
        await fetchAllData();
    }

    init();
});
