// Drag Handler Module
// Handles drag functionality for chart elements

import { updateChartPosition } from './chartManager.js';

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
        
        // Check if mouse has moved significantly (more than 5px)
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2)
        );
        
        if (moveDistance > 5) {
            hasMoved = true;
            if (!isDragging) {
                isDragging = true;
                wrapper.classList.add('dragging');
                document.body.style.userSelect = 'none';
            }
        }
        
        if (isDragging) {
            // Restrict to within chartContainer bounds
            const containerRect = chartContainer.getBoundingClientRect();
            let newLeft = e.clientX - containerRect.left - offsetX;
            let newTop = e.clientY - containerRect.top - offsetY;
            // Clamp if needed
            newLeft = Math.max(0, Math.min(newLeft, chartContainer.clientWidth - wrapper.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, chartContainer.clientHeight - wrapper.offsetHeight));
            wrapper.style.left = `${newLeft}px`;
            wrapper.style.top = `${newTop}px`;
        }
    };

    const handleMouseUp = function(e) {
        if (activeChartId !== chartId) return;
        
        if (isDragging) {
            isDragging = false;
            wrapper.classList.remove('dragging');
            document.body.style.userSelect = '';
            // Save position to local storage
            updateChartPosition(chartId, wrapper.style.top, wrapper.style.left);
        } else if (!hasMoved && onEditClick) {
            // If no significant movement, treat as click and open edit panel
            onEditClick(chartId);
        }
        
        // Reset
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
    };

    wrapper.addEventListener('mousedown', function(e) {
        // Don't start dragging if clicking on the resize handle
        if (e.target.classList.contains('resize-handle')) {
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
        offsetX = e.clientX - wrapper.getBoundingClientRect().left;
        offsetY = e.clientY - wrapper.getBoundingClientRect().top;
        
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

