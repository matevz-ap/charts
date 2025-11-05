// Chart Editor Module
// Handles the editing panel and chart modification

import { chartInstances, getChartInstance, updateChartData, deleteChartInstance } from './chartManager.js';
import { deleteChart } from './storage.js';

function getEditPanel() {
    return document.getElementById('editPanel');
}

function getEditPanelContent() {
    return document.getElementById('editPanelContent');
}

export function openEditPanel(chartId) {
    const editPanel = getEditPanel();
    const editPanelContent = getEditPanelContent();
    
    // Remove active class from all charts
    document.querySelectorAll('.draggable-chart').forEach(chart => {
        chart.classList.remove('active');
    });
    
    // Find the chart instance
    const chartInstance = getChartInstance(chartId);
    if (!chartInstance) return;
    
    chartInstances[chartId] = chartInstance;
    
    // Add active class to the chart being edited
    const wrapper = document.querySelector(`[data-chart-id="${chartId}"]`);
    if (wrapper) {
        wrapper.classList.add('active');
    }
    
    // Create editing controls
    editPanelContent.innerHTML = `
        <div class="form-group">
            <label><strong>Chart Type:</strong></label>
            <select id="chartTypeSelect">
                <option value="bar" ${chartInstance.config.type === 'bar' ? 'selected' : ''}>Bar</option>
                <option value="line" ${chartInstance.config.type === 'line' ? 'selected' : ''}>Line</option>
                <option value="pie" ${chartInstance.config.type === 'pie' ? 'selected' : ''}>Pie</option>
                <option value="doughnut" ${chartInstance.config.type === 'doughnut' ? 'selected' : ''}>Doughnut</option>
            </select>
        </div>
        <div class="form-group">
            <label><strong>Chart Title:</strong></label>
            <input type="text" id="chartTitleInput" placeholder="Chart Title">
        </div>
        <div class="form-group">
            <label><strong>Chart Data:</strong></label>
            <table id="chartDataTable" class="data-table">
                <thead>
                    <tr>
                        <th>Label</th>
                        <th>Value</th>
                        <th><button type="button" id="addDataRowBtn" class="add-row-btn mb-0">+</button></th>
                    </tr>
                </thead>
                <tbody id="chartDataTableBody">
                </tbody>
            </table>
        </div>
        <div style="margin-top: 20px;">
            <div style="margin-bottom: 10px;">
                <button id="applyChangesBtn" class="primary" style="width: 100%;">
                    Apply Changes
                </button>
            </div>
            <div style="margin-bottom: 10px;">
                <button id="downloadChartBtn" class="outline contrast" style="width: 100%;">
                    Download Image
                </button>
            </div>
            <div>
                <button id="deleteChartBtn" class="contrast" style="width: 100%;">
                    Delete Chart
                </button>
            </div>
        </div>
    `;

    // Populate current values in table
    const tableBody = document.getElementById('chartDataTableBody');
    tableBody.innerHTML = '';
    const labels = chartInstance.data.labels || [];
    const data = chartInstance.data.datasets[0]?.data || [];
    
    // Create rows for existing data
    const maxLength = Math.max(labels.length, data.length);
    for (let i = 0; i < maxLength; i++) {
        addDataRow(tableBody, labels[i] || '', data[i] || '');
    }
    
    // If no data, add one empty row
    if (maxLength === 0) {
        addDataRow(tableBody, '', '');
    }
    
    // Add row button handler
    document.getElementById('addDataRowBtn').addEventListener('click', function() {
        addDataRow(tableBody, '', '');
    });

    // Get current title if it exists
    const currentTitle = chartInstance.options.plugins?.title?.text || '';
    if (currentTitle) {
        document.getElementById('chartTitleInput').value = currentTitle;
    }

    // Apply changes handler
    document.getElementById('applyChangesBtn').addEventListener('click', function() {
        applyChartChanges(chartId);
    });

    // Chart type change handler
    document.getElementById('chartTypeSelect').addEventListener('change', function() {
        applyChartChanges(chartId);
    });

    // Download chart handler
    document.getElementById('downloadChartBtn').addEventListener('click', function() {
        downloadChartAsImage(chartId);
    });

    // Delete chart handler
    document.getElementById('deleteChartBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this chart?')) {
            deleteChartInstance(chartId);
            closeEditPanel();
        }
    });

    // Show panel
    editPanel.classList.add('open');
}

function downloadChartAsImage(chartId) {
    const chartInstance = chartInstances[chartId];
    if (!chartInstance) return;

    const canvas = chartInstance.canvas;
    if (!canvas) return;

    // Create a download link
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `chart-${chartId}-${Date.now()}.png`;
    link.href = url;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function addDataRow(tableBody, label = '', value = '') {
    const row = document.createElement('tr');
    
    // Create label input
    const labelCell = document.createElement('td');
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'data-label-input';
    labelInput.value = label;
    labelInput.placeholder = 'Label';
    labelCell.appendChild(labelInput);
    
    // Create value input
    const valueCell = document.createElement('td');
    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'data-value-input';
    valueInput.value = value;
    valueInput.placeholder = 'Value';
    valueInput.step = 'any';
    valueCell.appendChild(valueInput);
    
    // Create remove button cell
    const removeCell = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-row-btn';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', function() {
        row.remove();
        // Ensure at least one row exists
        if (tableBody.children.length === 0) {
            addDataRow(tableBody, '', '');
        }
    });
    removeCell.appendChild(removeBtn);
    
    // Assemble row
    row.appendChild(labelCell);
    row.appendChild(valueCell);
    row.appendChild(removeCell);
    tableBody.appendChild(row);
}

function applyChartChanges(chartId) {
    const chartInstance = chartInstances[chartId];
    if (!chartInstance) return;

    const typeSelect = document.getElementById('chartTypeSelect');
    const titleInput = document.getElementById('chartTitleInput');
    const tableBody = document.getElementById('chartDataTableBody');

    // Update chart type
    chartInstance.config.type = typeSelect.value;

    // Read labels and data from table
    const rows = tableBody.querySelectorAll('tr');
    const labels = [];
    const data = [];
    
    rows.forEach(row => {
        const labelInput = row.querySelector('.data-label-input');
        const valueInput = row.querySelector('.data-value-input');
        const label = labelInput ? labelInput.value.trim() : '';
        const value = valueInput ? parseFloat(valueInput.value) : NaN;
        
        // Only add if both label and value are provided
        if (label && !isNaN(value)) {
            labels.push(label);
            data.push(value);
        }
    });

    // Update labels and data
    chartInstance.data.labels = labels;
    if (chartInstance.data.datasets[0]) {
        chartInstance.data.datasets[0].data = data;
    }

    // Update title if provided
    if (titleInput) {
        if (!chartInstance.options.plugins) {
            chartInstance.options.plugins = {};
        }
        
        if (titleInput.value.trim()) {
            // Set title
            chartInstance.options.plugins.title = {
                display: true,
                text: titleInput.value.trim(),
                font: {
                    size: 16,
                    weight: 'bold'
                },
                padding: {
                    top: 10,
                    bottom: 10
                }
            };
        } else {
            // Remove title if input is empty
            chartInstance.options.plugins.title = {
                display: false
            };
        }
    }

    // Update chart - use 'none' mode to prevent animation issues
    chartInstance.update('none');
    
    // Save to local storage
    updateChartData(chartId);
}

export function closeEditPanel() {
    const editPanel = getEditPanel();
    editPanel.classList.remove('open');
    
    // Remove active class from all charts when closing the panel
    document.querySelectorAll('.draggable-chart').forEach(chart => {
        chart.classList.remove('active');
    });
}

