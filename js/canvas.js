// Grid Canvas - Full page canvas with draggable blocks and arrow connections

class GridCanvas {
    constructor() {
        this.gridCanvas = document.getElementById('gridCanvas');
        this.canvasContent = document.getElementById('canvasContent');
        this.sidebarContent = document.getElementById('canvasSidebarContent');
        this.deleteZone = document.getElementById('deleteZone');
        this.blockCountEl = document.getElementById('blockCount');
        this.arrowLayer = document.getElementById('arrowLayer');
        this.canvasOutput = document.getElementById('canvasOutput');
        this.canvasHint = document.getElementById('canvasHint');
        this.selectionBox = document.getElementById('selectionBox');
        
        // Modal elements
        this.relationshipModal = document.getElementById('relationshipModal');
        this.relationshipInput = document.getElementById('relationshipInput');
        this.fromBlockNameEl = document.getElementById('fromBlockName');
        this.toBlockNameEl = document.getElementById('toBlockName');
        
        this.savedBlocks = this.loadSavedBlocks();
        this.placedBlocks = []; // Track placed blocks with their positions
        this.connections = []; // Track connections between blocks
        this.blockIdCounter = 0;
        this.connectionIdCounter = 0;
        
        // Drag state
        this.draggedBlock = null;
        this.dragSource = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Connection state
        this.connectingFrom = null; // Block ID we're connecting from
        this.tempArrow = null; // Temporary arrow element
        
        // Grid settings
        this.gridSize = 40;
        
        // Projects
        this.projects = this.loadProjects();
        this.currentProjectId = null;
        
        // Zoom settings
        this.zoomLevel = 1;
        this.minZoom = 0.25;
        this.maxZoom = 3;
        this.zoomStep = 0.25;
        
        // Multi-select state
        this.isSelecting = false;
        this.selectStart = { x: 0, y: 0 };
        this.selectedBlocks = new Set();
        this.selectedConnections = new Set(); // Track selected connections
        this.isDraggingSelection = false;
        this.selectionDragStart = { x: 0, y: 0 };
        this.selectionInitialPositions = new Map();
        
        // Clipboard for copy-paste
        this.clipboard = null;
        this.clipboardOffset = { x: 20, y: 20 };
        this.pasteCount = 0;
        
        // Undo/Redo stack
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSize = 50; // Maximum number of undo states
        
        this.init();
    }
    
