// Chart Manager Module
// Handles chart creation, storage, and management

import { saveChart, deleteChart } from './storage.js';

export const chartInstances = {};
let chartCounter = 0;

export function initializeChartCounter(savedCharts) {
    if (savedCharts && savedCharts.length > 0) {
        // Extract the highest number from saved chart IDs
        const maxId = savedCharts.reduce((max, chart) => {
            const match = chart.id?.match(/chartJsCanvas_(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                return Math.max(max, num);
            }
            return max;
        }, -1);
        chartCounter = maxId + 1;
    }
}

const defaultChartConfig = {
    type: 'bar',
    data: {
        labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
        datasets: [{
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
                'rgba(255,99,132,1)',
                'rgba(54,162,235,1)',
                'rgba(255,206,86,1)',
                'rgba(75,192,192,1)',
                'rgba(153,102,255,1)',
                'rgba(255,159,64,1)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        maintainAspectRatio: false,
    }
};

export function createChart(chartContainer, onEditClick, chartData = null) {
    // Generate unique ID for this chart
    const chartId = chartData?.id || `chartJsCanvas_${chartCounter++}`;
    
    // Helper function to convert hex to rgba
    const hexToRgba = (hex, alpha = 1) => {
        if (!hex || !hex.startsWith('#')) {
            return hex || `rgba(0, 123, 255, ${alpha})`;
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Use provided data or defaults
    const config = chartData ? {
        type: chartData.type || defaultChartConfig.type,
        data: {
            labels: chartData.labels || defaultChartConfig.data.labels,
            datasets: [{
                ...defaultChartConfig.data.datasets[0],
                data: chartData.data || defaultChartConfig.data.datasets[0].data,
                // Apply saved colors if available, otherwise use defaults
                backgroundColor: chartData.colors && chartData.colors.length > 0
                    ? chartData.colors.map(hex => hexToRgba(hex, 0.2))
                    : defaultChartConfig.data.datasets[0].backgroundColor,
                borderColor: chartData.colors && chartData.colors.length > 0
                    ? chartData.colors.map(hex => hexToRgba(hex, 1))
                    : defaultChartConfig.data.datasets[0].borderColor
            }]
        },
        options: {
            ...defaultChartConfig.options,
            plugins: {
                ...(chartData.title ? {
                    title: {
                        display: true,
                        text: chartData.title
                    }
                } : {})
            }
        }
    } : defaultChartConfig;
    
    // Create wrapper div so the chart can be dragged
    const wrapper = document.createElement('div');
    wrapper.className = 'draggable-chart';
    wrapper.setAttribute('data-chart-id', chartId);
    // Use saved position or default offset
    wrapper.style.top = chartData?.position?.top || `${40 + (chartCounter - 1) * 20}px`;
    wrapper.style.left = chartData?.position?.left || `${30 + (chartCounter - 1) * 20}px`;
    
    // Use saved size or default size
    const width = chartData?.size?.width || 400;
    const height = chartData?.size?.height || 200;
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;

    // Create new canvas with unique ID
    const chartCanvas = document.createElement('canvas');
    chartCanvas.className = 'chart-canvas';
    chartCanvas.id = chartId;
    chartCanvas.width = width;
    chartCanvas.height = height;
    wrapper.appendChild(chartCanvas);

    // Append to content wrapper if it exists (for pan/zoom), otherwise to container
    const contentWrapper = chartContainer.querySelector('.chart-container-content');
    if (contentWrapper) {
        contentWrapper.appendChild(wrapper);
    } else {
        chartContainer.appendChild(wrapper);
    }

    // Create Chart.js Chart
    const chartInstance = new Chart(chartCanvas, config);

    // Store chart instance for editing
    chartInstances[chartId] = chartInstance;

    // Extract colors from config if available (convert rgba to hex for storage)
    const rgbaToHex = (color) => {
        if (!color || color.startsWith('#')) return color || '#007bff';
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
        return '#007bff';
    };

    const backgroundColor = config.data.datasets[0].backgroundColor || [];
    const colors = backgroundColor.length > 0 
        ? backgroundColor.map(rgbaToHex)
        : (chartData?.colors || []);

    // Save to local storage
    const chartStorageData = {
        id: chartId,
        type: config.type,
        labels: config.data.labels,
        data: config.data.datasets[0].data,
        colors: colors,
        title: config.options.plugins?.title?.text || '',
        position: {
            top: wrapper.style.top,
            left: wrapper.style.left
        },
        size: {
            width: width,
            height: height
        }
    };
    saveChart(chartId, chartStorageData);

    return {
        wrapper,
        chartCanvas,
        chartInstance,
        chartId,
        onEditClick
    };
}

export function updateChartPosition(chartId, top, left) {
    const chartInstance = chartInstances[chartId];
    if (!chartInstance) return;

    const wrapper = document.querySelector(`[data-chart-id="${chartId}"]`);
    if (!wrapper) return;
    
    const computedStyle = window.getComputedStyle(wrapper);
    const width = parseInt(computedStyle.width, 10);
    const height = parseInt(computedStyle.height, 10);
    
    // Extract colors from chart instance
    const colors = extractColorsFromChart(chartInstance);
    
    const chartData = {
        id: chartId,
        type: chartInstance.config.type,
        labels: chartInstance.data.labels,
        data: chartInstance.data.datasets[0]?.data || [],
        colors: colors,
        title: chartInstance.options.plugins?.title?.text || '',
        position: { top, left },
        size: { width, height }
    };
    saveChart(chartId, chartData);
}

export function updateChartSize(chartId, width, height) {
    const chartInstance = chartInstances[chartId];
    if (!chartInstance) return;

    const wrapper = document.querySelector(`[data-chart-id="${chartId}"]`);
    if (!wrapper) return;
    
    // Extract colors from chart instance
    const colors = extractColorsFromChart(chartInstance);
    
    const chartData = {
        id: chartId,
        type: chartInstance.config.type,
        labels: chartInstance.data.labels,
        data: chartInstance.data.datasets[0]?.data || [],
        colors: colors,
        title: chartInstance.options.plugins?.title?.text || '',
        position: {
            top: wrapper.style.top,
            left: wrapper.style.left
        },
        size: { width, height }
    };
    saveChart(chartId, chartData);
}

// Helper function to extract colors from chart instance
function extractColorsFromChart(chartInstance) {
    // First check if we have saved colors from the editor
    if (chartInstance._savedColors && Array.isArray(chartInstance._savedColors)) {
        return chartInstance._savedColors;
    }
    
    // Otherwise, extract from backgroundColor array (convert rgba to hex)
    const backgroundColor = chartInstance.data.datasets[0]?.backgroundColor || [];
    if (backgroundColor.length === 0) {
        return [];
    }
    
    const rgbaToHex = (color) => {
        if (!color) return '#007bff';
        if (color.startsWith('#')) return color;
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
        return '#007bff';
    };
    
    return backgroundColor.map(rgbaToHex);
}

export function updateChartData(chartId) {
    const chartInstance = chartInstances[chartId];
    if (!chartInstance) return;

    const wrapper = document.querySelector(`[data-chart-id="${chartId}"]`);
    if (!wrapper) return;

    const computedStyle = window.getComputedStyle(wrapper);
    const width = parseInt(computedStyle.width, 10);
    const height = parseInt(computedStyle.height, 10);

    // Extract colors from chart instance
    const colors = extractColorsFromChart(chartInstance);

    const chartData = {
        id: chartId,
        type: chartInstance.config.type,
        labels: chartInstance.data.labels,
        data: chartInstance.data.datasets[0]?.data || [],
        colors: colors,
        title: chartInstance.options.plugins?.title?.text || '',
        position: {
            top: wrapper.style.top,
            left: wrapper.style.left
        },
        size: { width, height }
    };
    saveChart(chartId, chartData);
    
    // Clear the saved colors after saving
    if (chartInstance._savedColors) {
        delete chartInstance._savedColors;
    }
}

export function getChartInstance(chartId) {
    return chartInstances[chartId] || Chart.getChart(chartId);
}

export function deleteChartInstance(chartId) {
    // Try to get chart instance from our storage or Chart.js
    let chartInstance = chartInstances[chartId];
    if (!chartInstance) {
        chartInstance = Chart.getChart(chartId);
    }
    
    if (chartInstance) {
        // Destroy the chart instance
        chartInstance.destroy();
        if (chartInstances[chartId]) {
            delete chartInstances[chartId];
        }
    }

    // Remove the wrapper from DOM
    const wrapper = document.querySelector(`[data-chart-id="${chartId}"]`);
    if (wrapper) {
        wrapper.remove();
    }

    // Delete from local storage
    deleteChart(chartId);
}

