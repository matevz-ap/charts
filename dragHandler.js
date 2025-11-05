// Drag Handler Module
// Handles drag functionality for chart elements

import { updateChartPosition } from './chartManager.js';
import { getTransformState } from './containerPanZoom.js';

// Global tracking for active chart
let activeChartId = null;
let activeHandlers = null;

export function makeDraggable(wrapper, chartContainer, chartId, onEditClick) {
    let isDragging = false;
    let offsetX, offsetY;
    let startX, startY;
    let hasMoved = false;

    const handleMouseMove = function(e) {
        if (activeChartId !== chartId) return;
        if (startX === undefined || startY === undefined) return;
        
        // Check if mouse has moved significantly (more than 8px to avoid accidental drags)
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2)
        );
        
        if (moveDistance > 8) {
            hasMoved = true;
            if (!isDragging) {
                isDragging = true;
                wrapper.classList.add('dragging');
                document.body.style.userSelect = 'none';
            }
        }
        
        if (isDragging) {
            // Get the content wrapper (if it exists for pan/zoom)
            const contentWrapper = chartContainer.querySelector('.chart-container-content');
            const targetContainer = contentWrapper || chartContainer;
            
            // Get transform state from content wrapper if it exists
            const { panX, panY, zoom } = getTransformState(contentWrapper);
            
            // Calculate position in content wrapper's coordinate system
            const containerRect = targetContainer.getBoundingClientRect();
            // Convert mouse position to content wrapper's local coordinates
            const localX = (e.clientX - containerRect.left - panX) / zoom;
            const localY = (e.clientY - containerRect.top - panY) / zoom;
            
            // offsetX and offsetY are already in local coordinates
            let newLeft = localX - offsetX;
            let newTop = localY - offsetY;
            
            // Allow charts to be moved anywhere (no bounds clamping)
            wrapper.style.left = `${newLeft}px`;
            wrapper.style.top = `${newTop}px`;
        }
    };

    const handleMouseUp = function(e) {
        if (activeChartId !== chartId) return;
        
        // Check if this was a click (no drag) or a drag
        const wasClick = !isDragging && !hasMoved;
        
        if (isDragging) {
            // Was dragging - save position and don't open edit panel
            isDragging = false;
            wrapper.classList.remove('dragging');
            document.body.style.userSelect = '';
            // Save position to local storage
            updateChartPosition(chartId, wrapper.style.top, wrapper.style.left);
        }
        
        // Reset state
        startX = undefined;
        startY = undefined;
        hasMoved = false;
        isDragging = false;
        
        // Clear active chart and remove listeners
        if (activeChartId === chartId) {
            activeChartId = null;
            if (activeHandlers) {
                document.removeEventListener('mousemove', activeHandlers.move);
                document.removeEventListener('mouseup', activeHandlers.up);
                activeHandlers = null;
            }
        }
        
        // If it was a click (no drag), open the edit panel
        if (wasClick && onEditClick) {
            onEditClick(chartId);
        }
    };

    wrapper.addEventListener('mousedown', function(e) {
        // Don't start dragging if clicking on the resize handle
        if (e.target.classList.contains('resize-handle')) {
            return;
        }
        
        // Don't start dragging if middle mouse button (used for panning)
        if (e.button === 1) {
            return;
        }
        
        // Clear any previous active chart
        if (activeChartId && activeChartId !== chartId && activeHandlers) {
            document.removeEventListener('mousemove', activeHandlers.move);
            document.removeEventListener('mouseup', activeHandlers.up);
        }
        
        // Set this chart as active
        activeChartId = chartId;
        activeHandlers = {
            move: handleMouseMove,
            up: handleMouseUp
        };
        
        startX = e.clientX;
        startY = e.clientY;
        hasMoved = false;
        isDragging = false;
        
        // Calculate offset accounting for zoom/pan transform
        const contentWrapper = chartContainer.querySelector('.chart-container-content');
        const { panX, panY, zoom } = getTransformState(contentWrapper);
        
        const targetContainer = contentWrapper || chartContainer;
        const containerRect = targetContainer.getBoundingClientRect();
        const localX = (e.clientX - containerRect.left - panX) / zoom;
        const localY = (e.clientY - containerRect.top - panY) / zoom;
        
        // Get chart's current position in local coordinates (from style, not viewport)
        const chartLeft = parseFloat(wrapper.style.left) || 0;
        const chartTop = parseFloat(wrapper.style.top) || 0;
        
        offsetX = localX - chartLeft;
        offsetY = localY - chartTop;
        
        // Add document listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    // Handle mouse leave to reset dragging state
    wrapper.addEventListener('mouseleave', function() {
        if (isDragging && activeChartId === chartId) {
            isDragging = false;
            wrapper.classList.remove('dragging');
            document.body.style.userSelect = '';
            updateChartPosition(chartId, wrapper.style.top, wrapper.style.left);
        }
        if (activeChartId === chartId) {
            startX = undefined;
            startY = undefined;
            hasMoved = false;
            isDragging = false;
            activeChartId = null;
            if (activeHandlers) {
                document.removeEventListener('mousemove', activeHandlers.move);
                document.removeEventListener('mouseup', activeHandlers.up);
                activeHandlers = null;
            }
        }
    });
}

