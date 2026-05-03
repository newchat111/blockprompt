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

        this.relationshipModal = document.getElementById('relationshipModal');
        this.relationshipInput = document.getElementById('relationshipInput');
        this.fromBlockNameEl = document.getElementById('fromBlockName');
        this.toBlockNameEl = document.getElementById('toBlockName');

        this.savedBlocks = this.loadSavedBlocks();
        this.placedBlocks = [];
        this.connections = [];
        this.blockIdCounter = 0;
        this.connectionIdCounter = 0;

        this.draggedBlock = null;
        this.dragSource = null;
        this.dragOffset = { x: 0, y: 0 };

        this.connectingFrom = null;
        this.tempArrow = null;
        this.gridSize = 40;

        this.projects = this.loadProjects();
        this.currentProjectId = null;

        this.zoom = new ZoomManager(this);
        this.selection = new SelectionManager(this);
        this.undo = new UndoManager(this);

        this.clipboard = null;
        this.clipboardOffset = { x: 20, y: 20 };
        this.pasteCount = 0;

        this.arrowInlineEditor = null;
        this.pendingConnection = null;

        this.init();
    }

    init() {
        document.getElementById('backBtn').addEventListener('click', () => window.location.href = 'index.html');
        document.getElementById('clearCanvasBtn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('copyOutputBtn').addEventListener('click', () => this.copyOutput());
        document.getElementById('cancelRelationship').addEventListener('click', () => this.cancelConnection());
        document.getElementById('confirmRelationship').addEventListener('click', () => this.confirmConnection());
        this.relationshipInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.confirmConnection(); });

        this.renderSidebar();
        this.renderProjects();

        document.getElementById('saveProjectBtn').addEventListener('click', () => this.saveCurrentProject());
        this.initMinimizeButtons();

        this.gridCanvas.addEventListener('dragover', (e) => this.onCanvasDragOver(e));
        this.gridCanvas.addEventListener('drop', (e) => this.onCanvasDrop(e));

        this.deleteZone.addEventListener('dragover', (e) => this.onDeleteZoneDragOver(e));
        this.deleteZone.addEventListener('dragleave', (e) => this.onDeleteZoneDragLeave(e));
        this.deleteZone.addEventListener('drop', (e) => this.onDeleteZoneDrop(e));

        this.gridCanvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        this.gridCanvas.addEventListener('click', (e) => this.onCanvasClick(e));

        this.zoom.bindControls();
        this.gridCanvas.addEventListener('wheel', (e) => this.zoom.onWheel(e), { passive: false });

        this.gridCanvas.addEventListener('mousedown', (e) => this.selection.onMouseDown(e));
        this.gridCanvas.addEventListener('mouseup', (e) => this.selection.onMouseUp(e));

        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        window.addEventListener('storage', (e) => {
            if (e.key === 'codeblocks_saved') {
                this.savedBlocks = this.loadSavedBlocks();
                this.renderSidebar();
            }
        });

        this.updateOutput();
        this.restoreMinimizedStates();
    }

    initMinimizeButtons() {
        const bind = (btnId, panelId, key) => {
            const btn = document.getElementById(btnId);
            const panel = document.getElementById(panelId);
            btn?.addEventListener('click', () => {
                panel.classList.toggle('minimized');
                this.saveMinimizedState(key, panel.classList.contains('minimized'));
            });
        };
        bind('minimizeProjectsBtn', 'projectsPanel', 'projects');
        bind('minimizeSavedBlocksBtn', 'savedBlocksPanel', 'savedBlocks');
        bind('minimizeOutputBtn', 'outputPanel', 'output');
    }

    // ---- Zoom delegation ----
    get zoomLevel() { return this.zoom.level; }
    set zoomLevel(v) { this.zoom.level = v; }
    get minZoom() { return this.zoom.min; }
    get maxZoom() { return this.zoom.max; }
    get zoomStep() { return this.zoom.step; }
    zoomIn() { this.zoom.zoomIn(); }
    zoomOut() { this.zoom.zoomOut(); }
    resetZoom() { this.zoom.reset(); }
    applyZoom() { this.zoom.apply(); }
    screenToCanvas(sx, sy) { return this.zoom.screenToCanvas(sx, sy); }
    canvasToScreen(cx, cy) { return this.zoom.canvasToScreen(cx, cy); }
    updateArrowLayerSize() { this.zoom.updateArrowLayerSize(); }

    // ---- Selection delegation ----
    get isSelecting() { return this.selection.isSelecting; }
    set isSelecting(v) { this.selection.isSelecting = v; }
    get selectedBlocks() { return this.selection.selectedBlocks; }
    get selectedConnections() { return this.selection.selectedConnections; }
    get isDraggingSelection() { return this.selection.isDraggingSelection; }
    set isDraggingSelection(v) { this.selection.isDraggingSelection = v; }
    selectBlock(id) { this.selection.selectBlock(id); }
    deselectBlock(id) { this.selection.deselectBlock(id); }
    toggleBlockSelection(id) { this.selection.toggleBlockSelection(id); }
    clearSelection() { this.selection.clear(); }
    selectConnection(id) { this.selection.selectConnection(id); }
    deselectConnection(id) { this.selection.deselectConnection(id); }
    toggleConnectionSelection(id) { this.selection.toggleConnectionSelection(id); }
    selectAll() { this.selection.selectAll(); }
    saveSelectionInitialPositions() { this.selection.saveInitialPositions(); }
    startMultiDrag(e, id) { this.selection.startMultiDrag(e, id); }

    // ---- Undo delegation ----
    pushUndoState() { this.undo.push(); }

    // ---- Sidebar ----
    renderSidebar() {
        this.sidebarContent.innerHTML = '';
        if (this.savedBlocks.length === 0) {
            this.sidebarContent.innerHTML = `<div class="canvas-sidebar-empty">No saved blocks<br><small>Save blocks from the main editor</small></div>`;
            this.blockCountEl.textContent = '0 blocks';
            return;
        }
        this.blockCountEl.textContent = `${this.savedBlocks.length} block${this.savedBlocks.length !== 1 ? 's' : ''}`;
        this.savedBlocks.forEach((sb, i) => this.sidebarContent.appendChild(this.createSidebarBlockElement(sb, i)));
    }

    createSidebarBlockElement(savedBlock, index) {
        const el = document.createElement('div');
        el.className = `sidebar-block-item block-${savedBlock.type}`;
        el.dataset.index = index;
        el.draggable = true;
        const displayName = Utils.displayName(savedBlock);
        el.innerHTML = `<span class="sidebar-block-type">${savedBlock.type}</span><span class="sidebar-block-name" title="${displayName}">${displayName}</span>`;
        el.addEventListener('dragstart', (e) => {
            this.draggedBlock = savedBlock;
            this.dragSource = 'sidebar';
            el.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('source', 'sidebar');
            e.dataTransfer.setData('blockIndex', index);
            e.dataTransfer.setData('savedBlock', JSON.stringify(savedBlock));
        });
        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            this.draggedBlock = null;
            this.dragSource = null;
        });
        el.addEventListener('click', () => this.placeBlockAtCenter(savedBlock));
        return el;
    }

    placeBlockAtCenter(savedBlock) {
        const rect = this.gridCanvas.getBoundingClientRect();
        const x = (this.gridCanvas.scrollLeft + rect.width / 2 - 100) / this.zoomLevel;
        const y = (this.gridCanvas.scrollTop + rect.height / 2 - 50) / this.zoomLevel;
        this.createPlacedBlock(savedBlock, x, y);
    }

    // ---- Canvas drop ----
    onCanvasDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = this.dragSource === 'sidebar' ? 'copy' : 'move';
    }

    onCanvasDrop(e) {
        e.preventDefault();
        const source = e.dataTransfer.getData('source');
        const pos = this.screenToCanvas(e.clientX, e.clientY);
        if (source === 'sidebar') {
            const data = e.dataTransfer.getData('savedBlock');
            if (data) this.createPlacedBlock(JSON.parse(data), pos.x - 100, pos.y - 30);
        } else if (source === 'canvas' && this.draggedBlock) {
            const blockId = this.draggedBlock.dataset.blockId;
            const placed = this.placedBlocks.find(b => b.id === blockId);
            if (placed) {
                placed.x = this.snapToGrid(pos.x - this.dragOffset.x / this.zoomLevel);
                placed.y = this.snapToGrid(pos.y - this.dragOffset.y / this.zoomLevel);
                this.draggedBlock.style.left = `${placed.x}px`;
                this.draggedBlock.style.top = `${placed.y}px`;
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

    // ---- Block creation ----
    createPlacedBlock(savedBlock, x, y, blockId = null) {
        this.gridCanvas.classList.add('has-blocks');
        const finalId = blockId || `placed-${this.blockIdCounter++}`;
        const sx = this.snapToGrid(x);
        const sy = this.snapToGrid(y);

        const el = document.createElement('div');
        el.className = `placed-block block-${savedBlock.type}`;
        el.dataset.blockId = finalId;
        el.style.left = `${sx}px`;
        el.style.top = `${sy}px`;

        const displayName = Utils.displayName(savedBlock);
        const fields = [];
        const d = savedBlock.data;
        if (d?.purpose) fields.push(`<div class="placed-block-field"><strong>Purpose:</strong> ${Utils.truncate(d.purpose, 30)}</div>`);
        if (d?.parameters) fields.push(`<div class="placed-block-field"><strong>Params:</strong> ${Utils.truncate(d.parameters, 25)}</div>`);
        if (d?.returns) fields.push(`<div class="placed-block-field"><strong>Returns:</strong> ${d.returns}</div>`);
        if (d?.varType) fields.push(`<div class="placed-block-field"><strong>Type:</strong> ${d.varType}</div>`);
        if (d?.value) fields.push(`<div class="placed-block-field"><strong>Value:</strong> ${Utils.truncate(d.value, 20)}</div>`);
        if (d?.module) fields.push(`<div class="placed-block-field"><strong>Module:</strong> ${d.module}</div>`);
        const contentHtml = fields.join('');

        el.innerHTML = `
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

        el.querySelector('.placed-block-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deletePlacedBlock(finalId);
        });
        el.querySelector('.placed-block-connect').addEventListener('click', (e) => {
            e.stopPropagation();
            this.startConnection(finalId);
        });

        el.draggable = true;
        el.addEventListener('dragstart', (e) => {
            if (this.connectingFrom) { e.preventDefault(); return; }
            if (this.selectedBlocks.size > 1 && this.selectedBlocks.has(finalId)) {
                e.preventDefault();
                this.startMultiDrag(e, finalId);
                return;
            }
            this.draggedBlock = el;
            this.dragSource = 'canvas';
            el.classList.add('dragging');
            const rect = el.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('source', 'canvas');
            e.dataTransfer.setData('blockId', finalId);
        });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));
        el.addEventListener('click', (e) => {
            if (this.connectingFrom && this.connectingFrom !== finalId) this.completeConnection(finalId);
        });

        this.canvasContent.appendChild(el);
        this.placedBlocks.push({ id: finalId, type: savedBlock.type, data: savedBlock.data, x: sx, y: sy, element: el });
        this.savePlacedBlocks();
        this.updateOutput();
        return el;
    }

    // ---- Connections ----
    startConnection(blockId) {
        if (this.connectingFrom) this.cancelConnection();
        this.clearSelection();
        this.connectingFrom = blockId;
        document.querySelector(`[data-block-id="${blockId}"]`)?.classList.add('connecting');
        this.canvasHint.textContent = 'Click another block to connect, or press Escape to cancel';
        this.canvasHint.classList.add('connecting');
        this.createTempArrow();
    }

    createTempArrow() {
        const from = this.placedBlocks.find(b => b.id === this.connectingFrom);
        if (!from) return;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('temp-arrow');
        this.arrowLayer.appendChild(path);
        this.tempArrow = path;
        this.updateTempArrow();
    }

    updateTempArrow() {
        if (!this.tempArrow || !this.connectingFrom) return;
        const from = this.placedBlocks.find(b => b.id === this.connectingFrom);
        if (!from) return;
        const w = from.element.offsetWidth, h = from.element.offsetHeight;
        const cx = from.x + w / 2, cy = from.y + h / 2;
        const mx = this.mouseX || cx + 100, my = this.mouseY || cy;
        const start = this.getEdgeIntersection(cx, cy, mx, my, from.x, from.y, w, h);
        this.tempArrow.setAttribute('d', `M ${start.x} ${start.y} L ${mx} ${my}`);
    }

    trackMouseForTempArrow(e) {
        if (!this.connectingFrom) return;
        const rect = this.gridCanvas.getBoundingClientRect();
        this.mouseX = (e.clientX - rect.left + this.gridCanvas.scrollLeft) / this.zoomLevel;
        this.mouseY = (e.clientY - rect.top + this.gridCanvas.scrollTop) / this.zoomLevel;
        this.updateTempArrow();
    }

    onCanvasMouseMove(e) {
        this.trackMouseForTempArrow(e);
    }

    onCanvasClick(e) {
        if (!e.target.closest('.arrow-menu')) this.hideArrowMenu();
        const isBlock = e.target.closest('.placed-block');
        const isConn = e.target.closest('.connection-group');
        const isMenu = e.target.closest('.arrow-menu');
        if (this.connectingFrom && !isBlock && !isConn && !isMenu) {
            this.cancelConnection();
            return;
        }
        if (e.target === this.gridCanvas || e.target.classList.contains('canvas-placeholder')) {
            this.cancelConnection();
        }
    }

    completeConnection(targetId) {
        if (!this.connectingFrom || this.connectingFrom === targetId) {
            this.cancelConnection();
            return;
        }
        if (this.connections.some(c => c.from === this.connectingFrom && c.to === targetId)) {
            alert('Connection already exists between these blocks!');
            this.cancelConnection();
            return;
        }
        this.hideArrowMenu();
        const from = this.placedBlocks.find(b => b.id === this.connectingFrom);
        const to = this.placedBlocks.find(b => b.id === targetId);
        if (from && to) {
            this.clearSelection();
            this.fromBlockNameEl.textContent = Utils.displayName(from);
            this.toBlockNameEl.textContent = Utils.displayName(to);
            this.relationshipInput.value = '';
            this.relationshipModal.classList.remove('hidden');
            this.relationshipInput.focus();
            this.pendingConnection = { from: this.connectingFrom, to: targetId };
        }
    }

    confirmConnection() {
        if (!this.pendingConnection) { this.cancelConnection(); return; }
        this.pushUndoState();
        const label = this.relationshipInput.value.trim() || 'connects to';
        this.createConnection(this.pendingConnection.from, this.pendingConnection.to, label);
        this.cancelConnection();
    }

    createConnection(fromId, toId, label) {
        const conn = {
            id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            from: fromId, to: toId, relationship: label
        };
        this.connections.push(conn);
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
        return conn;
    }

    cancelConnection() {
        this.relationshipModal.classList.add('hidden');
        this.cleanupConnection();
    }

    cleanupConnection() {
        if (this.connectingFrom) {
            document.querySelector(`[data-block-id="${this.connectingFrom}"]`)?.classList.remove('connecting');
        }
        this.tempArrow?.remove();
        this.tempArrow = null;
        this.connectingFrom = null;
        this.pendingConnection = null;
        this.canvasHint.textContent = 'Drag blocks from sidebar to place • Click block to connect';
        this.canvasHint.classList.remove('connecting');
    }

    // ---- Arrow rendering ----
    renderArrows() {
        this.hideArrowMenu();
        this.arrowLayer.querySelectorAll('.connection-group').forEach(g => g.remove());
        this.connections.forEach(c => this.renderConnection(c));
    }

    getEdgeIntersection(Ax, Ay, Bx, By, rx, ry, rw, rh) {
        const dx = Bx - Ax, dy = By - Ay;
        let t = Infinity;
        if (dx > 0) t = Math.min(t, (rx + rw - Ax) / dx);
        else if (dx < 0) t = Math.min(t, (rx - Ax) / dx);
        if (dy > 0) t = Math.min(t, (ry + rh - Ay) / dy);
        else if (dy < 0) t = Math.min(t, (ry - Ay) / dy);
        return { x: Ax + t * dx, y: Ay + t * dy };
    }

    renderConnection(connection) {
        const from = this.placedBlocks.find(b => b.id === connection.from);
        const to = this.placedBlocks.find(b => b.id === connection.to);
        if (!from || !to) return;

        const fw = from.element.offsetWidth, fh = from.element.offsetHeight;
        const tw = to.element.offsetWidth, th = to.element.offsetHeight;
        const fcx = from.x + fw / 2, fcy = from.y + fh / 2;
        const tcx = to.x + tw / 2, tcy = to.y + th / 2;

        const start = this.getEdgeIntersection(fcx, fcy, tcx, tcy, from.x, from.y, fw, fh);
        const end = this.getEdgeIntersection(tcx, tcy, fcx, fcy, to.x, to.y, tw, th);

        const pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('connection-group');
        group.dataset.connectionId = connection.id;
        group.style.cursor = 'pointer';

        const mkPath = (stroke, width, events) => {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', pathD);
            p.setAttribute('stroke', stroke);
            p.setAttribute('stroke-width', width);
            p.setAttribute('fill', 'none');
            if (!events) p.style.pointerEvents = 'none';
            else { p.style.pointerEvents = 'stroke'; p.style.cursor = 'pointer'; }
            return p;
        };

        group.appendChild(mkPath('transparent', '24', true));
        const visible = mkPath('#4a90d9', '2', false);
        visible.setAttribute('marker-end', 'url(#arrowhead)');
        group.appendChild(visible);

        group.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) this.toggleConnectionSelection(connection.id);
            else { this.clearSelection(); this.showArrowMenu(connection, e); }
        });

        if (this.selectedConnections.has(connection.id)) {
            group.classList.add('selected');
            visible.setAttribute('stroke', '#f59e0b');
            visible.setAttribute('stroke-width', '3');
        }

        this.arrowLayer.appendChild(group);
        if (connection.relationship) {
            this.renderArrowLabel((start.x + end.x) / 2, (start.y + end.y) / 2, connection.relationship, group);
        }
    }

    renderArrowLabel(x, y, text, parent) {
        const pad = 6, cw = 6;
        const w = text.length * cw + pad * 2, h = 18;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x - w / 2);
        rect.setAttribute('y', y - h / 2);
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('class', 'arrow-label-bg');
        rect.style.pointerEvents = 'none';
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y + 1);
        label.setAttribute('class', 'arrow-label');
        label.textContent = text;
        label.style.pointerEvents = 'none';
        parent.appendChild(rect);
        parent.appendChild(label);
    }

    // ---- Arrow menu ----
    showArrowMenu(connection, event) {
        this.hideArrowMenu();
        const menu = document.createElement('div');
        menu.className = 'arrow-menu';
        menu.id = 'arrowMenu';
        const from = this.placedBlocks.find(b => b.id === connection.from);
        const to = this.placedBlocks.find(b => b.id === connection.to);
        const fromName = Utils.displayName(from) || 'Unknown';
        const toName = Utils.displayName(to) || 'Unknown';
        menu.innerHTML = `<div class="arrow-menu-header">${fromName} → ${toName}</div><div class="arrow-menu-item" data-action="edit">✏️ Edit</div><div class="arrow-menu-item" data-action="delete">🗑️ Delete</div>`;
        const rect = this.gridCanvas.getBoundingClientRect();
        let x = event.clientX - rect.left + this.gridCanvas.scrollLeft;
        let y = event.clientY - rect.top + this.gridCanvas.scrollTop;
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.querySelectorAll('.arrow-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                if (action === 'edit') this.editConnection(connection);
                else if (action === 'delete') this.deleteConnection(connection.id, true);
                this.hideArrowMenu();
            });
        });
        this.gridCanvas.appendChild(menu);
        const mr = menu.getBoundingClientRect();
        if (mr.right > rect.right) menu.style.left = `${x - mr.width}px`;
        if (mr.bottom > rect.bottom) menu.style.top = `${y - mr.height}px`;
    }

    hideArrowMenu() {
        document.getElementById('arrowMenu')?.remove();
    }

    // ---- Inline editor ----
    editConnection(connection) {
        const from = this.placedBlocks.find(b => b.id === connection.from);
        const to = this.placedBlocks.find(b => b.id === connection.to);
        if (!from || !to) return;
        const fw = from.element.offsetWidth, fh = from.element.offsetHeight;
        const tw = to.element.offsetWidth, th = to.element.offsetHeight;
        const fcx = from.x + fw / 2, fcy = from.y + fh / 2;
        const tcx = to.x + tw / 2, tcy = to.y + th / 2;
        const start = this.getEdgeIntersection(fcx, fcy, tcx, tcy, from.x, from.y, fw, fh);
        const end = this.getEdgeIntersection(tcx, tcy, fcx, fcy, to.x, to.y, tw, th);
        const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2;
        this.hideInlineEditor();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'arrow-inline-editor';
        input.value = connection.relationship || '';
        input.placeholder = 'connects to';
        input.style.left = `${cx}px`;
        input.style.top = `${cy - 14}px`;
        const save = () => {
            connection.relationship = input.value.trim() || 'connects to';
            this.hideInlineEditor();
            this.saveConnections();
            this.renderArrows();
            this.updateOutput();
        };
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); save(); }
            else if (e.key === 'Escape') { e.preventDefault(); this.hideInlineEditor(); }
        });
        input.addEventListener('blur', () => { if (input.parentNode) save(); });
        this.canvasContent.appendChild(input);
        input.focus();
        input.select();
        this.arrowInlineEditor = input;
    }

    hideInlineEditor() {
        this.arrowInlineEditor?.remove();
        this.arrowInlineEditor = null;
    }

    // ---- Deletion ----
    deletePlacedBlock(blockId, saveUndo = true) {
        if (saveUndo) this.pushUndoState();
        this.connections = this.connections.filter(c => c.from !== blockId && c.to !== blockId);
        document.querySelector(`[data-block-id="${blockId}"]`)?.remove();
        this.placedBlocks = this.placedBlocks.filter(b => b.id !== blockId);
        if (this.placedBlocks.length === 0) this.gridCanvas.classList.remove('has-blocks');
        this.savePlacedBlocks();
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }

    deleteConnection(connectionId, showConfirm = false) {
        if (showConfirm && !confirm('Delete this connection?')) return;
        const idx = this.connections.findIndex(c => c.id === connectionId);
        if (idx === -1) return;
        this.connections.splice(idx, 1);
        this.selectedConnections.delete(connectionId);
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }

    onDeleteZoneDragOver(e) {
        e.preventDefault();
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
            this.deletePlacedBlock(blockId, false);
            this.showToast('Block deleted');
        } else if (source === 'canvas' && connectionId) {
            this.deleteConnection(connectionId);
            this.showToast('Connection deleted');
        } else if (this.selectedBlocks.size > 0 || this.selectedConnections.size > 0) {
            this.deleteSelected();
        }
        this.draggedBlock = null;
        this.dragSource = null;
    }

    clearCanvas() {
        if (this.placedBlocks.length === 0) return;
        if (!confirm('Clear all blocks and connections from canvas?')) return;
        this.pushUndoState();
        this.placedBlocks.forEach(b => document.querySelector(`[data-block-id="${b.id}"]`)?.remove());
        this.placedBlocks = [];
        this.connections = [];
        this.gridCanvas.classList.remove('has-blocks');
        this.savePlacedBlocks();
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }

    clearCanvasWithoutConfirm() {
        this.placedBlocks.forEach(b => document.querySelector(`[data-block-id="${b.id}"]`)?.remove());
        this.placedBlocks = [];
        this.connections = [];
        this.gridCanvas.classList.remove('has-blocks');
        this.savePlacedBlocks();
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }

    // ---- Copy / Paste ----
    onKeyDown(e) {
        if (e.key === 'Escape') {
            if (this.connectingFrom) this.cancelConnection();
            this.hideArrowMenu();
            this.clearSelection();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); this.copySelected(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); this.paste(); }
        if ((e.key === 'Delete' || e.key === 'Backspace') && (this.selectedBlocks.size > 0 || this.selectedConnections.size > 0)) {
            e.preventDefault(); this.deleteSelected();
        }
        if (e.key === 'Enter' && this.selectedConnections.size === 1) {
            e.preventDefault();
            const conn = this.connections.find(c => c.id === Array.from(this.selectedConnections)[0]);
            if (conn) this.editConnection(conn);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); this.selectAll(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); }
        if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
            e.preventDefault(); this.redo();
        }
    }

    copySelected() {
        const hasBlocks = this.selectedBlocks.size > 0;
        const hasConns = this.selectedConnections.size > 0;
        if (!hasBlocks && !hasConns) return;
        const blockIds = Array.from(this.selectedBlocks);
        const blocks = blockIds.map(id => {
            const b = this.placedBlocks.find(p => p.id === id);
            return b ? { id, type: b.type, data: Utils.deepClone(b.data), x: b.x, y: b.y } : null;
        }).filter(Boolean);
        const connMap = new Map();
        this.selectedConnections.forEach(id => {
            const c = this.connections.find(x => x.id === id);
            if (c) connMap.set(id, { from: c.from, to: c.to, relationship: c.relationship });
        });
        this.connections.forEach(c => {
            if (blockIds.includes(c.from) && blockIds.includes(c.to) && !connMap.has(c.id)) {
                connMap.set(c.id, { from: c.from, to: c.to, relationship: c.relationship });
            }
        });
        const conns = Array.from(connMap.values());
        this.clipboard = { blocks, connections: conns, bounds: this.getSelectionBounds(blocks) };
        this.pasteCount = 0;
        const bt = blocks.length ? `${blocks.length} block${blocks.length > 1 ? 's' : ''}` : '';
        const ct = conns.length ? `${conns.length} connection${conns.length > 1 ? 's' : ''}` : '';
        this.showToast(`Copied ${bt}${bt && ct ? ' and ' : ''}${ct}`);
    }

    paste() {
        if (!this.clipboard?.blocks.length) return;
        this.pushUndoState();
        this.pasteCount++;
        this.clearSelection();
        const rect = this.gridCanvas.getBoundingClientRect();
        const vcx = (this.gridCanvas.scrollLeft + rect.width / 2) / this.zoomLevel;
        const vcy = (this.gridCanvas.scrollTop + rect.height / 2) / this.zoomLevel;
        const ox = vcx - this.clipboard.bounds.centerX + (this.pasteCount * this.clipboardOffset.x);
        const oy = vcy - this.clipboard.bounds.centerY + (this.pasteCount * this.clipboardOffset.y);
        const idMap = new Map();
        const newIds = [];
        this.clipboard.blocks.forEach(b => {
            const nb = this.createPlacedBlock({ type: b.type, data: b.data }, this.snapToGrid(b.x + ox), this.snapToGrid(b.y + oy));
            if (nb) { idMap.set(b.id, nb.dataset.blockId); newIds.push(nb.dataset.blockId); }
        });
        let cc = 0;
        this.clipboard.connections?.forEach(c => {
            const nf = idMap.get(c.from), nt = idMap.get(c.to);
            if (nf && nt) { this.createConnection(nf, nt, c.relationship); cc++; }
        });
        newIds.forEach(id => this.selectBlock(id));
        const ct = cc ? ` and ${cc} connection${cc > 1 ? 's' : ''}` : '';
        this.showToast(`Pasted ${newIds.length} block${newIds.length > 1 ? 's' : ''}${ct}`);
    }

    getSelectionBounds(blocks) {
        if (!blocks.length) return { centerX: 0, centerY: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        blocks.forEach(b => {
            minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + 200); maxY = Math.max(maxY, b.y + 80);
        });
        return { minX, minY, maxX, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
    }

    deleteSelected() {
        const hb = this.selectedBlocks.size > 0, hc = this.selectedConnections.size > 0;
        if (!hb && !hc) return;
        this.pushUndoState();
        let dc = 0;
        this.selectedConnections.forEach(id => { this.deleteConnection(id); dc++; });
        this.selectedConnections.clear();
        let db = 0;
        this.selectedBlocks.forEach(id => { this.deletePlacedBlock(id, false); db++; });
        this.selectedBlocks.clear();
        const bt = db ? `${db} block${db > 1 ? 's' : ''}` : '';
        const ct = dc ? `${dc} connection${dc > 1 ? 's' : ''}` : '';
        this.showToast(`Deleted ${bt}${bt && ct ? ' and ' : ''}${ct}`);
    }

    // ---- Toast ----
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'canvas-toast';
        toast.textContent = message;
        toast.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:#fff;padding:10px 20px;border-radius:6px;border:1px solid #333;font-size:13px;z-index:3000;animation:toast-appear 0.2s ease;`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toast-disappear 0.2s ease';
            setTimeout(() => toast.remove(), 200);
        }, 2000);
    }

    // ---- Output ----
    updateOutput() {
        this.canvasOutput.textContent = JSON.stringify(this.generateSystemJSON(), null, 2);
    }

    generateSystemJSON() {
        if (!this.placedBlocks.length) return { message: "Add blocks to define your system" };
        const blocks = this.placedBlocks.map(b => ({
            type: b.type, name: Utils.displayName(b), ...this.filterRelevantData(b.data)
        }));
        const connections = this.connections.map(c => {
            const from = this.placedBlocks.find(b => b.id === c.from);
            const to = this.placedBlocks.find(b => b.id === c.to);
            return { from: Utils.displayName(from), to: Utils.displayName(to), relationship: c.relationship };
        });
        return {
            instruction: this.buildDescription(blocks, connections),
            blocks, relationships: connections,
            summary: { totalBlocks: blocks.length, totalRelationships: connections.length }
        };
    }

    filterRelevantData(data) {
        if (!data) return {};
        const out = {};
        if (data.purpose) out.purpose = data.purpose;
        if (data.parameters) out.parameters = data.parameters;
        if (data.returns) out.returns = data.returns;
        if (data.varType) out.type = data.varType;
        if (data.value) out.initialValue = data.value;
        if (data.module) out.module = data.module;
        if (data.items) out.imports = data.items;
        if (data.customType) out.customType = data.customType;
        return out;
    }

    buildDescription(blocks, connections) {
        let desc = "Generate code with the following structure:\n\n";
        blocks.forEach(b => { desc += this.describeBlock(b); });
        if (connections.length) {
            desc += '\nRelationships:\n';
            connections.forEach(c => { desc += `  - ${c.from} ${c.relationship} ${c.to}\n`; });
        }
        desc += '\nPlease implement clean, well-documented code following best practices.';
        return desc;
    }

    describeBlock(block) {
        switch (block.type) {
            case 'class': return `Class "${block.name}"${block.purpose ? ` - ${block.purpose}` : ''}\n`;
            case 'function': return `  Function "${block.name}"(${block.parameters || ''})${block.returns ? ` -> ${block.returns}` : ''}${block.purpose ? ` - ${block.purpose}` : ''}\n`;
            case 'variable': return `  Variable "${block.name}"${block.type ? `: ${block.type}` : ''}${block.initialValue ? ` = ${block.initialValue}` : ''}${block.purpose ? ` - ${block.purpose}` : ''}\n`;
            case 'import': return `Import "${block.name}"${block.imports ? ` { ${block.imports} }` : ''}${block.purpose ? ` - ${block.purpose}` : ''}\n`;
            case 'custom': return `${block.customType || 'Component'} "${block.name}"${block.purpose ? ` - ${block.purpose}` : ''}\n`;
            default: return `${block.type} "${block.name}"\n`;
        }
    }

    copyOutput() {
        Clipboard.copy(this.canvasOutput.textContent, document.getElementById('copyOutputBtn'));
    }

    // ---- Persistence ----
    savePlacedBlocks() {
        Storage.set('codeblocks_canvas_placed', this.placedBlocks.map(b => ({ id: b.id, type: b.type, data: b.data, x: b.x, y: b.y })));
    }

    saveConnections() {
        Storage.set('codeblocks_canvas_connections', this.connections);
    }

    loadPlacedBlocks() {
        const blocks = Storage.get('codeblocks_canvas_placed');
        if (!blocks) return;
        this.blockIdMapping = {};
        blocks.forEach(b => {
            const nb = this.createPlacedBlock({ type: b.type, data: b.data }, b.x, b.y);
            this.blockIdMapping[b.id] = nb.dataset.blockId;
        });
    }

    loadConnections() {
        const loaded = Storage.get('codeblocks_canvas_connections');
        if (!loaded) return;
        if (this.blockIdMapping) {
            this.connections = loaded.map(c => ({ ...c, from: this.blockIdMapping[c.from] || c.from, to: this.blockIdMapping[c.to] || c.to }));
            this.blockIdMapping = null;
        } else {
            this.connections = loaded;
        }
        this.connectionIdCounter = this.connections.length;
        this.renderArrows();
        this.updateOutput();
    }

    saveMinimizedState(panel, isMinimized) {
        const states = Storage.get('codeblocks_panel_states', {});
        states[panel] = isMinimized;
        Storage.set('codeblocks_panel_states', states);
    }

    restoreMinimizedStates() {
        const states = Storage.get('codeblocks_panel_states', {});
        if (states.projects) document.getElementById('projectsPanel')?.classList.add('minimized');
        if (states.savedBlocks) document.getElementById('savedBlocksPanel')?.classList.add('minimized');
        if (states.output) document.getElementById('outputPanel')?.classList.add('minimized');
    }

    loadSavedBlocks() {
        return Storage.get('codeblocks_saved', []);
    }

    // ---- Projects ----
    loadProjects() {
        return Storage.get('codeblocks_canvas_projects', []);
    }

    saveProjects() {
        Storage.set('codeblocks_canvas_projects', this.projects);
    }

    renderProjects() {
        const container = document.getElementById('canvasProjectsContent');
        if (!container) return;
        container.innerHTML = '';
        if (!this.projects.length) {
            container.innerHTML = `<div class="canvas-projects-empty">No saved projects<br><small>Save your canvas layout here</small></div>`;
            return;
        }
        this.projects.forEach((project, index) => {
            const el = document.createElement('div');
            el.className = `project-item ${project.id === this.currentProjectId ? 'active' : ''}`;
            el.dataset.index = index;
            const date = new Date(project.savedAt).toLocaleDateString();
            const bc = project.blocks?.length || 0;
            const cc = project.connections?.length || 0;
            el.innerHTML = `
                <div class="project-name">${project.name}</div>
                <div class="project-meta"><span>${bc} blocks, ${cc} connections</span><span>${date}</span></div>
                <div class="project-actions">
                    <button class="project-rename" title="Rename project">✏️</button>
                    <button class="project-edit" title="Edit project">💾</button>
                    <button class="project-delete" title="Delete project">🗑️</button>
                </div>
            `;
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('project-delete')) { e.stopPropagation(); this.deleteProject(index); }
                else if (e.target.classList.contains('project-rename')) { e.stopPropagation(); this.renameProject(index); }
                else if (e.target.classList.contains('project-edit')) { e.stopPropagation(); this.editProject(index); }
                else {
                    if (this.placedBlocks.length > 0) {
                        const confirmed = confirm(`Loading "${project.name}" will replace the current canvas content.\n\nYou have ${this.placedBlocks.length} block(s) on the canvas that will be cleared.\n\nDo you want to continue?`);
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
        if (!name?.trim()) return;
        const project = {
            id: 'proj-' + Date.now(), name: name.trim(),
            blocks: this.placedBlocks.map(b => ({ id: b.id, type: b.type, data: Utils.deepClone(b.data), x: b.x, y: b.y })),
            connections: Utils.deepClone(this.connections),
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
        this.clearCanvasWithoutConfirm();
        const idMap = new Map();
        project.blocks.forEach(b => {
            const nb = this.createPlacedBlock({ type: b.type, data: Utils.deepClone(b.data) }, b.x, b.y, b.id);
            if (nb) idMap.set(b.id, nb.dataset.blockId);
        });
        this.connections = (project.connections || []).map(c => ({
            ...c, from: idMap.get(c.from) || c.from, to: idMap.get(c.to) || c.to
        })).filter(c => this.placedBlocks.some(b => b.id === c.from) && this.placedBlocks.some(b => b.id === c.to));
        this.saveConnections();
        this.renderArrows();
        this.currentProjectId = project.id;
        this.renderProjects();
        this.updateOutput();
    }

    deleteProject(index) {
        if (!confirm('Delete this project?')) return;
        if (this.projects[index].id === this.currentProjectId) this.currentProjectId = null;
        this.projects.splice(index, 1);
        this.saveProjects();
        this.renderProjects();
        this.showToast('Project deleted');
    }

    renameProject(index) {
        const project = this.projects[index];
        if (!project) return;
        const newName = prompt('Enter new project name:', project.name);
        if (!newName?.trim()) return;
        project.name = newName.trim();
        project.savedAt = new Date().toISOString();
        this.saveProjects();
        this.renderProjects();
        this.showToast('Project renamed');
    }

    editProject(index) {
        const project = this.projects[index];
        if (!project) return;
        const confirmed = confirm(`Update "${project.name}" with the current canvas content?\n\nThis will replace the project's saved blocks and connections.\n\nAre you sure?`);
        if (!confirmed) return;
        project.blocks = this.placedBlocks.map(b => ({ id: b.id, type: b.type, data: Utils.deepClone(b.data), x: b.x, y: b.y }));
        project.connections = Utils.deepClone(this.connections);
        project.savedAt = new Date().toISOString();
        this.currentProjectId = project.id;
        this.saveProjects();
        this.renderProjects();
        this.showToast('Project updated');
    }

    clearCanvasWithoutConfirm() {
        this.placedBlocks.forEach(b => document.querySelector(`[data-block-id="${b.id}"]`)?.remove());
        this.placedBlocks = [];
        this.connections = [];
        this.gridCanvas.classList.remove('has-blocks');
        this.savePlacedBlocks();
        this.saveConnections();
        this.renderArrows();
        this.updateOutput();
    }
}

// ========== Manager Classes ==========

class ZoomManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.level = 1;
        this.min = 0.25;
        this.max = 3;
        this.step = 0.25;
    }

    bindControls() {
        document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomResetBtn')?.addEventListener('click', () => this.reset());
    }

    zoomIn() {
        if (this.level < this.max) { this.level = Math.min(this.max, this.level + this.step); this.apply(); }
    }

    zoomOut() {
        if (this.level > this.min) { this.level = Math.max(this.min, this.level - this.step); this.apply(); }
    }

    reset() { this.level = 1; this.apply(); }

    apply() {
        const el = document.getElementById('zoomLevel');
        if (el) el.textContent = Math.round(this.level * 100) + '%';
        if (this.canvas.canvasContent) {
            this.canvas.canvasContent.style.transform = `scale(${this.level})`;
            this.canvas.canvasContent.style.transformOrigin = '0 0';
        }
        this.updateArrowLayerSize();
        this.canvas.renderArrows();
    }

    updateArrowLayerSize() {
        this.canvas.arrowLayer.style.width = '3000px';
        this.canvas.arrowLayer.style.height = '2000px';
    }

    onWheel(e) {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        let nz = this.level * (1 + e.deltaY * 0.005);
        nz = Math.max(this.min, Math.min(this.max, nz));
        this.level = nz;
        this.apply();
    }

    screenToCanvas(sx, sy) {
        const r = this.canvas.gridCanvas.getBoundingClientRect();
        return {
            x: (sx - r.left + this.canvas.gridCanvas.scrollLeft) / this.level,
            y: (sy - r.top + this.canvas.gridCanvas.scrollTop) / this.level
        };
    }

    canvasToScreen(cx, cy) {
        const r = this.canvas.gridCanvas.getBoundingClientRect();
        return {
            x: cx * this.level + r.left - this.canvas.gridCanvas.scrollLeft,
            y: cy * this.level + r.top - this.canvas.gridCanvas.scrollTop
        };
    }
}

class SelectionManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isSelecting = false;
        this.selectStart = { x: 0, y: 0 };
        this.selectedBlocks = new Set();
        this.selectedConnections = new Set();
        this.isDraggingSelection = false;
        this.selectionDragStart = { x: 0, y: 0 };
        this.selectionInitialPositions = new Map();
    }

    onMouseDown(e) {
        const blockEl = e.target.closest('.placed-block');
        if (blockEl) {
            const blockId = blockEl.dataset.blockId;
            if (!e.ctrlKey && !e.metaKey && !this.selectedBlocks.has(blockId)) this.clear();
            if (e.ctrlKey || e.metaKey) this.toggleBlockSelection(blockId);
            else this.selectBlock(blockId);
            if (this.selectedBlocks.size > 0) {
                this.isDraggingSelection = true;
                this.selectionDragStart = { x: e.clientX, y: e.clientY };
                this.saveInitialPositions();
            }
            return;
        }
        const isCanvas = e.target === this.canvas.gridCanvas || e.target === this.canvas.canvasContent ||
                         e.target === this.canvas.arrowLayer || e.target.classList.contains('canvas-placeholder') ||
                         e.target.closest('.canvas-placeholder');
        if (!isCanvas) return;
        if (e.button === 0) {
            this.isSelecting = true;
            this.selectStart = this.canvas.screenToCanvas(e.clientX, e.clientY);
            if (!e.ctrlKey && !e.metaKey) this.clear();
            this.updateBox(this.selectStart.x, this.selectStart.y);
            this.canvas.selectionBox.classList.remove('hidden');
        }
    }

    onMouseUp(e) {
        if (this.isSelecting) { this.isSelecting = false; this.canvas.selectionBox.classList.add('hidden'); }
        if (this.isDraggingSelection) {
            this.isDraggingSelection = false;
            this.canvas.savePlacedBlocks();
            this.canvas.updateOutput();
        }
    }

    updateBox(cx, cy) {
        const left = Math.min(this.selectStart.x, cx);
        const top = Math.min(this.selectStart.y, cy);
        const w = Math.abs(cx - this.selectStart.x);
        const h = Math.abs(cy - this.selectStart.y);
        this.canvas.selectionBox.style.left = `${left * this.canvas.zoomLevel}px`;
        this.canvas.selectionBox.style.top = `${top * this.canvas.zoomLevel}px`;
        this.canvas.selectionBox.style.width = `${w * this.canvas.zoomLevel}px`;
        this.canvas.selectionBox.style.height = `${h * this.canvas.zoomLevel}px`;
    }

    updateFromBox() {
        const box = {
            left: Math.min(this.selectStart.x, parseFloat(this.canvas.selectionBox.style.left) / this.canvas.zoomLevel),
            top: Math.min(this.selectStart.y, parseFloat(this.canvas.selectionBox.style.top) / this.canvas.zoomLevel),
            right: Math.max(this.selectStart.x, (parseFloat(this.canvas.selectionBox.style.left) + parseFloat(this.canvas.selectionBox.style.width)) / this.canvas.zoomLevel),
            bottom: Math.max(this.selectStart.y, (parseFloat(this.canvas.selectionBox.style.top) + parseFloat(this.canvas.selectionBox.style.height)) / this.canvas.zoomLevel)
        };
        this.canvas.placedBlocks.forEach(b => {
            if (!(b.x > box.right || b.x + 200 < box.left || b.y > box.bottom || b.y + 80 < box.top)) {
                this.selectBlock(b.id);
            }
        });
    }

    selectBlock(id) {
        this.selectedBlocks.add(id);
        document.querySelector(`[data-block-id="${id}"]`)?.classList.add('selected');
    }

    deselectBlock(id) {
        this.selectedBlocks.delete(id);
        document.querySelector(`[data-block-id="${id}"]`)?.classList.remove('selected');
    }

    toggleBlockSelection(id) {
        this.selectedBlocks.has(id) ? this.deselectBlock(id) : this.selectBlock(id);
    }

    clear() {
        this.selectedBlocks.forEach(id => document.querySelector(`[data-block-id="${id}"]`)?.classList.remove('selected'));
        this.selectedBlocks.clear();
        this.selectedConnections.clear();
        this.canvas.renderArrows();
    }

    selectConnection(id) { this.selectedConnections.add(id); this.canvas.renderArrows(); }
    deselectConnection(id) { this.selectedConnections.delete(id); this.canvas.renderArrows(); }
    toggleConnectionSelection(id) { this.selectedConnections.has(id) ? this.deselectConnection(id) : this.selectConnection(id); }

    saveInitialPositions() {
        this.selectionInitialPositions.clear();
        this.selectedBlocks.forEach(id => {
            const b = this.canvas.placedBlocks.find(p => p.id === id);
            if (b) this.selectionInitialPositions.set(id, { x: b.x, y: b.y });
        });
    }

    selectAll() { this.canvas.placedBlocks.forEach(b => this.selectBlock(b.id)); }

    startMultiDrag(e, draggedBlockId) {
        this.isDraggingSelection = true;
        this.selectionDragStart = { x: e.clientX, y: e.clientY };
        this.saveInitialPositions();
        this.selectedBlocks.forEach(id => document.querySelector(`[data-block-id="${id}"]`)?.classList.add('dragging'));

        const onMove = (moveEvent) => {
            if (!this.isDraggingSelection) return;
            const dx = (moveEvent.clientX - this.selectionDragStart.x) / this.canvas.zoomLevel;
            const dy = (moveEvent.clientY - this.selectionDragStart.y) / this.canvas.zoomLevel;
            const dzr = this.canvas.deleteZone.getBoundingClientRect();
            const over = moveEvent.clientY >= dzr.top && moveEvent.clientX >= dzr.left && moveEvent.clientX <= dzr.right;
            this.canvas.deleteZone.classList.toggle('drag-over', over);
            document.body.classList.toggle('delete-zone-active', over);
            this.selectedBlocks.forEach(id => {
                const b = this.canvas.placedBlocks.find(p => p.id === id);
                const ip = this.selectionInitialPositions.get(id);
                if (b && ip) {
                    b.x = ip.x + dx; b.y = ip.y + dy;
                    b.element.style.left = `${b.x}px`;
                    b.element.style.top = `${b.y}px`;
                }
            });
            this.canvas.renderArrows();
        };

        const onUp = (upEvent) => {
            if (!this.isDraggingSelection) return;
            const dzr = this.canvas.deleteZone.getBoundingClientRect();
            if (upEvent.clientY >= dzr.top) {
                this.canvas.deleteSelected();
            } else {
                this.selectedBlocks.forEach(id => {
                    const b = this.canvas.placedBlocks.find(p => p.id === id);
                    if (b) { b.x = this.canvas.snapToGrid(b.x); b.y = this.canvas.snapToGrid(b.y); b.element.style.left = `${b.x}px`; b.element.style.top = `${b.y}px`; }
                });
                this.canvas.savePlacedBlocks();
                this.canvas.updateOutput();
            }
            this.selectedBlocks.forEach(id => document.querySelector(`[data-block-id="${id}"]`)?.classList.remove('dragging'));
            this.isDraggingSelection = false;
            this.canvas.deleteZone.classList.remove('drag-over');
            document.body.classList.remove('delete-zone-active');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }
}

class UndoManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = 50;
    }

    getState() {
        return {
            blocks: this.canvas.placedBlocks.map(b => ({
                id: b.id, type: b.type, data: Utils.deepClone(b.data), x: b.x, y: b.y
            })),
            connections: Utils.deepClone(this.canvas.connections),
            blockIdCounter: this.canvas.blockIdCounter,
            connectionIdCounter: this.canvas.connectionIdCounter
        };
    }

    push() {
        this.undoStack.push(this.getState());
        if (this.undoStack.length > this.maxSize) this.undoStack.shift();
        this.redoStack = [];
    }

    undo() {
        if (!this.undoStack.length) { this.canvas.showToast('Nothing to undo'); return; }
        this.redoStack.push(this.getState());
        this.canvas.restoreState(this.undoStack.pop());
        this.canvas.showToast('Undo');
    }

    redo() {
        if (!this.redoStack.length) { this.canvas.showToast('Nothing to redo'); return; }
        this.undoStack.push(this.getState());
        this.canvas.restoreState(this.redoStack.pop());
        this.canvas.showToast('Redo');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.gridCanvas = new GridCanvas();
    window.gridCanvas.loadPlacedBlocks();
    window.gridCanvas.loadConnections();
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (window.gridCanvas.connectingFrom) window.gridCanvas.cancelConnection();
            window.gridCanvas.hideArrowMenu();
            window.gridCanvas.clearSelection();
        }
    });
});
