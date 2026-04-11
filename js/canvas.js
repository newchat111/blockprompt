// Grid Canvas - Full page canvas with draggable blocks and arrow connections

class GridCanvas {
    constructor() {
        this.gridCanvas = document.getElementById('gridCanvas');
        this.sidebarContent = document.getElementById('canvasSidebarContent');
        this.deleteZone = document.getElementById('deleteZone');
        this.blockCountEl = document.getElementById('blockCount');
        this.arrowLayer = document.getElementById('arrowLayer');
        this.canvasOutput = document.getElementById('canvasOutput');
        this.canvasHint = document.getElementById('canvasHint');
        
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
        
        // Mouse events for drawing temporary arrow
        this.gridCanvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        this.gridCanvas.addEventListener('click', (e) => this.onCanvasClick(e));
        
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
        
        const x = scrollLeft + rect.width / 2 - 100;
        const y = scrollTop + rect.height / 2 - 50;
        
        this.createPlacedBlock(savedBlock, x, y);
    }
    
    onCanvasDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = this.dragSource === 'sidebar' ? 'copy' : 'move';
    }
    
    onCanvasDrop(e) {
        e.preventDefault();
        
        const source = e.dataTransfer.getData('source');
        const rect = this.gridCanvas.getBoundingClientRect();
        const scrollLeft = this.gridCanvas.scrollLeft;
        const scrollTop = this.gridCanvas.scrollTop;
        
        let x = e.clientX - rect.left + scrollLeft;
        let y = e.clientY - rect.top + scrollTop;
        
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
                x -= this.dragOffset.x;
                y -= this.dragOffset.y;
                
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
    
    createPlacedBlock(savedBlock, x, y) {
        this.gridCanvas.classList.add('has-blocks');
        
        const blockId = `placed-${this.blockIdCounter++}`;
        const snappedX = this.snapToGrid(x);
        const snappedY = this.snapToGrid(y);
        
        const blockEl = document.createElement('div');
        blockEl.className = `placed-block block-${savedBlock.type}`;
        blockEl.dataset.blockId = blockId;
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
            this.deletePlacedBlock(blockId);
        });
        
        // Connect button
        blockEl.querySelector('.placed-block-connect').addEventListener('click', (e) => {
            e.stopPropagation();
            this.startConnection(blockId);
        });
        
        // Make draggable
        blockEl.draggable = true;
        blockEl.addEventListener('dragstart', (e) => {
            // Don't drag if we're in connecting mode
            if (this.connectingFrom) {
                e.preventDefault();
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
            e.dataTransfer.setData('blockId', blockId);
        });
        
        blockEl.addEventListener('dragend', (e) => {
            blockEl.classList.remove('dragging');
        });
        
        // Click to select as connection target
        blockEl.addEventListener('click', (e) => {
            if (this.connectingFrom && this.connectingFrom !== blockId) {
                this.completeConnection(blockId);
            }
        });
        
        this.gridCanvas.appendChild(blockEl);
        
        this.placedBlocks.push({
            id: blockId,
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
    
    // Track mouse position for temp arrow
    onCanvasMouseMove(e) {
        if (!this.connectingFrom) return;
        
        const rect = this.gridCanvas.getBoundingClientRect();
        const scrollLeft = this.gridCanvas.scrollLeft;
        const scrollTop = this.gridCanvas.scrollTop;
        
        this.mouseX = e.clientX - rect.left + scrollLeft;
        this.mouseY = e.clientY - rect.top + scrollTop;
        
        this.updateTempArrow();
    }
    
    // Handle clicks on canvas (cancel connection if clicking empty space)
    onCanvasClick(e) {
        // Hide arrow menu when clicking elsewhere
        if (!e.target.closest('.arrow-menu')) {
            this.hideArrowMenu();
        }
        
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
        
        const relationship = this.relationshipInput.value.trim() || 'connects to';
        
        const connection = {
            id: `conn-${this.connectionIdCounter++}`,
            from: this.pendingConnection.from,
            to: this.pendingConnection.to,
            relationship: relationship
        };
        
        this.connections.push(connection);
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
        
        this.relationshipModal.classList.add('hidden');
        this.cleanupConnection();
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
        
        // Create invisible wider path for easier clicking
        const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const controlX = (startX + endX) / 2;
        const pathD = `M ${startX} ${startY} Q ${controlX} ${startY} ${(startX + endX) / 2} ${(startY + endY) / 2} Q ${controlX} ${endY} ${endX} ${endY}`;
        hitPath.setAttribute('d', pathD);
        hitPath.setAttribute('stroke', 'transparent');
        hitPath.setAttribute('stroke-width', '20');
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
        
        group.appendChild(hitPath);
        group.appendChild(path);
        
        // Click handler
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showArrowMenu(connection, e);
        });
        
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
    
    deletePlacedBlock(blockId) {
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
        if (this.dragSource === 'canvas') {
            e.dataTransfer.dropEffect = 'move';
            this.deleteZone.classList.add('drag-over');
        }
    }
    
    onDeleteZoneDragLeave(e) {
        this.deleteZone.classList.remove('drag-over');
    }
    
    onDeleteZoneDrop(e) {
        e.preventDefault();
        this.deleteZone.classList.remove('drag-over');
        
        const source = e.dataTransfer.getData('source');
        const blockId = e.dataTransfer.getData('blockId');
        
        if (source === 'canvas' && blockId) {
            this.deletePlacedBlock(blockId);
        }
        
        this.draggedBlock = null;
        this.dragSource = null;
    }
    
    clearCanvas() {
        if (this.placedBlocks.length === 0) return;
        
        if (!confirm('Clear all blocks and connections from canvas?')) return;
        
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
                <button class="project-delete" title="Delete project">×</button>
            `;
            
            // Click to load project
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('project-delete')) {
                    e.stopPropagation();
                    this.deleteProject(index);
                } else {
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
    
    // Escape key to cancel connection or close arrow menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (window.gridCanvas.connectingFrom) {
                window.gridCanvas.cancelConnection();
            }
            window.gridCanvas.hideArrowMenu();
        }
    });
});
