// Main Entry Point
// Ties together all modules and initializes the application

import { createChart, initializeChartCounter, deleteChartInstance } from './chartManager.js';
import { makeDraggable } from './dragHandler.js';
import { makeResizable } from './resizeHandler.js';
import { openEditPanel, closeEditPanel } from './chartEditor.js';
import { loadCharts } from './storage.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const chartContainer = document.getElementById('chartContainer');
    const addChartBtn = document.getElementById('addChartBtn');
    const closeEditPanelBtn = document.getElementById('closeEditPanel');

    // Load saved charts from local storage
    const savedCharts = loadCharts();
    
    // Initialize chart counter based on saved charts
    initializeChartCounter(savedCharts);
    
    // Restore saved charts
    savedCharts.forEach(chartData => {
        const chart = createChart(chartContainer, openEditPanel, chartData);
        makeDraggable(chart.wrapper, chartContainer, chart.chartId, chart.onEditClick);
        makeResizable(chart.wrapper, chart.chartCanvas, chart.chartInstance, chart.chartId);
    });

    // Add chart button handler
    addChartBtn.addEventListener('click', function() {
        const chart = createChart(chartContainer, openEditPanel);
        makeDraggable(chart.wrapper, chartContainer, chart.chartId, chart.onEditClick);
        makeResizable(chart.wrapper, chart.chartCanvas, chart.chartInstance, chart.chartId);
    });

    // Close edit panel button handler
    closeEditPanelBtn.addEventListener('click', closeEditPanel);

    // Close panel and deselect charts when clicking outside
    document.addEventListener('click', function(e) {
        const editPanel = document.getElementById('editPanel');
        const addChartBtn = document.getElementById('addChartBtn');
        const isClickOnChart = e.target.closest('.draggable-chart');
        const isClickInsidePanel = editPanel && editPanel.contains(e.target);
        const isClickOnCloseBtn = e.target.id === 'closeEditPanel' || e.target.closest('#closeEditPanel');
        const isClickOnRemovreRowBtn = e.target.classList.contains('remove-row-btn');
        const isClickOnAddBtn = e.target === addChartBtn || e.target.closest('#addChartBtn');
        
        // Check if click is outside the edit panel
        if (editPanel && editPanel.classList.contains('open')) {
            // Don't close if clicking on a chart (it will open panel for that chart)
            // Don't close if clicking inside panel or on close button
            if (!isClickInsidePanel && !isClickOnCloseBtn && !isClickOnChart && !isClickOnRemovreRowBtn) {
                console.log('closing edit panel');
                closeEditPanel();
            }
        }
        
        // Deselect charts when clicking outside them (but not on the panel, add button, or charts)
        if (!isClickOnChart && 
            !isClickInsidePanel && 
            !isClickOnAddBtn) {
            document.querySelectorAll('.draggable-chart').forEach(chart => {
                chart.classList.remove('active');
            });
        }
    });

    // Delete selected chart with Backspace/Delete key
    document.addEventListener('keydown', function(e) {
        // Only handle if Backspace or Delete key, and not typing in an input/textarea
        if ((e.key === 'Backspace' || e.key === 'Delete') && 
            e.target.tagName !== 'INPUT' && 
            e.target.tagName !== 'TEXTAREA' &&
            !e.target.isContentEditable) {
            
            // Find the active chart
            const activeChart = document.querySelector('.draggable-chart.active');
            if (activeChart) {
                e.preventDefault(); // Prevent browser back navigation
                const chartId = activeChart.getAttribute('data-chart-id');
                if (chartId) {
                    // Close edit panel if open
                    const editPanel = document.getElementById('editPanel');
                    if (editPanel && editPanel.classList.contains('open')) {
                        closeEditPanel();
                    }
                    // Delete the chart
                    deleteChartInstance(chartId);
                }
            }
        }
    });
});

