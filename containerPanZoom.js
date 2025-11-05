// Container Pan and Zoom Module
// Handles panning and zooming of the chart container

const PANZOOM_STATE_KEY = 'chartContainerPanZoom';

// State management
let panX = 0;
let panY = 0;
let zoom = 1;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;
let lastMouseX = 0;
let lastMouseY = 0;

// Helper function to get transform state from content wrapper
export function getTransformState(contentWrapper) {
    let panX = 0, panY = 0, zoom = 1;
    if (contentWrapper) {
        const transform = contentWrapper.style.transform || '';
        const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        if (translateMatch) {
            panX = parseFloat(translateMatch[1]) || 0;
            panY = parseFloat(translateMatch[2]) || 0;
        }
        if (scaleMatch) {
            zoom = parseFloat(scaleMatch[1]) || 1;
        }
    }
    return { panX, panY, zoom };
}

// Load saved state from localStorage
function loadState() {
    const saved = localStorage.getItem(PANZOOM_STATE_KEY);
    if (saved) {
        try {
            const state = JSON.parse(saved);
            panX = state.panX || 0;
            panY = state.panY || 0;
            zoom = state.zoom || 1;
        } catch (e) {
            console.error('Error loading pan/zoom state:', e);
        }
    }
}

// Save state to localStorage
function saveState() {
    const state = {
        panX,
        panY,
        zoom
    };
    localStorage.setItem(PANZOOM_STATE_KEY, JSON.stringify(state));
}

// Apply transform to container
function applyTransform(container) {
    const content = container.querySelector('.chart-container-content') || container;
    content.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    content.style.transformOrigin = '0 0';
}

// Reset pan and zoom
function resetPanZoom(container) {
    panX = 0;
    panY = 0;
    zoom = 1;
    applyTransform(container);
    saveState();
}

// Initialize pan and zoom for the container
export function initializeContainerPanZoom(container) {
    // Load saved state
    loadState();
    
    // Create content wrapper if it doesn't exist
    let contentWrapper = container.querySelector('.chart-container-content');
    if (!contentWrapper) {
        contentWrapper = document.createElement('div');
        contentWrapper.className = 'chart-container-content';
        contentWrapper.style.position = 'relative';
        contentWrapper.style.width = '100%';
        contentWrapper.style.height = '100%';
        
        // Move all existing children to the wrapper
        while (container.firstChild) {
            contentWrapper.appendChild(container.firstChild);
        }
        container.appendChild(contentWrapper);
    }
    
    // Apply initial transform
    applyTransform(container);
    
    // Prevent middle mouse button from auto-scrolling
    container.addEventListener('mousedown', function(e) {
        if (e.button === 1) {
            e.preventDefault();
        }
    });
    
    // Pan with left-click on container background (not on charts)
    container.addEventListener('mousedown', function(e) {
        // Only pan if clicking directly on container or content wrapper (not on charts)
        const isClickOnChart = e.target.closest('.draggable-chart');
        const isClickOnContainer = e.target === container || e.target === contentWrapper || 
                                   (contentWrapper && contentWrapper.contains(e.target) && !isClickOnChart);
        
        // Left-click (button 0) on container background, or middle mouse (button 1)
        if ((e.button === 0 && isClickOnContainer) || e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            isPanning = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            startPanX = panX;
            startPanY = panY;
            container.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        }
    });
    
    // Handle mouse move for panning
    document.addEventListener('mousemove', function(e) {
        if (isPanning) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            panX = startPanX + deltaX;
            panY = startPanY + deltaY;
            applyTransform(container);
        }
    });
    
    // Handle mouse up for panning
    document.addEventListener('mouseup', function(e) {
        if (isPanning) {
            isPanning = false;
            container.style.cursor = '';
            document.body.style.userSelect = '';
            saveState();
        }
    });
    
    // Allow context menu (we're not using right-click for panning anymore)
    
    // Handle mouse wheel for zooming
    container.addEventListener('wheel', function(e) {
        // Only zoom if Ctrl/Cmd is pressed, or if wheel is used normally
        const shouldZoom = e.ctrlKey || e.metaKey || true; // Allow zoom with or without modifier
        
        if (shouldZoom) {
            e.preventDefault();
            
            // Get mouse position relative to container
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate zoom factor with reduced sensitivity
            // Use smaller step size (about 3% per scroll instead of 10%)
            const sensitivity = 0.03;
            const zoomFactor = e.deltaY > 0 ? (1 - sensitivity) : (1 + sensitivity);
            const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
            
            // Calculate the point under the mouse before zoom
            const worldX = (mouseX - panX) / zoom;
            const worldY = (mouseY - panY) / zoom;
            
            // Apply new zoom
            zoom = newZoom;
            
            // Adjust pan to keep the point under the mouse in the same place
            panX = mouseX - worldX * zoom;
            panY = mouseY - worldY * zoom;
            
            applyTransform(container);
            saveState();
        }
    }, { passive: false });
    
    // Handle touch gestures for mobile
    let touchStartDistance = 0;
    let touchStartPanX = 0;
    let touchStartPanY = 0;
    let touchStartZoom = 1;
    let lastTouchCenter = { x: 0, y: 0 };
    
    container.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            // Single touch - pan
            const touch = e.touches[0];
            lastMouseX = touch.clientX;
            lastMouseY = touch.clientY;
            startPanX = panX;
            startPanY = panY;
            isPanning = true;
        } else if (e.touches.length === 2) {
            // Two touches - pinch to zoom
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            touchStartDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            touchStartPanX = panX;
            touchStartPanY = panY;
            touchStartZoom = zoom;
            lastTouchCenter = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
        }
    }, { passive: false });
    
    container.addEventListener('touchmove', function(e) {
        if (e.touches.length === 1 && isPanning) {
            // Single touch - pan
            const touch = e.touches[0];
            const deltaX = touch.clientX - lastMouseX;
            const deltaY = touch.clientY - lastMouseY;
            panX = startPanX + deltaX;
            panY = startPanY + deltaY;
            applyTransform(container);
            lastMouseX = touch.clientX;
            lastMouseY = touch.clientY;
        } else if (e.touches.length === 2) {
            // Two touches - pinch to zoom
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            const zoomFactor = distance / touchStartDistance;
            const newZoom = Math.max(0.1, Math.min(5, touchStartZoom * zoomFactor));
            
            const rect = container.getBoundingClientRect();
            const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
            const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
            
            const worldX = (centerX - touchStartPanX) / touchStartZoom;
            const worldY = (centerY - touchStartPanY) / touchStartZoom;
            
            zoom = newZoom;
            panX = centerX - worldX * zoom;
            panY = centerY - worldY * zoom;
            
            applyTransform(container);
        }
    }, { passive: false });
    
    container.addEventListener('touchend', function(e) {
        if (e.touches.length === 0) {
            isPanning = false;
            saveState();
        }
    });
    
    // Expose reset function
    container.resetPanZoom = function() {
        resetPanZoom(container);
    };
    
    // Add keyboard shortcuts info
    console.log('Container pan & zoom enabled:');
    console.log('- Pan: Middle mouse button, Right-click + Ctrl/Cmd, or Space + drag');
    console.log('- Zoom: Mouse wheel (Ctrl/Cmd for fine control)');
    console.log('- Reset: Call container.resetPanZoom()');
}

