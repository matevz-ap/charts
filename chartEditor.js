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
    <div class="edit-panel-content-inner"> 
    <div class="edit-panel-content-inner-inner">
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
                        <th>Color</th>
                        <th><button type="button" id="addDataRowBtn" class="add-row-btn mb-0">+</button></th>
                    </tr>
                </thead>
                <tbody id="chartDataTableBody">
                </tbody>
            </table>
        </div>
        </div>
        <div class="actions-container">
        <div class="actions">
            <button id="applyChangesBtn" class="primary" style="width: 100%;">
                Apply Changes
            </button>
            <button id="downloadChartBtn" class="outline contrast">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" height="24" width="24">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25" />
</svg>

            </button>
            <button id="deleteChartBtn" class="contrast">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" height="24" width="24">
  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
</svg>

            </button>
                </div>
            </div>
        </div>
    `;

    // Populate current values in table
    const tableBody = document.getElementById('chartDataTableBody');
    tableBody.innerHTML = '';
    const labels = chartInstance.data.labels || [];
    const data = chartInstance.data.datasets[0]?.data || [];
    const colors = chartInstance.data.datasets[0]?.backgroundColor || [];
    
    // Create rows for existing data
    const maxLength = Math.max(labels.length, data.length, colors.length);
    for (let i = 0; i < maxLength; i++) {
        addDataRow(tableBody, labels[i] || '', data[i] || '', colors[i] || '');
    }
    
    // If no data, add one empty row
    if (maxLength === 0) {
        addDataRow(tableBody, '', '', '');
    }
    
    // Add row button handler
    document.getElementById('addDataRowBtn').addEventListener('click', function() {
        addDataRow(tableBody, '', '', '');
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

function addDataRow(tableBody, label = '', value = '', color = '') {
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
    
    // Create color input
    const colorCell = document.createElement('td');
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'data-color-input';
    // Convert rgba/rgb to hex if needed, otherwise use default or provided color
    if (color) {
        // Handle rgba/rgb colors by converting to hex
        const hexColor = rgbaToHex(color) || color;
        colorInput.value = hexColor;
    } else {
        // Default color if none provided
        colorInput.value = '#007bff';
    }
    colorCell.appendChild(colorInput);
    
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
            addDataRow(tableBody, '', '', '');
        }
    });
    removeCell.appendChild(removeBtn);
    
    // Assemble row
    row.appendChild(labelCell);
    row.appendChild(valueCell);
    row.appendChild(colorCell);
    row.appendChild(removeCell);
    tableBody.appendChild(row);
}

// Helper function to convert rgba/rgb to hex
function rgbaToHex(color) {
    if (!color) return null;
    
    // If already hex, return as is
    if (color.startsWith('#')) {
        return color;
    }
    
    // Handle rgba/rgb format
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1], 10);
        const g = parseInt(rgbaMatch[2], 10);
        const b = parseInt(rgbaMatch[3], 10);
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    return null;
}

// Helper function to convert hex to rgba
function hexToRgba(hex, alpha = 1) {
    if (!hex || !hex.startsWith('#')) {
        return hex || 'rgba(0, 123, 255, ' + alpha + ')';
    }
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyChartChanges(chartId) {
    const chartInstance = chartInstances[chartId];
    if (!chartInstance) return;

    const typeSelect = document.getElementById('chartTypeSelect');
    const titleInput = document.getElementById('chartTitleInput');
    const tableBody = document.getElementById('chartDataTableBody');

    // Update chart type
    chartInstance.config.type = typeSelect.value;

    // Read labels, data, and colors from table
    const rows = tableBody.querySelectorAll('tr');
    const labels = [];
    const data = [];
    const colors = [];
    
    rows.forEach(row => {
        const labelInput = row.querySelector('.data-label-input');
        const valueInput = row.querySelector('.data-value-input');
        const colorInput = row.querySelector('.data-color-input');
        const label = labelInput ? labelInput.value.trim() : '';
        const value = valueInput ? parseFloat(valueInput.value) : NaN;
        const color = colorInput ? colorInput.value : '';
        
        // Only add if both label and value are provided
        if (label && !isNaN(value)) {
            labels.push(label);
            data.push(value);
            colors.push(color || '#007bff');
        }
    });

    // Update labels and data
    chartInstance.data.labels = labels;
    if (chartInstance.data.datasets[0]) {
        chartInstance.data.datasets[0].data = data;
        // Update colors - convert hex to rgba for better compatibility
        chartInstance.data.datasets[0].backgroundColor = colors.map(hex => hexToRgba(hex, 0.2));
        chartInstance.data.datasets[0].borderColor = colors.map(hex => hexToRgba(hex, 1));
        // Store hex colors for saving to storage
        chartInstance._savedColors = colors;
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