    init() {
        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // Clear canvas button
        document.getElementById('clearCanvasBtn').addEventListener('click', () => this.clearCanvas());
        
        // Copy output button
        document.getElementById('copyOutputBtn').addEventListener('click', () => this.copyOutput());
        
        // Modal buttons
        document.getElementById('cancelRelationship').addEventListener('click', () => this.cancelConnection());
        document.getElementById('confirmRelationship').addEventListener('click', () => this.confirmConnection());
        this.relationshipInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmConnection();
        });
        
        // Render sidebar blocks
        this.renderSidebar();
        
        // Render projects
        this.renderProjects();
        
        // Save project button
        document.getElementById('saveProjectBtn').addEventListener('click', () => this.saveCurrentProject());
        
        // Minimize panel buttons
        this.initMinimizeButtons();
        
        // Canvas drop zone for placing blocks
        this.gridCanvas.addEventListener('dragover', (e) => this.onCanvasDragOver(e));
        this.gridCanvas.addEventListener('drop', (e) => this.onCanvasDrop(e));
        
        // Delete zone
        this.deleteZone.addEventListener('dragover', (e) => this.onDeleteZoneDragOver(e));
        this.deleteZone.addEventListener('dragleave', (e) => this.onDeleteZoneDragLeave(e));
        this.deleteZone.addEventListener('drop', (e) => this.onDeleteZoneDrop(e));
        
        // Mouse events for drawing temporary arrow and selection
        this.gridCanvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        this.gridCanvas.addEventListener('click', (e) => this.onCanvasClick(e));
        
        // Zoom controls
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const zoomResetBtn = document.getElementById('zoomResetBtn');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                console.log('zoomInBtn clicked');
                this.zoomIn();
            });
        } else {
            console.error('zoomInBtn not found!');
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                console.log('zoomOutBtn clicked');
                this.zoomOut();
            });
        } else {
            console.error('zoomOutBtn not found!');
        }
        
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => {
                console.log('zoomResetBtn clicked');
                this.resetZoom();
            });
        } else {
            console.error('zoomResetBtn not found!');
        }
        
        // Mouse wheel zoom
        this.gridCanvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        
        // Multi-select mouse events
        this.gridCanvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
        this.gridCanvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
        
        // Keyboard shortcuts for copy-paste and delete
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Listen for storage changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'codeblocks_saved') {
                this.savedBlocks = this.loadSavedBlocks();
                this.renderSidebar();
            }
        });
        
        // Initial output
        this.updateOutput();
        
        // Restore minimized states
        this.restoreMinimizedStates();
    }
    
    // Initialize minimize/expand buttons for panels
    initMinimizeButtons() {
        // Projects panel
        const minimizeProjectsBtn = document.getElementById('minimizeProjectsBtn');
        const projectsPanel = document.getElementById('projectsPanel');
        if (minimizeProjectsBtn && projectsPanel) {
            minimizeProjectsBtn.addEventListener('click', () => {
                projectsPanel.classList.toggle('minimized');
                this.saveMinimizedState('projects', projectsPanel.classList.contains('minimized'));
            });
        }
        
        // Saved Blocks panel
        const minimizeSavedBlocksBtn = document.getElementById('minimizeSavedBlocksBtn');
        const savedBlocksPanel = document.getElementById('savedBlocksPanel');
        if (minimizeSavedBlocksBtn && savedBlocksPanel) {
            minimizeSavedBlocksBtn.addEventListener('click', () => {
                savedBlocksPanel.classList.toggle('minimized');
                this.saveMinimizedState('savedBlocks', savedBlocksPanel.classList.contains('minimized'));
            });
        }
        
        // Output panel
        const minimizeOutputBtn = document.getElementById('minimizeOutputBtn');
        const outputPanel = document.getElementById('outputPanel');
        if (minimizeOutputBtn && outputPanel) {
            minimizeOutputBtn.addEventListener('click', () => {
                outputPanel.classList.toggle('minimized');
                this.saveMinimizedState('output', outputPanel.classList.contains('minimized'));
            });
        }
    }
    
    // ========== ZOOM FUNCTIONALITY ==========
    
    zoomIn() {
        console.log('zoomIn called, current level:', this.zoomLevel);
        if (this.zoomLevel < this.maxZoom) {
            this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
            console.log('new zoom level:', this.zoomLevel);
            this.applyZoom();
        }
    }
    
    zoomOut() {
        console.log('zoomOut called, current level:', this.zoomLevel);
        if (this.zoomLevel > this.minZoom) {
            this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
            console.log('new zoom level:', this.zoomLevel);
            this.applyZoom();
        }
    }
    
    resetZoom() {
        console.log('resetZoom called');
        this.zoomLevel = 1;
        this.applyZoom();
    }
    
    applyZoom() {
        console.log('applyZoom called with level:', this.zoomLevel);
        // Update zoom display
        const zoomLevelEl = document.getElementById('zoomLevel');
        if (zoomLevelEl) {
            zoomLevelEl.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
        
        // Apply transform to canvas content
        if (this.canvasContent) {
            this.canvasContent.style.transform = `scale(${this.zoomLevel})`;
            this.canvasContent.style.transformOrigin = '0 0';
            console.log('transform applied:', this.canvasContent.style.transform);
        } else {
            console.error('canvasContent is null!');
        }
        
        // Update arrow layer size to match scaled content
        this.updateArrowLayerSize();
        
        // Re-render arrows to match new scale
        this.renderArrows();
    }
    
    updateArrowLayerSize() {
        // Scale the arrow layer inversely so arrows appear at correct positions
        // but we need to adjust the SVG viewBox or coordinate system
        const baseWidth = 3000;
        const baseHeight = 2000;
        this.arrowLayer.style.width = baseWidth + 'px';
        this.arrowLayer.style.height = baseHeight + 'px';
    }
    
    onWheel(e) {
        // Zoom with Ctrl+Wheel
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            
            // Smooth zooming based on wheel delta
            // Use a factor to convert delta to zoom change (smaller = smoother)
            const zoomFactor = 0.005;
            const delta = -e.deltaY * zoomFactor;
            
            let newZoom = this.zoomLevel * (1 + delta);
            newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
            
            this.zoomLevel = newZoom;
            this.applyZoom();
        }
    }
    
    // Convert screen coordinates to canvas coordinates (accounting for zoom)
    screenToCanvas(screenX, screenY) {
        const rect = this.gridCanvas.getBoundingClientRect();
        const scrollLeft = this.gridCanvas.scrollLeft;
        const scrollTop = this.gridCanvas.scrollTop;
        
        const x = (screenX - rect.left + scrollLeft) / this.zoomLevel;
        const y = (screenY - rect.top + scrollTop) / this.zoomLevel;
        
        return { x, y };
    }
    
    // Convert canvas coordinates to screen coordinates
    canvasToScreen(canvasX, canvasY) {
        const rect = this.gridCanvas.getBoundingClientRect();
        const scrollLeft = this.gridCanvas.scrollLeft;
        const scrollTop = this.gridCanvas.scrollTop;
        
        const x = canvasX * this.zoomLevel + rect.left - scrollLeft;
        const y = canvasY * this.zoomLevel + rect.top - scrollTop;
        
        return { x, y };
    }
    
    // ========== MULTI-SELECT FUNCTIONALITY ==========
    
    onCanvasMouseDown(e) {
        // Check if we're clicking on a placed block first
        const blockEl = e.target.closest('.placed-block');
        if (blockEl) {
            const blockId = blockEl.dataset.blockId;
            
            // If not holding Ctrl/Cmd, clear selection unless clicking on already selected block
            if (!e.ctrlKey && !e.metaKey && !this.selectedBlocks.has(blockId)) {
                this.clearSelection();
            }
            
            // Toggle selection with Ctrl/Cmd
            if (e.ctrlKey || e.metaKey) {
                this.toggleBlockSelection(blockId);
            } else {
                this.selectBlock(blockId);
            }
            
            // Start dragging selection
            if (this.selectedBlocks.size > 0) {
                this.isDraggingSelection = true;
                this.selectionDragStart = { x: e.clientX, y: e.clientY };
                this.saveSelectionInitialPositions();
            }
            return;
        }
        
        // Only start box selection if clicking on empty canvas area
        // (gridCanvas, canvasContent, canvas-placeholder, or arrowLayer)
        const isCanvasArea = e.target === this.gridCanvas || 
                             e.target === this.canvasContent ||
                             e.target === this.arrowLayer ||
                             e.target.classList.contains('canvas-placeholder') ||
                             e.target.closest('.canvas-placeholder');
        
        if (!isCanvasArea) {
            return;
        }
        
        // Start box selection
        if (e.button === 0) { // Left mouse button
            this.isSelecting = true;
            const canvasPos = this.screenToCanvas(e.clientX, e.clientY);
            this.selectStart = canvasPos;
            
            // Clear selection if not holding Ctrl/Cmd
            if (!e.ctrlKey && !e.metaKey) {
                this.clearSelection();
            }
            
            this.updateSelectionBox(canvasPos.x, canvasPos.y);
            this.selectionBox.classList.remove('hidden');
        }
    }
    
    onCanvasMouseMove(e) {
        // Handle multi-selection drag
        if (this.isDraggingSelection && this.selectedBlocks.size > 0) {
            const dx = (e.clientX - this.selectionDragStart.x) / this.zoomLevel;
            const dy = (e.clientY - this.selectionDragStart.y) / this.zoomLevel;
            
            this.selectedBlocks.forEach(blockId => {
                const placedBlock = this.placedBlocks.find(b => b.id === blockId);
                const initialPos = this.selectionInitialPositions.get(blockId);
                
                if (placedBlock && initialPos) {
                    const newX = this.snapToGrid(initialPos.x + dx);
                    const newY = this.snapToGrid(initialPos.y + dy);
                    
                    placedBlock.x = newX;
                    placedBlock.y = newY;
                    placedBlock.element.style.left = `${newX}px`;
                    placedBlock.element.style.top = `${newY}px`;
                }
            });
            
            this.renderArrows();
            return;
        }
        
        // Handle selection box
        if (this.isSelecting) {
            const canvasPos = this.screenToCanvas(e.clientX, e.clientY);
            this.updateSelectionBox(canvasPos.x, canvasPos.y);
            this.updateSelectionFromBox();
        }
        
        // Handle connection temp arrow
        if (!this.connectingFrom) return;
        
        const rect = this.gridCanvas.getBoundingClientRect();
        const scrollLeft = this.gridCanvas.scrollLeft;
        const scrollTop = this.gridCanvas.scrollTop;
        
        this.mouseX = (e.clientX - rect.left + scrollLeft) / this.zoomLevel;
        this.mouseY = (e.clientY - rect.top + scrollTop) / this.zoomLevel;
        
        this.updateTempArrow();
    }
    
    onCanvasMouseUp(e) {
        // End selection box
        if (this.isSelecting) {
            this.isSelecting = false;
            this.selectionBox.classList.add('hidden');
        }
        
        // End selection drag
        if (this.isDraggingSelection) {
            this.isDraggingSelection = false;
            this.savePlacedBlocks();
            this.updateOutput();
        }
    }
    
    updateSelectionBox(currentX, currentY) {
        const left = Math.min(this.selectStart.x, currentX);
        const top = Math.min(this.selectStart.y, currentY);
        const width = Math.abs(currentX - this.selectStart.x);
        const height = Math.abs(currentY - this.selectStart.y);
        
        // Selection box is outside canvasContent, so we need to account for zoom
        // The coordinates are canvas coordinates, multiply by zoom for screen position
        const screenLeft = left * this.zoomLevel;
        const screenTop = top * this.zoomLevel;
        const screenWidth = width * this.zoomLevel;
        const screenHeight = height * this.zoomLevel;
        
        this.selectionBox.style.left = `${screenLeft}px`;
        this.selectionBox.style.top = `${screenTop}px`;
        this.selectionBox.style.width = `${screenWidth}px`;
        this.selectionBox.style.height = `${screenHeight}px`;
    }
    
    updateSelectionFromBox() {
        const boxRect = {
            left: Math.min(this.selectStart.x, parseFloat(this.selectionBox.style.left) / this.zoomLevel),
            top: Math.min(this.selectStart.y, parseFloat(this.selectionBox.style.top) / this.zoomLevel),
            right: Math.max(this.selectStart.x, (parseFloat(this.selectionBox.style.left) + parseFloat(this.selectionBox.style.width)) / this.zoomLevel),
            bottom: Math.max(this.selectStart.y, (parseFloat(this.selectionBox.style.top) + parseFloat(this.selectionBox.style.height)) / this.zoomLevel)
        };
        
        this.placedBlocks.forEach(block => {
            const blockRight = block.x + 200; // Approximate width
            const blockBottom = block.y + 80; // Approximate height
            
            const intersects = !(block.x > boxRect.right || 
                                 blockRight < boxRect.left || 
                                 block.y > boxRect.bottom || 
                                 blockBottom < boxRect.top);
            
            if (intersects) {
                this.selectBlock(block.id);
            }
        });
    }
    
    selectBlock(blockId) {
        this.selectedBlocks.add(blockId);
        const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
        if (blockEl) {
            blockEl.classList.add('selected');
        }
    }
    
    deselectBlock(blockId) {
        this.selectedBlocks.delete(blockId);
        const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
        if (blockEl) {
            blockEl.classList.remove('selected');
        }
    }
    
    toggleBlockSelection(blockId) {
        if (this.selectedBlocks.has(blockId)) {
            this.deselectBlock(blockId);
        } else {
            this.selectBlock(blockId);
        }
    }
    
    clearSelection() {
        // Clear block selection
        this.selectedBlocks.forEach(blockId => {
            const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
            if (blockEl) {
                blockEl.classList.remove('selected');
            }
        });
        this.selectedBlocks.clear();
        
        // Clear connection selection
        this.selectedConnections.clear();
        this.renderArrows(); // Re-render to remove selection highlight
    }
    
    selectConnection(connectionId) {
        this.selectedConnections.add(connectionId);
        this.renderArrows(); // Re-render to show selection highlight
    }
    
    deselectConnection(connectionId) {
        this.selectedConnections.delete(connectionId);
        this.renderArrows(); // Re-render to remove selection highlight
    }
    
    toggleConnectionSelection(connectionId) {
        if (this.selectedConnections.has(connectionId)) {
            this.deselectConnection(connectionId);
        } else {
            this.selectConnection(connectionId);
        }
    }
    
    saveSelectionInitialPositions() {
        this.selectionInitialPositions.clear();
        this.selectedBlocks.forEach(blockId => {
            const placedBlock = this.placedBlocks.find(b => b.id === blockId);
            if (placedBlock) {
                this.selectionInitialPositions.set(blockId, { x: placedBlock.x, y: placedBlock.y });
            }
        });
    }
    
    // ========== COPY-PASTE FUNCTIONALITY ==========
    
    onKeyDown(e) {
        // Escape to cancel connection or clear selection
        if (e.key === 'Escape') {
            if (this.connectingFrom) {
                this.cancelConnection();
            }
            this.hideArrowMenu();
            this.clearSelection();
        }
        
        // Copy: Ctrl/Cmd + C
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            this.copySelected();
        }
        
        // Paste: Ctrl/Cmd + V
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            this.paste();
        }
        
        // Delete selected blocks/connections
        if ((e.key === 'Delete' || e.key === 'Backspace') && 
            (this.selectedBlocks.size > 0 || this.selectedConnections.size > 0)) {
            e.preventDefault();
            this.deleteSelected();
        }
        
        // Edit selected connection: Enter
        if (e.key === 'Enter' && this.selectedConnections.size === 1) {
            e.preventDefault();
            const connId = Array.from(this.selectedConnections)[0];
            const connection = this.connections.find(c => c.id === connId);
            if (connection) {
                this.editConnection(connection);
            }
        }
        
        // Select All: Ctrl/Cmd + A
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            this.selectAll();
        }
        
        // Undo: Ctrl/Cmd + Z
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }
        
        // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
        if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
            ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
            e.preventDefault();
            this.redo();
        }
    }
    
    copySelected() {
        // Support copying blocks, connections, or both
        const hasBlocks = this.selectedBlocks.size > 0;
        const hasConnections = this.selectedConnections.size > 0;
        
        if (!hasBlocks && !hasConnections) return;
        
        const selectedBlockIds = Array.from(this.selectedBlocks);
        const selectedData = [];
        
        // Copy selected blocks
        selectedBlockIds.forEach(blockId => {
            const placedBlock = this.placedBlocks.find(b => b.id === blockId);
            if (placedBlock) {
                selectedData.push({
                    id: blockId,
                    type: placedBlock.type,
                    data: JSON.parse(JSON.stringify(placedBlock.data)), // Deep copy
                    x: placedBlock.x,
                    y: placedBlock.y
                });
            }
        });
        
        // Find connections to copy:
        // 1. Selected connections (explicitly clicked)
        // 2. Internal connections between selected blocks
        const connectionsToCopy = new Map(); // Use Map to avoid duplicates
        
        // Add explicitly selected connections
        this.selectedConnections.forEach(connId => {
            const conn = this.connections.find(c => c.id === connId);
            if (conn) {
                connectionsToCopy.set(connId, {
                    from: conn.from,
                    to: conn.to,
                    relationship: conn.relationship
                });
            }
        });
        
        // Add internal connections between selected blocks
        this.connections.forEach(conn => {
            const fromSelected = selectedBlockIds.includes(conn.from);
            const toSelected = selectedBlockIds.includes(conn.to);
            
            if (fromSelected && toSelected && !connectionsToCopy.has(conn.id)) {
                connectionsToCopy.set(conn.id, {
                    from: conn.from,
                    to: conn.to,
                    relationship: conn.relationship
                });
            }
        });
        
        const selectedConnections = Array.from(connectionsToCopy.values());
        
        // Calculate offset for paste (center of selected blocks)
        const bounds = this.getSelectionBounds(selectedData);
        
        this.clipboard = {
            blocks: selectedData,
            connections: selectedConnections,
            bounds: bounds
        };
        
        this.pasteCount = 0;
        
        // Visual feedback
        const blockText = selectedData.length > 0 ? `${selectedData.length} block${selectedData.length > 1 ? 's' : ''}` : '';
        const connText = selectedConnections.length > 0 ? `${selectedConnections.length} connection${selectedConnections.length > 1 ? 's' : ''}` : '';
        const separator = blockText && connText ? ' and ' : '';
        this.showToast(`Copied ${blockText}${separator}${connText}`);
    }
    
    paste() {
        if (!this.clipboard || this.clipboard.blocks.length === 0) return;
        
        this.pushUndoState(); // Save state for undo
        this.pasteCount++;
        
        // Clear current selection
        this.clearSelection();
        
        // Calculate paste position (offset from original or center of viewport)
        const rect = this.gridCanvas.getBoundingClientRect();
        const scrollLeft = this.gridCanvas.scrollLeft;
        const scrollTop = this.gridCanvas.scrollTop;
        
        // Try to paste at center of viewport, or offset from original
        const viewportCenterX = (scrollLeft + rect.width / 2) / this.zoomLevel;
        const viewportCenterY = (scrollTop + rect.height / 2) / this.zoomLevel;
        
        const offsetX = viewportCenterX - this.clipboard.bounds.centerX + (this.pasteCount * this.clipboardOffset.x);
        const offsetY = viewportCenterY - this.clipboard.bounds.centerY + (this.pasteCount * this.clipboardOffset.y);
        
        // Map old block IDs to new block IDs
        const idMap = new Map();
        const newBlockIds = [];
        
        this.clipboard.blocks.forEach(blockData => {
            const newX = this.snapToGrid(blockData.x + offsetX);
            const newY = this.snapToGrid(blockData.y + offsetY);
            
            const newBlock = this.createPlacedBlock(
                { type: blockData.type, data: blockData.data },
                newX,
                newY
            );
            
            if (newBlock) {
                const newId = newBlock.dataset.blockId;
                idMap.set(blockData.id, newId);
                newBlockIds.push(newId);
            }
        });
        
        // Recreate connections between pasted blocks
        let connCount = 0;
        if (this.clipboard.connections) {
            this.clipboard.connections.forEach(conn => {
                const newFromId = idMap.get(conn.from);
                const newToId = idMap.get(conn.to);
                
                if (newFromId && newToId) {
                    this.createConnection(newFromId, newToId, conn.relationship);
                    connCount++;
                }
            });
        }
        
        // Select the newly pasted blocks
        newBlockIds.forEach(id => this.selectBlock(id));
        
        const connText = connCount > 0 ? ` and ${connCount} connection${connCount > 1 ? 's' : ''}` : '';
        this.showToast(`Pasted ${newBlockIds.length} block${newBlockIds.length > 1 ? 's' : ''}${connText}`);
    }
    
    getSelectionBounds(blocks) {
        if (blocks.length === 0) return { centerX: 0, centerY: 0 };
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        blocks.forEach(block => {
            minX = Math.min(minX, block.x);
            minY = Math.min(minY, block.y);
            maxX = Math.max(maxX, block.x + 200); // Approximate width
            maxY = Math.max(maxY, block.y + 80);  // Approximate height
        });
        
        return {
            minX, minY, maxX, maxY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }
    
    deleteSelected() {
        const hasBlocks = this.selectedBlocks.size > 0;
        const hasConnections = this.selectedConnections.size > 0;
        
        if (!hasBlocks && !hasConnections) return;
        
        this.pushUndoState();
        
        // Delete selected connections first
        let deletedConnections = 0;
        this.selectedConnections.forEach(connId => {
            this.deleteConnection(connId);
            deletedConnections++;
        });
        this.selectedConnections.clear();
        
        // Delete selected blocks
        let deletedBlocks = 0;
        this.selectedBlocks.forEach(blockId => {
            this.deletePlacedBlock(blockId, false);
            deletedBlocks++;
        });
        this.selectedBlocks.clear();
        
        // Show feedback
        const blockText = deletedBlocks > 0 ? `${deletedBlocks} block${deletedBlocks > 1 ? 's' : ''}` : '';
        const connText = deletedConnections > 0 ? `${deletedConnections} connection${deletedConnections > 1 ? 's' : ''}` : '';
        const separator = blockText && connText ? ' and ' : '';
        this.showToast(`Deleted ${blockText}${separator}${connText}`);
    }
    
    deleteConnection(connectionId) {
        this.connections = this.connections.filter(c => c.id !== connectionId);
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }
    
    selectAll() {
        this.placedBlocks.forEach(block => {
            this.selectBlock(block.id);
        });
    }
    
    showToast(message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'canvas-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #1a1a2e;
            color: #fff;
            padding: 10px 20px;
            border-radius: 6px;
            border: 1px solid #333;
            font-size: 13px;
            z-index: 3000;
            animation: toast-appear 0.2s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toast-disappear 0.2s ease';
            setTimeout(() => toast.remove(), 200);
        }, 2000);
    }
    
    // ========== UNDO/REDO FUNCTIONALITY ==========
    
    pushUndoState() {
        // Save current state
        const state = {
            blocks: this.placedBlocks.map(b => ({
                id: b.id,
                type: b.type,
                data: JSON.parse(JSON.stringify(b.data)),
                x: b.x,
                y: b.y
            })),
            connections: JSON.parse(JSON.stringify(this.connections)),
            blockIdCounter: this.blockIdCounter,
            connectionIdCounter: this.connectionIdCounter
        };
        
        this.undoStack.push(state);
        
        // Limit stack size
        if (this.undoStack.length > this.maxUndoSize) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
    }
    
    undo() {
        if (this.undoStack.length === 0) {
            this.showToast('Nothing to undo');
            return;
        }
        
        // Save current state to redo stack
        const currentState = {
            blocks: this.placedBlocks.map(b => ({
                id: b.id,
                type: b.type,
                data: JSON.parse(JSON.stringify(b.data)),
                x: b.x,
                y: b.y
            })),
            connections: JSON.parse(JSON.stringify(this.connections)),
            blockIdCounter: this.blockIdCounter,
            connectionIdCounter: this.connectionIdCounter
        };
        this.redoStack.push(currentState);
        
        // Restore previous state
        const state = this.undoStack.pop();
        this.restoreState(state);
        
        this.showToast('Undo');
    }
    
    redo() {
        if (this.redoStack.length === 0) {
            this.showToast('Nothing to redo');
            return;
        }
        
        // Save current state to undo stack
        const currentState = {
            blocks: this.placedBlocks.map(b => ({
                id: b.id,
                type: b.type,
                data: JSON.parse(JSON.stringify(b.data)),
                x: b.x,
                y: b.y
            })),
            connections: JSON.parse(JSON.stringify(this.connections)),
            blockIdCounter: this.blockIdCounter,
            connectionIdCounter: this.connectionIdCounter
        };
        this.undoStack.push(currentState);
        
        // Restore next state
        const state = this.redoStack.pop();
        this.restoreState(state);
        
        this.showToast('Redo');
    }
    
    restoreState(state) {
        // Clear current selection
        this.clearSelection();
        
        // Remove all existing blocks from DOM
        this.placedBlocks.forEach(block => {
            if (block.element && block.element.parentNode) {
                block.element.parentNode.removeChild(block.element);
            }
        });
        
        // Restore counters
        this.blockIdCounter = state.blockIdCounter;
        this.connectionIdCounter = state.connectionIdCounter;
        
        // Restore blocks
        this.placedBlocks = [];
        state.blocks.forEach(blockData => {
            const block = this.createPlacedBlock(
                { type: blockData.type, data: blockData.data },
                blockData.x,
                blockData.y,
                blockData.id
            );
            if (block) {
                block.dataset.blockId = blockData.id;
            }
        });
        
        // Restore connections
        this.connections = state.connections;
        this.saveConnections();
        this.renderArrows();
        
        // Update output
        this.updateOutput();
        
        // Update grid canvas state
        if (this.placedBlocks.length > 0) {
            this.gridCanvas.classList.add('has-blocks');
        } else {
            this.gridCanvas.classList.remove('has-blocks');
        }
    }
    
    startMultiDrag(e, draggedBlockId) {
        // Start dragging all selected blocks
        this.isDraggingSelection = true;
        this.selectionDragStart = { x: e.clientX, y: e.clientY };
        this.saveSelectionInitialPositions();
        
        // Add dragging class to all selected blocks
        this.selectedBlocks.forEach(blockId => {
            const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
            if (blockEl) {
                blockEl.classList.add('dragging');
            }
        });
        
        // Set up drag handling
        const handleMouseMove = (moveEvent) => {
            if (!this.isDraggingSelection) return;
            
            const dx = (moveEvent.clientX - this.selectionDragStart.x) / this.zoomLevel;
            const dy = (moveEvent.clientY - this.selectionDragStart.y) / this.zoomLevel;
            
            // Check if hovering over delete zone for visual feedback
            const deleteZoneRect = this.deleteZone.getBoundingClientRect();
            const isOverDeleteZone = moveEvent.clientY >= deleteZoneRect.top && 
                                     moveEvent.clientX >= deleteZoneRect.left && 
                                     moveEvent.clientX <= deleteZoneRect.right;
            
            if (isOverDeleteZone) {
                this.deleteZone.classList.add('drag-over');
                document.body.classList.add('delete-zone-active');
            } else {
                this.deleteZone.classList.remove('drag-over');
                document.body.classList.remove('delete-zone-active');
            }
            
            this.selectedBlocks.forEach(blockId => {
                const placedBlock = this.placedBlocks.find(b => b.id === blockId);
                const initialPos = this.selectionInitialPositions.get(blockId);
                
                if (placedBlock && initialPos) {
                    const newX = initialPos.x + dx;
                    const newY = initialPos.y + dy;
                    
                    placedBlock.x = newX;
                    placedBlock.y = newY;
                    placedBlock.element.style.left = `${newX}px`;
                    placedBlock.element.style.top = `${newY}px`;
                }
            });
            
            this.renderArrows();
        };
        
        const handleMouseUp = (upEvent) => {
            if (!this.isDraggingSelection) return;
            
            // Check if dropped on delete zone
            const deleteZoneRect = this.deleteZone.getBoundingClientRect();
            if (upEvent.clientY >= deleteZoneRect.top) {
                this.deleteSelected();
            } else {
                // Snap to grid
                this.selectedBlocks.forEach(blockId => {
                    const placedBlock = this.placedBlocks.find(b => b.id === blockId);
                    if (placedBlock) {
                        placedBlock.x = this.snapToGrid(placedBlock.x);
                        placedBlock.y = this.snapToGrid(placedBlock.y);
                        placedBlock.element.style.left = `${placedBlock.x}px`;
                        placedBlock.element.style.top = `${placedBlock.y}px`;
                    }
                });
                
                this.savePlacedBlocks();
                this.updateOutput();
            }
            
            // Remove dragging class and cleanup highlight
            this.selectedBlocks.forEach(blockId => {
                const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
                if (blockEl) {
                    blockEl.classList.remove('dragging');
                }
            });
            
            this.isDraggingSelection = false;
            this.deleteZone.classList.remove('drag-over');
            document.body.classList.remove('delete-zone-active');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    // Save minimized state to localStorage
    saveMinimizedState(panel, isMinimized) {
        try {
            const states = JSON.parse(localStorage.getItem('codeblocks_panel_states') || '{}');
            states[panel] = isMinimized;
            localStorage.setItem('codeblocks_panel_states', JSON.stringify(states));
        } catch (e) {
            console.warn('Failed to save panel state:', e);
        }
    }
    
    // Restore minimized states from localStorage
    restoreMinimizedStates() {
        try {
            const states = JSON.parse(localStorage.getItem('codeblocks_panel_states') || '{}');
            
            if (states.projects) {
                const projectsPanel = document.getElementById('projectsPanel');
                if (projectsPanel) projectsPanel.classList.add('minimized');
            }
            if (states.savedBlocks) {
                const savedBlocksPanel = document.getElementById('savedBlocksPanel');
                if (savedBlocksPanel) savedBlocksPanel.classList.add('minimized');
            }
            if (states.output) {
                const outputPanel = document.getElementById('outputPanel');
                if (outputPanel) outputPanel.classList.add('minimized');
            }
        } catch (e) {
            console.warn('Failed to restore panel states:', e);
        }
    }
    
    // Load saved blocks from localStorage
    loadSavedBlocks() {
        try {
            const saved = localStorage.getItem('codeblocks_saved');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('Failed to load saved blocks:', e);
            return [];
        }
    }
    
    // Render sidebar with saved blocks
    renderSidebar() {
        this.sidebarContent.innerHTML = '';
        
        if (this.savedBlocks.length === 0) {
            this.sidebarContent.innerHTML = `
                <div class="canvas-sidebar-empty">
                    No saved blocks<br>
                    <small>Save blocks from the main editor</small>
                </div>
            `;
            this.blockCountEl.textContent = '0 blocks';
            return;
        }
        
        this.blockCountEl.textContent = `${this.savedBlocks.length} block${this.savedBlocks.length !== 1 ? 's' : ''}`;
        
        this.savedBlocks.forEach((savedBlock, index) => {
            const el = this.createSidebarBlockElement(savedBlock, index);
            this.sidebarContent.appendChild(el);
        });
    }
    
    createSidebarBlockElement(savedBlock, index) {
        const el = document.createElement('div');
        el.className = `sidebar-block-item block-${savedBlock.type}`;
        el.dataset.index = index;
        el.draggable = true;
        
        const displayName = savedBlock.data?.name || savedBlock.type;
        
        el.innerHTML = `
            <span class="sidebar-block-type">${savedBlock.type}</span>
            <span class="sidebar-block-name" title="${displayName}">${displayName}</span>
        `;
        
        el.addEventListener('dragstart', (e) => {
            this.draggedBlock = savedBlock;
            this.dragSource = 'sidebar';
            el.classList.add('dragging');
            
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('source', 'sidebar');
            e.dataTransfer.setData('blockIndex', index);
            e.dataTransfer.setData('savedBlock', JSON.stringify(savedBlock));
        });
        
        el.addEventListener('dragend', (e) => {
            el.classList.remove('dragging');
            this.draggedBlock = null;
            this.dragSource = null;
        });
        
        el.addEventListener('click', () => {
            this.placeBlockAtCenter(savedBlock);
        });
        
        return el;
    }
    
    placeBlockAtCenter(savedBlock) {
        const rect = this.gridCanvas.getBoundingClientRect();
        const scrollLeft = this.gridCanvas.scrollLeft;
        const scrollTop = this.gridCanvas.scrollTop;
        
        const x = (scrollLeft + rect.width / 2 - 100) / this.zoomLevel;
        const y = (scrollTop + rect.height / 2 - 50) / this.zoomLevel;
        
        this.createPlacedBlock(savedBlock, x, y);
    }
    
    onCanvasDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = this.dragSource === 'sidebar' ? 'copy' : 'move';
    }
    
    onCanvasDrop(e) {
        e.preventDefault();
        
        const source = e.dataTransfer.getData('source');
        const canvasPos = this.screenToCanvas(e.clientX, e.clientY);
        
        let x = canvasPos.x;
        let y = canvasPos.y;
        
        if (source === 'sidebar') {
            const savedBlockData = e.dataTransfer.getData('savedBlock');
            if (savedBlockData) {
                const savedBlock = JSON.parse(savedBlockData);
                x -= 100;
                y -= 30;
                this.createPlacedBlock(savedBlock, x, y);
            }
        } else if (source === 'canvas' && this.draggedBlock) {
            const blockId = this.draggedBlock.dataset.blockId;
            const placedBlock = this.placedBlocks.find(b => b.id === blockId);
            
            if (placedBlock) {
                x -= this.dragOffset.x / this.zoomLevel;
                y -= this.dragOffset.y / this.zoomLevel;
                
                placedBlock.x = this.snapToGrid(x);
                placedBlock.y = this.snapToGrid(y);
                
                this.draggedBlock.style.left = `${placedBlock.x}px`;
                this.draggedBlock.style.top = `${placedBlock.y}px`;
                
                this.savePlacedBlocks();
                this.renderArrows();
            }
        }
        
        this.draggedBlock = null;
        this.dragSource = null;
    }
    
    snapToGrid(value) {
        return Math.round(value / this.gridSize) * this.gridSize;
    }
    
    createPlacedBlock(savedBlock, x, y, blockId = null) {
        this.gridCanvas.classList.add('has-blocks');
        
        const finalBlockId = blockId || `placed-${this.blockIdCounter++}`;
        const snappedX = this.snapToGrid(x);
        const snappedY = this.snapToGrid(y);
        
        const blockEl = document.createElement('div');
        blockEl.className = `placed-block block-${savedBlock.type}`;
        blockEl.dataset.blockId = finalBlockId;
        blockEl.style.left = `${snappedX}px`;
        blockEl.style.top = `${snappedY}px`;
        
        const displayName = savedBlock.data?.name || savedBlock.type;
        
        let contentHtml = '';
        if (savedBlock.data) {
            const fields = [];
            if (savedBlock.data.purpose) {
                fields.push(`<div class="placed-block-field"><strong>Purpose:</strong> ${this.truncateText(savedBlock.data.purpose, 30)}</div>`);
            }
            if (savedBlock.data.parameters) {
                fields.push(`<div class="placed-block-field"><strong>Params:</strong> ${this.truncateText(savedBlock.data.parameters, 25)}</div>`);
            }
            if (savedBlock.data.returns) {
                fields.push(`<div class="placed-block-field"><strong>Returns:</strong> ${savedBlock.data.returns}</div>`);
            }
            if (savedBlock.data.varType) {
                fields.push(`<div class="placed-block-field"><strong>Type:</strong> ${savedBlock.data.varType}</div>`);
            }
            if (savedBlock.data.value) {
                fields.push(`<div class="placed-block-field"><strong>Value:</strong> ${this.truncateText(savedBlock.data.value, 20)}</div>`);
            }
            if (savedBlock.data.module) {
                fields.push(`<div class="placed-block-field"><strong>Module:</strong> ${savedBlock.data.module}</div>`);
            }
            contentHtml = fields.join('');
        }
        
        blockEl.innerHTML = `
            <div class="placed-block-header">
                <span class="placed-block-type">${savedBlock.type}</span>
                <span class="placed-block-name" title="${displayName}">${displayName}</span>
                <div class="placed-block-actions">
                    <button class="placed-block-connect" title="Connect to another block">↗</button>
                    <button class="placed-block-delete" title="Delete">×</button>
                </div>
            </div>
            ${contentHtml ? `<div class="placed-block-content">${contentHtml}</div>` : ''}
        `;
        
        // Delete button
        blockEl.querySelector('.placed-block-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deletePlacedBlock(finalBlockId);
        });
        
        // Connect button
        blockEl.querySelector('.placed-block-connect').addEventListener('click', (e) => {
            e.stopPropagation();
            this.startConnection(finalBlockId);
        });
        
        // Make draggable
        blockEl.draggable = true;
        blockEl.addEventListener('dragstart', (e) => {
            // Don't drag if we're in connecting mode
            if (this.connectingFrom) {
                e.preventDefault();
                return;
            }
            
            // If this block is selected as part of multi-selection, use multi-drag instead
            if (this.selectedBlocks.size > 1 && this.selectedBlocks.has(finalBlockId)) {
                e.preventDefault();
                this.startMultiDrag(e, finalBlockId);
                return;
            }
            
            this.draggedBlock = blockEl;
            this.dragSource = 'canvas';
            blockEl.classList.add('dragging');
            
            const rect = blockEl.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('source', 'canvas');
            e.dataTransfer.setData('blockId', finalBlockId);
        });
        
        blockEl.addEventListener('dragend', (e) => {
            blockEl.classList.remove('dragging');
        });
        
        // Click to select as connection target
        blockEl.addEventListener('click', (e) => {
            if (this.connectingFrom && this.connectingFrom !== finalBlockId) {
                this.completeConnection(finalBlockId);
            }
        });
        
        this.canvasContent.appendChild(blockEl);
        
        this.placedBlocks.push({
            id: finalBlockId,
            type: savedBlock.type,
            data: savedBlock.data,
            x: snappedX,
            y: snappedY,
            element: blockEl
        });
        
        this.savePlacedBlocks();
        this.updateOutput();
        
        return blockEl;
    }
    
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    }
    
    // Start creating a connection from a block
    startConnection(blockId) {
        if (this.connectingFrom) {
            // Cancel previous connection
            this.cancelConnection();
        }
        
        // Clear any selection to prevent accidental deletion while typing
        this.clearSelection();
        
        this.connectingFrom = blockId;
        
        // Visual feedback
        const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
        if (blockEl) {
            blockEl.classList.add('connecting');
        }
        
        // Update hint
        this.canvasHint.textContent = 'Click another block to connect, or press Escape to cancel';
        this.canvasHint.classList.add('connecting');
        
        // Create temporary arrow
        this.createTempArrow();
    }
    
    // Create temporary arrow that follows cursor
    createTempArrow() {
        const fromBlock = this.placedBlocks.find(b => b.id === this.connectingFrom);
        if (!fromBlock) return;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('temp-arrow');
        this.arrowLayer.appendChild(path);
        this.tempArrow = path;
        
        this.updateTempArrow();
    }
    
    // Update temporary arrow position
    updateTempArrow() {
        if (!this.tempArrow || !this.connectingFrom) return;
        
        const fromBlock = this.placedBlocks.find(b => b.id === this.connectingFrom);
        if (!fromBlock) return;
        
        const startX = fromBlock.x + 200; // Right side of block
        const startY = fromBlock.y + 40;  // Middle of block
        
        const path = this.tempArrow;
        path.setAttribute('d', `M ${startX} ${startY} L ${this.mouseX || startX + 100} ${this.mouseY || startY}`);
    }
    
    // Track mouse position for temp arrow (called from main onCanvasMouseMove)
    trackMouseForTempArrow(e) {
        if (!this.connectingFrom) return;
        
        const rect = this.gridCanvas.getBoundingClientRect();
        const scrollLeft = this.gridCanvas.scrollLeft;
        const scrollTop = this.gridCanvas.scrollTop;
        
        this.mouseX = (e.clientX - rect.left + scrollLeft) / this.zoomLevel;
        this.mouseY = (e.clientY - rect.top + scrollTop) / this.zoomLevel;
        
        this.updateTempArrow();
    }
    
    // Handle clicks on canvas (cancel connection if clicking empty space)
    onCanvasClick(e) {
        // Hide arrow menu when clicking elsewhere
        if (!e.target.closest('.arrow-menu')) {
            this.hideArrowMenu();
        }
        
        // Check if clicking on empty canvas area (not on a block or connection)
        const isBlock = e.target.closest('.placed-block');
        const isConnection = e.target.closest('.connection-group');
        const isArrowMenu = e.target.closest('.arrow-menu');
        
        // If we're in connecting mode and clicked on empty space, cancel connection
        if (this.connectingFrom && !isBlock && !isConnection && !isArrowMenu) {
            this.cancelConnection();
            return;
        }
        
        // Original behavior: cancel connection when clicking canvas background
        if (e.target === this.gridCanvas || e.target.classList.contains('canvas-placeholder')) {
            this.cancelConnection();
        }
    }
    
    // Complete connection to target block
    completeConnection(targetBlockId) {
        if (!this.connectingFrom || this.connectingFrom === targetBlockId) {
            this.cancelConnection();
            return;
        }
        
        // Check if connection already exists
        const existingConnection = this.connections.find(
            c => c.from === this.connectingFrom && c.to === targetBlockId
        );
        
        if (existingConnection) {
            alert('Connection already exists between these blocks!');
            this.cancelConnection();
            return;
        }
        
        // Hide any arrow menu
        this.hideArrowMenu();
        
        // Show modal to define relationship
        const fromBlock = this.placedBlocks.find(b => b.id === this.connectingFrom);
        const toBlock = this.placedBlocks.find(b => b.id === targetBlockId);
        
        if (fromBlock && toBlock) {
            // Clear selection before showing modal to prevent accidental deletion
            this.clearSelection();
            
            this.fromBlockNameEl.textContent = fromBlock.data?.name || fromBlock.type;
            this.toBlockNameEl.textContent = toBlock.data?.name || toBlock.type;
            this.relationshipInput.value = '';
            
            this.relationshipModal.classList.remove('hidden');
            this.relationshipInput.focus();
            
            // Store pending connection
            this.pendingConnection = {
                from: this.connectingFrom,
                to: targetBlockId
            };
        }
    }
    
    // Confirm and create the connection
    confirmConnection() {
        if (!this.pendingConnection) {
            this.cancelConnection();
            return;
        }
        
        this.pushUndoState();
        
        const relationship = this.relationshipInput.value.trim() || 'connects to';
        
        this.createConnection(
            this.pendingConnection.from,
            this.pendingConnection.to,
            relationship
        );
        
        this.cancelConnection();
    }
    
    createConnection(fromId, toId, label) {
        const connection = {
            id: `conn-${this.connectionIdCounter++}`,
            from: fromId,
            to: toId,
            relationship: label
        };
        
        this.connections.push(connection);
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }
    
    // Cancel the current connection operation
    cancelConnection() {
        this.relationshipModal.classList.add('hidden');
        this.cleanupConnection();
    }
    
    // Clean up connection state
    cleanupConnection() {
        if (this.connectingFrom) {
            const blockEl = document.querySelector(`[data-block-id="${this.connectingFrom}"]`);
            if (blockEl) {
                blockEl.classList.remove('connecting');
            }
        }
        
        if (this.tempArrow) {
            this.tempArrow.remove();
            this.tempArrow = null;
        }
        
        this.connectingFrom = null;
        this.pendingConnection = null;
        this.canvasHint.textContent = 'Drag blocks from sidebar to place • Click block to connect';
        this.canvasHint.classList.remove('connecting');
    }
    
    // Show arrow context menu
    showArrowMenu(connection, event) {
        // Hide any existing menu
        this.hideArrowMenu();
        
        // Create menu
        const menu = document.createElement('div');
        menu.className = 'arrow-menu';
        menu.id = 'arrowMenu';
        
        const fromBlock = this.placedBlocks.find(b => b.id === connection.from);
        const toBlock = this.placedBlocks.find(b => b.id === connection.to);
        const fromName = fromBlock?.data?.name || fromBlock?.type || 'Unknown';
        const toName = toBlock?.data?.name || toBlock?.type || 'Unknown';
        
        menu.innerHTML = `
            <div class="arrow-menu-header">${fromName} → ${toName}</div>
            <div class="arrow-menu-item" data-action="edit">✏️ Edit</div>
            <div class="arrow-menu-item" data-action="delete">🗑️ Delete</div>
        `;
        
        // Position menu near click
        const rect = this.gridCanvas.getBoundingClientRect();
        let x = event.clientX - rect.left + this.gridCanvas.scrollLeft;
        let y = event.clientY - rect.top + this.gridCanvas.scrollTop;
        
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        
        // Add click handlers
        menu.querySelectorAll('.arrow-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                if (action === 'edit') {
                    this.editConnection(connection);
                } else if (action === 'delete') {
                    this.deleteConnection(connection.id);
                }
                this.hideArrowMenu();
            });
        });
        
        this.gridCanvas.appendChild(menu);
        
        // Adjust position if menu goes off screen
        const menuRect = menu.getBoundingClientRect();
        if (menuRect.right > rect.right) {
            menu.style.left = `${x - menuRect.width}px`;
        }
        if (menuRect.bottom > rect.bottom) {
            menu.style.top = `${y - menuRect.height}px`;
        }
    }
    
    // Hide arrow menu
    hideArrowMenu() {
        const existing = document.getElementById('arrowMenu');
        if (existing) existing.remove();
    }
    
    // Edit connection relationship
    editConnection(connection) {
        const newRelationship = prompt('Edit relationship:', connection.relationship || '');
        if (newRelationship !== null) {
            connection.relationship = newRelationship.trim() || 'connects to';
            this.saveConnections();
            this.renderArrows();
            this.updateOutput();
        }
    }
    
    // Delete connection
    deleteConnection(connectionId) {
        if (!confirm('Delete this connection?')) return;
        
        this.connections = this.connections.filter(c => c.id !== connectionId);
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }
    
    // Render all connection arrows
    renderArrows() {
        // Hide any arrow menu
        this.hideArrowMenu();
        
        // Clear existing connection groups
        const existingGroups = this.arrowLayer.querySelectorAll('.connection-group');
        existingGroups.forEach(group => group.remove());
        
        // Clear existing standalone labels (for backwards compatibility)
        const existingLabels = this.arrowLayer.querySelectorAll('rect, text');
        existingLabels.forEach(label => label.remove());
        
        // Render each connection
        this.connections.forEach(conn => {
            this.renderConnection(conn);
        });
    }
    
    // Render a single connection
    renderConnection(connection) {
        const fromBlock = this.placedBlocks.find(b => b.id === connection.from);
        const toBlock = this.placedBlocks.find(b => b.id === connection.to);
        
        if (!fromBlock || !toBlock) return;
        
        // Calculate connection points
        const startX = fromBlock.x + 200; // Right edge
        const startY = fromBlock.y + 40;  // Middle
        const endX = toBlock.x;           // Left edge
        const endY = toBlock.y + 40;      // Middle
        
        // Create a group for the connection
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('connection-group');
        group.dataset.connectionId = connection.id;
        group.style.cursor = 'pointer';
        
        // Calculate path
        const controlX = (startX + endX) / 2;
        const pathD = `M ${startX} ${startY} Q ${controlX} ${startY} ${(startX + endX) / 2} ${(startY + endY) / 2} Q ${controlX} ${endY} ${endX} ${endY}`;
        
        // Create a wider invisible background path for easier clicking/hovering
        const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bgPath.setAttribute('d', pathD);
        bgPath.setAttribute('stroke', 'transparent');
        bgPath.setAttribute('stroke-width', '80'); // 2x wider for easier selection
        bgPath.setAttribute('fill', 'none');
        bgPath.style.pointerEvents = 'stroke';
        bgPath.style.cursor = 'pointer';
        
        // Create invisible hit path for clicking (medium width)
        const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitPath.setAttribute('d', pathD);
        hitPath.setAttribute('stroke', 'transparent');
        hitPath.setAttribute('stroke-width', '50'); // 2x wider
        hitPath.setAttribute('fill', 'none');
        hitPath.style.pointerEvents = 'stroke';
        
        // Create visible path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('stroke', '#4a90d9');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', 'url(#arrowhead)');
        path.style.pointerEvents = 'none';
        
        group.appendChild(bgPath);   // Widest - for easy hovering
        group.appendChild(hitPath);  // Medium - for clicking
        group.appendChild(path);     // Visible line
        
        // Click handler - select connection or show menu
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Toggle selection with Ctrl/Cmd, otherwise just show menu
            if (e.ctrlKey || e.metaKey) {
                this.toggleConnectionSelection(connection.id);
            } else {
                // Clear block selection when clicking connection
                this.clearSelection();
                this.showArrowMenu(connection, e);
            }
        });
        
        // Apply selected state
        if (this.selectedConnections.has(connection.id)) {
            group.classList.add('selected');
            path.setAttribute('stroke', '#f59e0b'); // Orange for selected
            path.setAttribute('stroke-width', '3');
        }
        
        this.arrowLayer.appendChild(group);
        
        // Add label if relationship exists
        if (connection.relationship) {
            this.renderArrowLabel((startX + endX) / 2, (startY + endY) / 2, connection.relationship, group);
        }
    }
    
    // Render label for arrow
    renderArrowLabel(x, y, text, parentGroup) {
        const padding = 6;
        const charWidth = 6;
        const textWidth = text.length * charWidth + padding * 2;
        const textHeight = 18;
        
        // Background rect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x - textWidth / 2);
        rect.setAttribute('y', y - textHeight / 2);
        rect.setAttribute('width', textWidth);
        rect.setAttribute('height', textHeight);
        rect.setAttribute('class', 'arrow-label-bg');
        rect.style.pointerEvents = 'none';
        
        // Text
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y + 1); // Slight adjustment for vertical centering
        label.setAttribute('class', 'arrow-label');
        label.textContent = text;
        label.style.pointerEvents = 'none';
        
        if (parentGroup) {
            parentGroup.appendChild(rect);
            parentGroup.appendChild(label);
        } else {
            this.arrowLayer.appendChild(rect);
            this.arrowLayer.appendChild(label);
        }
    }
    
    deletePlacedBlock(blockId, saveUndo = true) {
        if (saveUndo) {
            this.pushUndoState();
        }
        
        // Remove connections to/from this block
        this.connections = this.connections.filter(c => c.from !== blockId && c.to !== blockId);
        
        const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
        if (blockEl) {
            blockEl.remove();
        }
        
        this.placedBlocks = this.placedBlocks.filter(b => b.id !== blockId);
        
        if (this.placedBlocks.length === 0) {
            this.gridCanvas.classList.remove('has-blocks');
        }
        
        this.savePlacedBlocks();
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }
    
    onDeleteZoneDragOver(e) {
        e.preventDefault();
        // Accept drops from canvas blocks or when items are selected
        if (this.dragSource === 'canvas' || this.selectedBlocks.size > 0 || this.selectedConnections.size > 0) {
            e.dataTransfer.dropEffect = 'move';
            this.deleteZone.classList.add('drag-over');
            document.body.classList.add('delete-zone-active');
        }
    }
    
    onDeleteZoneDragLeave(e) {
        this.deleteZone.classList.remove('drag-over');
        document.body.classList.remove('delete-zone-active');
    }
    
    onDeleteZoneDrop(e) {
        e.preventDefault();
        this.deleteZone.classList.remove('drag-over');
        document.body.classList.remove('delete-zone-active');
        
        const source = e.dataTransfer.getData('source');
        const blockId = e.dataTransfer.getData('blockId');
        const connectionId = e.dataTransfer.getData('connectionId');
        
        this.pushUndoState();
        
        if (source === 'canvas' && blockId) {
            // Delete a single dragged block
            this.deletePlacedBlock(blockId, false);
            this.showToast('Block deleted');
        } else if (source === 'canvas' && connectionId) {
            // Delete a single dragged connection
            this.deleteConnection(connectionId);
            this.showToast('Connection deleted');
        } else if (this.selectedBlocks.size > 0 || this.selectedConnections.size > 0) {
            // Delete all selected items
            this.deleteSelected();
        }
        
        this.draggedBlock = null;
        this.dragSource = null;
    }
    
    clearCanvas() {
        if (this.placedBlocks.length === 0) return;
        
        if (!confirm('Clear all blocks and connections from canvas?')) return;
        
        this.pushUndoState();
        
        this.placedBlocks.forEach(block => {
            const el = document.querySelector(`[data-block-id="${block.id}"]`);
            if (el) el.remove();
        });
        
        this.placedBlocks = [];
        this.connections = [];
        this.gridCanvas.classList.remove('has-blocks');
        
        this.savePlacedBlocks();
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }
    
    // Generate and update JSON output
    updateOutput() {
        const output = this.generateSystemJSON();
        this.canvasOutput.textContent = JSON.stringify(output, null, 2);
    }
    
    generateSystemJSON() {
        if (this.placedBlocks.length === 0) {
            return { message: "Add blocks to define your system" };
        }
        
        // Build blocks structure without internal fields (id, position not relevant for LLM)
        const blocks = this.placedBlocks.map(b => ({
            type: b.type,
            name: b.data?.name || b.type,
            ...this.filterRelevantData(b.data)
        }));
        
        // Build connections with meaningful names
        const connections = this.connections.map(c => {
            const fromBlock = this.placedBlocks.find(b => b.id === c.from);
            const toBlock = this.placedBlocks.find(b => b.id === c.to);
            return {
                from: fromBlock?.data?.name || fromBlock?.type,
                to: toBlock?.data?.name || toBlock?.type,
                relationship: c.relationship
            };
        });
        
        // Build natural language description
        const description = this.buildDescription(blocks, connections);
        
        return {
            instruction: description,
            blocks: blocks,
            relationships: connections,
            summary: {
                totalBlocks: blocks.length,
                totalRelationships: connections.length
            }
        };
    }
    
    // Filter only data fields relevant for code generation
    filterRelevantData(data) {
        if (!data) return {};
        
        const relevantFields = {};
        
        // Common fields
        if (data.purpose) relevantFields.purpose = data.purpose;
        
        // Type-specific fields
        if (data.parameters !== undefined && data.parameters !== '') {
            relevantFields.parameters = data.parameters;
        }
        if (data.returns !== undefined && data.returns !== '') {
            relevantFields.returns = data.returns;
        }
        if (data.varType !== undefined && data.varType !== '') {
            relevantFields.type = data.varType;
        }
        if (data.value !== undefined && data.value !== '') {
            relevantFields.initialValue = data.value;
        }
        if (data.module) relevantFields.module = data.module;
        if (data.items) relevantFields.imports = data.items;
        if (data.customType) relevantFields.customType = data.customType;
        
        return relevantFields;
    }
    
    // Build a natural language description of the system
    buildDescription(blocks, connections) {
        let description = "Generate code with the following structure:\n\n";
        
        // Group blocks by type
        const byType = {};
        blocks.forEach(block => {
            if (!byType[block.type]) byType[block.type] = [];
            byType[block.type].push(block);
        });
        
        // Describe each block
        blocks.forEach(block => {
            description += this.describeBlock(block);
        });
        
        // Describe relationships
        if (connections.length > 0) {
            description += '\nRelationships:\n';
            connections.forEach(conn => {
                description += `  - ${conn.from} ${conn.relationship} ${conn.to}\n`;
            });
        }
        
        description += '\nPlease implement clean, well-documented code following best practices.';
        
        return description;
    }
    
    describeBlock(block) {
        let desc = '';
        
        switch (block.type) {
            case 'class':
                desc += `Class "${block.name}"`;
                if (block.purpose) desc += ` - ${block.purpose}`;
                desc += '\n';
                break;
                
            case 'function':
                desc += `  Function "${block.name}"`;
                if (block.parameters) desc += `(${block.parameters})`;
                else desc += '()';
                if (block.returns) desc += ` -> ${block.returns}`;
                if (block.purpose) desc += ` - ${block.purpose}`;
                desc += '\n';
                break;
                
            case 'variable':
                desc += `  Variable "${block.name}"`;
                if (block.type) desc += `: ${block.type}`;
                if (block.initialValue) desc += ` = ${block.initialValue}`;
                if (block.purpose) desc += ` - ${block.purpose}`;
                desc += '\n';
                break;
                
            case 'import':
                desc += `Import "${block.name}"`;
                if (block.imports) desc += ` { ${block.imports} }`;
                if (block.purpose) desc += ` - ${block.purpose}`;
                desc += '\n';
                break;
                
            case 'custom':
                desc += `${block.customType || 'Component'} "${block.name}"`;
                if (block.purpose) desc += ` - ${block.purpose}`;
                desc += '\n';
                break;
                
            default:
                desc += `${block.type} "${block.name}"\n`;
        }
        
        return desc;
    }
    
    copyOutput() {
        const text = this.canvasOutput.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copyOutputBtn');
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 1500);
        });
    }
    
    // Persistence
    savePlacedBlocks() {
        try {
            const data = this.placedBlocks.map(b => ({
                id: b.id,
                type: b.type,
                data: b.data,
                x: b.x,
                y: b.y
            }));
            localStorage.setItem('codeblocks_canvas_placed', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save placed blocks:', e);
        }
    }
    
    saveConnections() {
        try {
            localStorage.setItem('codeblocks_canvas_connections', JSON.stringify(this.connections));
        } catch (e) {
            console.warn('Failed to save connections:', e);
        }
    }
    
    loadPlacedBlocks() {
        try {
            const saved = localStorage.getItem('codeblocks_canvas_placed');
            if (saved) {
                const blocks = JSON.parse(saved);
                // Create a mapping of old IDs to new IDs
                this.blockIdMapping = {};
                
                blocks.forEach(block => {
                    const newBlock = this.createPlacedBlock(
                        { type: block.type, data: block.data },
                        block.x,
                        block.y
                    );
                    // Map old ID to new ID for connection restoration
                    this.blockIdMapping[block.id] = newBlock.dataset.blockId;
                });
            }
        } catch (e) {
            console.warn('Failed to load placed blocks:', e);
        }
    }
    
    loadConnections() {
        try {
            const saved = localStorage.getItem('codeblocks_canvas_connections');
            if (saved) {
                const loadedConnections = JSON.parse(saved);
                
                // Remap connection IDs if we have a mapping from loadPlacedBlocks
                if (this.blockIdMapping) {
                    this.connections = loadedConnections.map(conn => ({
                        ...conn,
                        from: this.blockIdMapping[conn.from] || conn.from,
                        to: this.blockIdMapping[conn.to] || conn.to
                    }));
                    this.blockIdMapping = null; // Clear mapping after use
                } else {
                    this.connections = loadedConnections;
                }
                
                this.connectionIdCounter = this.connections.length;
                this.renderArrows();
                this.updateOutput();
            }
        } catch (e) {
            console.warn('Failed to load connections:', e);
        }
    }
    
    // ========== PROJECTS ==========
    
    loadProjects() {
        try {
            const saved = localStorage.getItem('codeblocks_canvas_projects');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('Failed to load projects:', e);
            return [];
        }
    }
    
    saveProjects() {
        try {
            localStorage.setItem('codeblocks_canvas_projects', JSON.stringify(this.projects));
        } catch (e) {
            console.warn('Failed to save projects:', e);
        }
    }
    
    renderProjects() {
        const container = document.getElementById('canvasProjectsContent');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.projects.length === 0) {
            container.innerHTML = `
                <div class="canvas-projects-empty">
                    No saved projects<br>
                    <small>Save your canvas layout here</small>
                </div>
            `;
            return;
        }
        
        this.projects.forEach((project, index) => {
            const el = document.createElement('div');
            el.className = `project-item ${project.id === this.currentProjectId ? 'active' : ''}`;
            el.dataset.index = index;
            
            const date = new Date(project.savedAt).toLocaleDateString();
            const blockCount = project.blocks?.length || 0;
            const connCount = project.connections?.length || 0;
            
            el.innerHTML = `
                <div class="project-name">${project.name}</div>
                <div class="project-meta">
                    <span>${blockCount} blocks, ${connCount} connections</span>
                    <span>${date}</span>
                </div>
                <div class="project-actions">
                    <button class="project-rename" title="Rename project">✏️</button>
                    <button class="project-edit" title="Edit project (save current canvas to this project)">💾</button>
                    <button class="project-delete" title="Delete project">🗑️</button>
                </div>
            `;
            
            // Click to load project
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('project-delete')) {
                    e.stopPropagation();
                    this.deleteProject(index);
                } else if (e.target.classList.contains('project-rename')) {
                    e.stopPropagation();
                    this.renameProject(index);
                } else if (e.target.classList.contains('project-edit')) {
                    e.stopPropagation();
                    this.editProject(index);
                } else {
                    // Check if canvas has unsaved changes
                    if (this.placedBlocks.length > 0) {
                        const confirmed = confirm(
                            `Loading "${project.name}" will replace the current canvas content.\n\n` +
                            `You have ${this.placedBlocks.length} block(s) on the canvas that will be cleared.\n\n` +
                            `Do you want to continue?`
                        );
                        if (!confirmed) return;
                    }
                    this.loadProject(index);
                }
            });
            
            container.appendChild(el);
        });
    }
    
    saveCurrentProject() {
        const name = prompt('Enter project name:', `Project ${this.projects.length + 1}`);
        if (!name || !name.trim()) return;
        
        const project = {
            id: 'proj-' + Date.now(),
            name: name.trim(),
            blocks: this.placedBlocks.map(b => ({
                id: b.id,
                type: b.type,
                data: b.data,
                x: b.x,
                y: b.y
            })),
            connections: this.connections,
            savedAt: new Date().toISOString()
        };
        
        this.projects.push(project);
        this.currentProjectId = project.id;
        this.saveProjects();
        this.renderProjects();
    }
    
    loadProject(index) {
        const project = this.projects[index];
        if (!project) return;
        
        // Clear current canvas
        this.clearCanvasWithoutConfirm();
        
        // Load blocks
        this.blockIdCounter = 0;
        project.blocks.forEach(block => {
            this.createPlacedBlock(
                { type: block.type, data: block.data },
                block.x,
                block.y
            );
        });
        
        // Load connections
        this.connections = project.connections || [];
        this.connectionIdCounter = this.connections.length;
        this.saveConnections();
        this.renderArrows();
        
        this.currentProjectId = project.id;
        this.renderProjects();
        this.updateOutput();
    }
    
    deleteProject(index) {
        if (!confirm('Delete this project?')) return;
        
        const project = this.projects[index];
        if (project.id === this.currentProjectId) {
            this.currentProjectId = null;
        }
        
        this.projects.splice(index, 1);
        this.saveProjects();
        this.renderProjects();
        this.showToast('Project deleted');
    }
    
    renameProject(index) {
        const project = this.projects[index];
        if (!project) return;
        
        const newName = prompt('Enter new project name:', project.name);
        if (!newName || !newName.trim()) return;
        
        project.name = newName.trim();
        project.savedAt = new Date().toISOString();
        this.saveProjects();
        this.renderProjects();
        this.showToast('Project renamed');
    }
    
    editProject(index) {
        const project = this.projects[index];
        if (!project) return;
        
        const confirmed = confirm(
            `Update "${project.name}" with the current canvas content?\n\n` +
            `This will replace the project's saved blocks and connections.\n\n` +
            `Are you sure?`
        );
        if (!confirmed) return;
        
        // Update project with current canvas state
        project.blocks = this.placedBlocks.map(b => ({
            id: b.id,
            type: b.type,
            data: JSON.parse(JSON.stringify(b.data)), // Deep copy
            x: b.x,
            y: b.y
        }));
        project.connections = JSON.parse(JSON.stringify(this.connections)); // Deep copy
        project.savedAt = new Date().toISOString();
        
        this.currentProjectId = project.id;
        this.saveProjects();
        this.renderProjects();
        this.showToast('Project updated');
    }
    
    clearCanvasWithoutConfirm() {
        this.placedBlocks.forEach(block => {
            const el = document.querySelector(`[data-block-id="${block.id}"]`);
            if (el) el.remove();
        });
        
        this.placedBlocks = [];
        this.connections = [];
        this.gridCanvas.classList.remove('has-blocks');
        
        this.savePlacedBlocks();
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.gridCanvas = new GridCanvas();
    window.gridCanvas.loadPlacedBlocks();
    window.gridCanvas.loadConnections();
    
    // Escape key to cancel connection, close arrow menu, or clear selection
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (window.gridCanvas.connectingFrom) {
                window.gridCanvas.cancelConnection();
            }
            window.gridCanvas.hideArrowMenu();
            window.gridCanvas.clearSelection();
        }
    });
});
