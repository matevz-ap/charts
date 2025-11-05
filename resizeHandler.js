// Resize Handler Module
// Handles resize functionality for chart elements

import { updateChartSize } from './chartManager.js';

export function makeResizable(wrapper, chartCanvas, chartInstance, chartId) {
    // Create resize handle (bottom-right corner)
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    wrapper.appendChild(resizeHandle);

    let isResizing = false;
    let startX, startY;
    let startWidth, startHeight;
    let startLeft, startTop;

    resizeHandle.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        const computedStyle = window.getComputedStyle(wrapper);
        startWidth = parseInt(computedStyle.width, 10);
        startHeight = parseInt(computedStyle.height, 10);
        startLeft = parseInt(computedStyle.left, 10);
        startTop = parseInt(computedStyle.top, 10);
        
        document.body.style.userSelect = 'none';
        wrapper.style.cursor = 'nwse-resize';
    });

    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;

        const width = startWidth + (e.clientX - startX);
        const height = startHeight + (e.clientY - startY);

        // Minimum size constraints
        const minWidth = 200;
        const minHeight = 150;

        if (width >= minWidth && height >= minHeight) {
            wrapper.style.width = `${width}px`;
            wrapper.style.height = `${height}px`;
            
            // Update canvas size
            chartCanvas.width = width;
            chartCanvas.height = height;
            
            // Resize chart
            chartInstance.resize();
        }
    });

    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            document.body.style.userSelect = '';
            wrapper.style.cursor = '';
            
            // Save size to local storage
            const computedStyle = window.getComputedStyle(wrapper);
            const width = parseInt(computedStyle.width, 10);
            const height = parseInt(computedStyle.height, 10);
            updateChartSize(chartId, width, height);
        }
    });
}

