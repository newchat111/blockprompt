// CodeBlocks - Nested block-based code structure generator

class CodeBlocks {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.output = document.getElementById('output');
        this.sidebarContent = document.getElementById('sidebarContent');
        this.mainSidebar = document.querySelector('.sidebar');
        this.blocks = [];
        this.blockIdCounter = 0;
        this.draggedBlock = null;
        this.dragSource = null;
        this.sidebarDraggedIndex = null;
        this.savedBlocks = this.loadSavedBlocks();

        this.init();
    }

    init() {
        // Toolbar buttons
        document.querySelectorAll('.toolbar [data-type]').forEach(btn => {
            btn.addEventListener('click', () => this.addBlock(btn.dataset.type));
        });

        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());

        // Copy button
        document.getElementById('copyBtn').addEventListener('click', () => this.copyOutput());

        // Clear sidebar button
        document.getElementById('clearSidebarBtn').addEventListener('click', () => this.clearSidebar());

        // Canvas mode button - navigate to grid canvas page
        document.getElementById('canvasModeBtn').addEventListener('click', () => {
            window.location.href = 'canvas.html';
        });

        // Canvas drop zone (for reordering and nesting)
        this.canvas.addEventListener('dragover', (e) => this.onCanvasDragOver(e));
        this.canvas.addEventListener('drop', (e) => this.onCanvasDrop(e));

        // Sidebar drop zone - bind to both sidebar and sidebarContent for reliability
        const sidebar = document.querySelector('.sidebar');
        const sidebarContent = document.getElementById('sidebarContent');
        
        [sidebar, sidebarContent].forEach(el => {
            el.addEventListener('dragenter', (e) => this.onSidebarDragEnter(e));
            el.addEventListener('dragover', (e) => this.onSidebarDragOver(e));
            el.addEventListener('dragleave', (e) => this.onSidebarDragLeave(e));
            el.addEventListener('drop', (e) => this.onSidebarDrop(e));
        });

        // Load saved blocks
        this.renderSavedBlocks();

        // Initial output
        this.updateOutput();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onKeyDown(e) {
        // Ctrl/Cmd + D to duplicate selected block
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            const focusedBlock = document.activeElement?.closest('.block');
            if (focusedBlock) {
                this.duplicateBlock(focusedBlock.dataset.id);
            }
        }
    }

    duplicateBlock(blockId) {
        const block = document.querySelector(`[data-id="${blockId}"]`);
        if (!block) return;

        // Collect block data
        const blockData = this.collectBlockData(block);
        
        // Create new block with same data
        const newBlockId = `block-${this.blockIdCounter++}`;
        const newBlock = this.createBlockFromSaved(
            { type: blockData.type, data: blockData },
            newBlockId
        );

        // Insert after original block if on canvas, or in same container if nested
        if (block.parentElement === this.canvas) {
            block.after(newBlock);
        } else {
            block.parentElement.appendChild(newBlock);
        }

        this.updateOutput();
        
        // Flash the new block
        newBlock.style.animation = 'highlight-block 0.5s ease';
        setTimeout(() => {
            newBlock.style.animation = '';
        }, 500);
    }

    addBlock(type, parentId = null) {
        // Remove hint if present
        const hint = this.canvas.querySelector('.canvas-hint');
        if (hint) hint.remove();

        const blockId = `block-${this.blockIdCounter++}`;
        const block = this.createBlockElement(type, blockId);

        if (parentId) {
            // Add to parent container
            const parent = document.querySelector(`[data-id="${parentId}"]`);
            const container = parent.querySelector('.nested-container');
            if (container) {
                container.appendChild(block);
            }
        } else {
            // Add to canvas
            this.canvas.appendChild(block);
        }

        this.updateOutput();
    }

    createBlockElement(type, id) {
        const block = document.createElement('div');
        block.className = `block block-${type}`;
        block.dataset.id = id;
        block.dataset.type = type;
        block.draggable = true;

        const fields = this.getBlockFields(type);
        const canNest = this.canHaveNested(type);
        const nestedContainer = canNest
            ? `<div class="nested-container" data-nested="true"></div>` 
            : '';
        
        // Collapse button for ALL blocks
        const collapseBtn = `<button class="block-collapse" title="Collapse/Expand" onclick="app.toggleCollapse('${id}')">▼</button>`;

        block.innerHTML = `
            <div class="block-header">
                ${collapseBtn}
                <span class="block-type">${type}</span>
                <div class="block-actions">
                    <button class="block-save" title="Save to sidebar" onclick="app.saveBlockToSidebarById('${id}')">💾</button>
                    <button class="block-delete" title="Delete" onclick="app.deleteBlock('${id}')">×</button>
                </div>
            </div>
            <div class="block-warning" style="display: none;"></div>
            <div class="block-content">
                <div class="block-fields">
                    ${fields}
                </div>
                ${nestedContainer}
            </div>
        `;

        // Add drag events
        block.addEventListener('dragstart', (e) => this.onDragStart(e, block));
        block.addEventListener('dragend', (e) => this.onDragEnd(e, block));

        // Add nested container drop events
        const nested = block.querySelector('.nested-container');
        if (nested) {
            nested.addEventListener('dragover', (e) => this.onNestedDragOver(e, nested, type));
            nested.addEventListener('dragleave', (e) => this.onNestedDragLeave(e, nested));
            nested.addEventListener('drop', (e) => this.onNestedDrop(e, nested, id));
        }

        // Add input listeners with duplicate name checking
        block.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => {
                this.updateBlockDisplay(block);
                this.updateOutput();
                // Check for duplicate names if this is the name field
                if (input.dataset.field === 'name') {
                    this.checkDuplicateName(block, input.value);
                }
            });
        });

        return block;
    }

    toggleCollapse(blockId) {
        const block = document.querySelector(`[data-id="${blockId}"]`);
        if (!block) return;
        
        block.classList.toggle('collapsed');
        const btn = block.querySelector('.block-collapse');
        if (btn) {
            btn.textContent = block.classList.contains('collapsed') ? '▶' : '▼';
        }
    }

    canHaveNested(type) {
        return type === 'class' || type === 'function' || type === 'custom' || type === 'import';
    }

    getBlockFields(type) {
        const fields = {
            class: `
                <div class="field">
                    <label>Class Name</label>
                    <input type="text" data-field="name" placeholder="e.g., UserManager">
                </div>
                <div class="field">
                    <label>Purpose</label>
                    <textarea data-field="purpose" placeholder="What does this class do?"></textarea>
                </div>
            `,
            function: `
                <div class="field">
                    <label>Function Name</label>
                    <input type="text" data-field="name" placeholder="e.g., calculateTotal">
                </div>
                <div class="field">
                    <label>Purpose</label>
                    <textarea data-field="purpose" placeholder="What does this function do?"></textarea>
                </div>
                <div class="field">
                    <label>Parameters (optional)</label>
                    <input type="text" data-field="parameters" placeholder="e.g., price: number, quantity: number">
                </div>
                <div class="field">
                    <label>Returns (optional)</label>
                    <input type="text" data-field="returns" placeholder="e.g., total: number">
                </div>
            `,
            variable: `
                <div class="field">
                    <label>Variable Name</label>
                    <input type="text" data-field="name" placeholder="e.g., maxRetries">
                </div>
                <div class="field">
                    <label>Type (optional)</label>
                    <input type="text" data-field="varType" placeholder="e.g., number, string, boolean">
                </div>
                <div class="field">
                    <label>Initial Value (optional)</label>
                    <input type="text" data-field="value" placeholder="e.g., 5, 'hello', true">
                </div>
                <div class="field">
                    <label>Purpose (optional)</label>
                    <textarea data-field="purpose" placeholder="What is this variable used for?"></textarea>
                </div>
            `,
            custom: `
                <div class="field">
                    <label>Block Type</label>
                    <input type="text" data-field="customType" placeholder="e.g., Component, Service, Hook">
                </div>
                <div class="field">
                    <label>Name</label>
                    <input type="text" data-field="name" placeholder="e.g., UserProfile, AuthService">
                </div>
                <div class="field">
                    <label>Purpose</label>
                    <textarea data-field="purpose" placeholder="What does this block do?"></textarea>
                </div>
            `,
            import: `
                <div class="field">
                    <label>Module Name</label>
                    <input type="text" data-field="module" placeholder="e.g., axios, react, lodash">
                </div>
                <div class="field">
                    <label>Import Items (optional)</label>
                    <input type="text" data-field="items" placeholder="e.g., useState, useEffect">
                </div>
                <div class="field">
                    <label>Purpose</label>
                    <textarea data-field="purpose" placeholder="Why is this module needed?"></textarea>
                </div>
            `
        };

        return fields[type] || '';
    }

    updateBlockDisplay(block) {
        const nameInput = block.querySelector('[data-field="name"]');
        const customTypeInput = block.querySelector('[data-field="customType"]');
        const typeDisplay = block.querySelector('.block-type');
        const display = block.querySelector('[data-display="name"]');
        
        // Update name display
        if (nameInput && display) {
            display.textContent = nameInput.value || block.dataset.type;
        }
        
        // For custom blocks, update the type display when customType changes
        if (block.dataset.type === 'custom' && customTypeInput && typeDisplay) {
            const customType = customTypeInput.value.trim();
            if (customType) {
                typeDisplay.textContent = customType;
            }
        }
    }

    // Drag & Drop
    onDragStart(e, block) {
        this.draggedBlock = block;
        this.dragSource = 'canvas';
        block.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('blockId', block.dataset.id);
        e.dataTransfer.setData('source', 'canvas');
    }

    onDragEnd(e, block) {
        block.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        // Delay clearing drag state to allow drop handlers to run first
        // Use a longer delay to ensure drop handler runs before clearing
        setTimeout(() => {
            this.draggedBlock = null;
            this.dragSource = null;
        }, 200);
    }
    
    // Check for duplicate names and show warning
    checkDuplicateName(block, name) {
        const warningEl = block.querySelector('.block-warning');
        if (!warningEl) return;
        
        if (!name || !name.trim()) {
            warningEl.style.display = 'none';
            warningEl.textContent = '';
            return;
        }
        
        // Check against saved blocks
        const duplicate = this.savedBlocks.find(sb => sb.data.name === name.trim());
        
        // Also check against other blocks on canvas
        const otherBlocks = Array.from(this.canvas.querySelectorAll('.block')).filter(b => b !== block);
        const canvasDuplicate = otherBlocks.find(b => {
            const nameInput = b.querySelector('[data-field="name"]');
            return nameInput && nameInput.value.trim() === name.trim();
        });
        
        if (duplicate || canvasDuplicate) {
            warningEl.textContent = `⚠️ A block named "${name.trim()}" already exists`;
            warningEl.style.display = 'block';
        } else {
            warningEl.style.display = 'none';
            warningEl.textContent = '';
        }
    }

    onCanvasDragOver(e) {
        e.preventDefault();
    }

    onCanvasDrop(e) {
        e.preventDefault();
        const savedBlockData = e.dataTransfer.getData('savedBlock');
        const source = e.dataTransfer.getData('source');
        
        // For sidebar drops, use dataTransfer since it contains the serialized block data
        if (this.dragSource === 'sidebar' && savedBlockData) {
            // Restore from sidebar (copy)
            const savedBlock = JSON.parse(savedBlockData);
            this.restoreSavedBlock(savedBlock);
        } else if (source === 'canvas-sidebar' && savedBlockData) {
            // Restore from canvas sidebar (copy)
            const savedBlock = JSON.parse(savedBlockData);
            this.restoreSavedBlock(savedBlock);
        } else if (this.dragSource === 'canvas' && this.draggedBlock) {
            // Move to canvas (top level)
            this.canvas.appendChild(this.draggedBlock);
            this.updateOutput();
        }
    }

    onNestedDragOver(e, container, parentType) {
        e.preventDefault();
        e.stopPropagation();

        const draggedType = this.draggedBlock && this.draggedBlock.dataset.type;
        if (!draggedType) return;

        // Check if can nest
        let canNest = false;
        
        if (parentType === 'custom') {
            // Custom blocks can have ANY block as children
            canNest = true;
        } else if (parentType === 'class' && (draggedType === 'function' || draggedType === 'variable')) {
            canNest = true;
        } else if (parentType === 'function' && draggedType === 'variable') {
            canNest = true;
        }

        if (canNest) {
            container.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'move';
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }

    onNestedDragLeave(e, container) {
        container.classList.remove('drag-over');
    }

    onNestedDrop(e, container, parentId) {
        e.preventDefault();
        e.stopPropagation();
        container.classList.remove('drag-over');

        const blockId = e.dataTransfer.getData('blockId');
        const block = document.querySelector(`[data-id="${blockId}"]`);
        const source = e.dataTransfer.getData('source');

        // Only allow canvas-to-canvas drops for nesting
        if (source !== 'canvas') return;

        if (block && this.draggedBlock) {
            // Check if trying to drop into itself or its children
            if (this.isDescendant(block, container)) return;

            container.appendChild(block);
            this.updateOutput();
        }
    }

    isDescendant(parent, child) {
        let node = child.parentNode;
        while (node) {
            if (node === parent) return true;
            node = node.parentNode;
        }
        return false;
    }

    // Sidebar functionality
    loadSavedBlocks() {
        return Storage.get('codeblocks_saved', []);
    }

    saveSavedBlocks() {
        Storage.set('codeblocks_saved', this.savedBlocks);
    }

    renderSavedBlocks() {
        // Clear current content except hint if empty
        this.sidebarContent.innerHTML = '';

        if (this.savedBlocks.length === 0) {
            this.sidebarContent.innerHTML = `
                <div class="sidebar-hint">
                    Click 💾 to save blocks<br>
                    <small>Click block to restore</small>
                </div>
            `;
            return;
        }

        this.savedBlocks.forEach((savedBlock, index) => {
            const el = this.createSavedBlockElement(savedBlock, index);
            this.sidebarContent.appendChild(el);
        });
    }

    createSavedBlockElement(savedBlock, index) {
        const el = document.createElement('div');
        el.className = `saved-block block-${savedBlock.type}`;
        el.dataset.index = index;
        el.draggable = true;

        const displayName = Utils.displayName(savedBlock);

        el.innerHTML = `
            <div class="saved-block-header">
                <span class="saved-block-type">${savedBlock.type}</span>
                <div class="saved-block-actions">
                    <button class="saved-block-edit" title="Edit block">✏️</button>
                    <button class="saved-block-place" title="Place on canvas">➕</button>
                    <button class="saved-block-delete" title="Remove from sidebar">×</button>
                </div>
            </div>
            <div class="saved-block-name">${displayName}</div>
        `;

        // Button click handlers
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('saved-block-delete')) {
                e.stopPropagation();
                this.removeSavedBlock(index);
            } else if (e.target.classList.contains('saved-block-edit')) {
                e.stopPropagation();
                this.editSavedBlock(savedBlock, index);
            } else if (e.target.classList.contains('saved-block-place')) {
                e.stopPropagation();
                this.restoreSavedBlock(savedBlock);
            }
        });

        // Drag events for reordering
        el.addEventListener('dragstart', (e) => {
            el.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('sidebarIndex', index);
            e.dataTransfer.setData('source', 'sidebar-reorder');
            this.sidebarDraggedIndex = index;
        });

        el.addEventListener('dragend', (e) => {
            el.classList.remove('dragging');
            document.querySelectorAll('.saved-block').forEach(b => b.classList.remove('drag-over'));
            this.sidebarDraggedIndex = null;
        });

        // Allow dropping on this element for reordering
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggedIndex = this.sidebarDraggedIndex;
            if (draggedIndex === null || draggedIndex === index) return;
            
            e.dataTransfer.dropEffect = 'move';
            
            // Show drop indicator
            const rect = el.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            el.classList.add('drag-over');
            el.dataset.dropPosition = e.clientY < midpoint ? 'before' : 'after';
        });

        el.addEventListener('dragleave', (e) => {
            el.classList.remove('drag-over');
            delete el.dataset.dropPosition;
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            el.classList.remove('drag-over');
            
            const source = e.dataTransfer.getData('source');
            const draggedIndex = parseInt(e.dataTransfer.getData('sidebarIndex'));
            
            if (source === 'sidebar-reorder' && !isNaN(draggedIndex) && draggedIndex !== index) {
                const dropPosition = el.dataset.dropPosition || 'before';
                this.reorderSavedBlock(draggedIndex, index, dropPosition);
            }
            
            delete el.dataset.dropPosition;
        });

        return el;
    }

    get sidebarEl() {
        return document.querySelector('.sidebar');
    }

    onSidebarDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.sidebarEl.classList.add('drag-over');
    }

    onSidebarDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        // Use 'move' to match the effectAllowed set in onDragStart
        e.dataTransfer.dropEffect = 'move';
    }

    onSidebarDragLeave(e) {
        e.stopPropagation();
        if (!this.sidebarEl.contains(e.relatedTarget)) {
            this.sidebarEl.classList.remove('drag-over');
        }
    }

    onSidebarDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.sidebarEl.classList.remove('drag-over');

        // Use the instance variable draggedBlock as the primary source
        // because dataTransfer can be unreliable across browsers
        const block = this.draggedBlock;
        
        console.log('Sidebar drop:', { 
            blockId: block && block.dataset ? block.dataset.id : null, 
            hasBlock: !!block, 
            hasDraggedBlock: !!this.draggedBlock,
            dragSource: this.dragSource
        });
        
        // Only accept drops from canvas (check if draggedBlock exists and is from canvas)
        if (block && this.dragSource === 'canvas') {
            this.saveBlockToSidebar(block);
        } else {
            console.log('Sidebar drop rejected:', { 
                reason: !block ? 'no block' : 'wrong source', 
                dragSource: this.dragSource 
            });
        }
    }

    // Save block to sidebar by block ID (called from button click)
    saveBlockToSidebarById(blockId) {
        const block = document.querySelector(`[data-id="${blockId}"]`);
        if (block) {
            this.saveBlockToSidebar(block);
        }
    }

    saveBlockToSidebar(block) {
        const type = block.dataset.type;
        
        // Collect all block data including nested children
        const blockData = this.collectBlockData(block);
        
        // Check for duplicate names in saved blocks
        const blockName = blockData.name;
        if (blockName) {
            const duplicate = this.savedBlocks.find(sb => sb.data.name === blockName);
            if (duplicate) {
                const proceed = confirm(`Warning: A block named "${blockName}" already exists in the sidebar.\n\nDo you want to save anyway?`);
                if (!proceed) return;
            }
        }
        
        // Remove 'type' from data since it's stored separately
        // blockData contains: { type, name, purpose, ..., children }
        const { type: _, ...dataWithoutType } = blockData;
        
        // Create saved block object with full data including children
        const savedBlock = {
            type: type,
            data: dataWithoutType,
            savedAt: new Date().toISOString()
        };

        this.savedBlocks.push(savedBlock);
        this.saveSavedBlocks();
        this.renderSavedBlocks();
        
        // Remove the block from canvas (move, not copy)
        block.remove();
        this.updateOutput();
        
        // Show hint if canvas is now empty
        if (this.canvas.querySelectorAll('.block').length === 0) {
            this.canvas.innerHTML = CANVAS_HINT_HTML;
        }
    }

    removeSavedBlock(index) {
        this.savedBlocks.splice(index, 1);
        this.saveSavedBlocks();
        this.renderSavedBlocks();
    }

    reorderSavedBlock(fromIndex, toIndex, dropPosition) {
        if (fromIndex === toIndex) return;
        const [movedBlock] = this.savedBlocks.splice(fromIndex, 1);
        let newIndex = toIndex;
        if (fromIndex < toIndex && dropPosition === 'before') newIndex--;
        else if (fromIndex > toIndex && dropPosition === 'after') newIndex++;
        newIndex = Math.max(0, Math.min(newIndex, this.savedBlocks.length));
        this.savedBlocks.splice(newIndex, 0, movedBlock);
        this.saveSavedBlocks();
        this.renderSavedBlocks();
    }

    clearSidebar() {
        if (this.savedBlocks.length === 0) return;
        if (!confirm('Clear all saved blocks?')) return;

        this.savedBlocks = [];
        this.saveSavedBlocks();
        this.renderSavedBlocks();
    }

    restoreSavedBlock(savedBlock, isEditing = false) {
        // Remove hint if present
        const hint = this.canvas.querySelector('.canvas-hint');
        if (hint) hint.remove();

        // Check for duplicate name before placing (skip when editing)
        const blockName = savedBlock.data?.name;
        if (blockName && !isEditing) {
            const existingOnCanvas = Array.from(this.canvas.querySelectorAll('.block')).find(b => {
                const nameInput = b.querySelector('[data-field="name"]');
                return nameInput && nameInput.value.trim() === blockName;
            });
            
            if (existingOnCanvas) {
                const proceed = confirm(`Warning: A block named "${blockName}" already exists on the canvas.\n\nDo you want to place it anyway?`);
                if (!proceed) return;
            }
        }
        
        // Create a new block based on the saved data
        const blockId = `block-${this.blockIdCounter++}`;
        const block = this.createBlockFromSaved(savedBlock, blockId, isEditing);

        // Add to canvas
        this.canvas.appendChild(block);
        this.updateOutput();
    }

    editSavedBlock(savedBlock, index) {
        // Place the block on canvas for editing
        this.restoreSavedBlock(savedBlock, true);
        
        // Remove from sidebar since it's now being edited
        this.savedBlocks.splice(index, 1);
        this.saveSavedBlocks();
        this.renderSavedBlocks();
        
        // Scroll to the block and highlight it
        const canvas = this.canvas;
        const newBlock = canvas.lastElementChild;
        if (newBlock && newBlock.classList.contains('block')) {
            newBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a temporary highlight effect
            newBlock.style.animation = 'highlight-block 1s ease';
            setTimeout(() => {
                newBlock.style.animation = '';
            }, 1000);
        }
    }

    createBlockFromSaved(savedBlock, id, isEditing = false) {
        const type = savedBlock.type;
        const data = savedBlock.data;
        
        // Use the main createBlockElement to ensure consistency
        const block = this.createBlockElement(type, id);

        // Restore field values
        block.querySelectorAll('.block-fields [data-field]').forEach(field => {
            const key = field.dataset.field;
            if (data[key] !== undefined) {
                field.value = data[key];
            }
        });

        // Restore nested blocks
        if (data.children && data.children.length > 0) {
            const container = block.querySelector('.nested-container');
            if (container) {
                data.children.forEach(childData => {
                    const childId = `block-${this.blockIdCounter++}`;
                    // childData from collectBlockData has format: { type, name, ..., children }
                    // We need to extract type and pass the rest as data
                    const { type: childType, ...childDataWithoutType } = childData;
                    const childBlock = this.createBlockFromSaved(
                        { type: childType, data: childDataWithoutType },
                        childId,
                        isEditing
                    );
                    container.appendChild(childBlock);
                });
            }
        }

        // Update display name
        this.updateBlockDisplay(block);
        
        // Check for duplicate name and show warning if needed (skip when editing)
        if (data.name && !isEditing) {
            this.checkDuplicateName(block, data.name);
        }

        return block;
    }

    deleteBlock(id) {
        const block = document.querySelector(`[data-id="${id}"]`);
        if (block) {
            block.remove();
            this.updateOutput();
        }

        // Show hint if empty
        if (this.canvas.querySelectorAll('.block').length === 0) {
            this.canvas.innerHTML = `
                <div class="canvas-hint">
                    Click buttons to add blocks<br>
                    <small>Drag Function/Variable blocks into Class blocks<br>
                    Drag Variable blocks into Function blocks</small>
                </div>
            `;
        }
    }

    clearAll() {
        if (this.canvas.querySelectorAll('.block').length === 0) return;
        if (!confirm('Clear all blocks?')) return;

        this.canvas.innerHTML = CANVAS_HINT_HTML;
        this.updateOutput();
    }

    // Data collection
    collectBlockData(block) {
        const type = block.dataset.type;
        const data = { type };

        // Collect fields - only from this block's direct .block-fields, not children
        const blockFields = block.querySelector(':scope > .block-content > .block-fields');
        if (blockFields) {
            blockFields.querySelectorAll('[data-field]').forEach(field => {
                const key = field.dataset.field;
                const value = field.value.trim();
                if (value) {
                    data[key] = value;
                }
            });
        }

        // Collect nested blocks
        const nestedContainer = block.querySelector('.nested-container');
        if (nestedContainer) {
            const nestedBlocks = nestedContainer.querySelectorAll(':scope > .block');
            if (nestedBlocks.length > 0) {
                data.children = Array.from(nestedBlocks).map(b => this.collectBlockData(b));
            }
        }

        return data;
    }

    generatePrompt() {
        const topLevelBlocks = this.canvas.querySelectorAll(':scope > .block');
        
        if (topLevelBlocks.length === 0) {
            return { message: "Add blocks to generate code structure" };
        }

        const blocks = Array.from(topLevelBlocks).map(b => this.collectBlockData(b));

        // Build description
        let description = "Generate code with the following structure:\n\n";

        const buildDescription = (block, indent = 0) => {
            const prefix = '  '.repeat(indent);
            let text = '';

            switch (block.type) {
                case 'class':
                    text += `${prefix}Class "${block.name || 'Unnamed'}"`;
                    if (block.purpose) text += ` - ${block.purpose}`;
                    text += '\n';
                    break;
                case 'function':
                    text += `${prefix}Function "${block.name || 'unnamed'}"`;
                    if (block.parameters) text += `(${block.parameters})`;
                    else text += '()';
                    if (block.returns) text += ` -> ${block.returns}`;
                    if (block.purpose) text += ` - ${block.purpose}`;
                    text += '\n';
                    break;
                case 'variable':
                    text += `${prefix}Variable "${block.name || 'unnamed'}"`;
                    if (block.varType) text += `: ${block.varType}`;
                    if (block.value) text += ` = ${block.value}`;
                    if (block.purpose) text += ` - ${block.purpose}`;
                    text += '\n';
                    break;
                case 'import':
                    text += `${prefix}Import "${block.module || 'unnamed'}"`;
                    if (block.items) text += ` { ${block.items} }`;
                    if (block.purpose) text += ` - ${block.purpose}`;
                    text += '\n';
                    break;
                case 'custom':
                    text += `${prefix}${block.customType || 'Component'} "${block.name || 'unnamed'}"`;
                    if (block.purpose) text += ` - ${block.purpose}`;
                    text += '\n';
                    break;
            }

            if (block.children) {
                block.children.forEach(child => {
                    text += buildDescription(child, indent + 1);
                });
            }

            return text;
        };

        blocks.forEach(block => {
            description += buildDescription(block);
        });

        description += "\nPlease implement clean, well-documented code following best practices.";

        // Clean up the structure for LLM (remove internal fields)
        const cleanBlocks = blocks.map(b => this.cleanBlockData(b));

        return {
            instruction: description,
            structure: cleanBlocks,
            summary: {
                totalBlocks: this.countAllBlocks(blocks),
                topLevel: blocks.length
            }
        };
    }

    // Remove internal fields and normalize data for LLM
    cleanBlockData(block) {
        const cleaned = {
            type: block.type,
            name: block.name || (block.type === 'import' ? block.module : 'unnamed')
        };

        // Add relevant fields based on type
        if (block.purpose) cleaned.purpose = block.purpose;
        
        if (block.type === 'function') {
            if (block.parameters) cleaned.parameters = block.parameters;
            if (block.returns) cleaned.returns = block.returns;
        }
        
        if (block.type === 'variable') {
            if (block.varType) cleaned.type = block.varType;
            if (block.value) cleaned.initialValue = block.value;
        }
        
        if (block.type === 'import') {
            if (block.items) cleaned.imports = block.items;
        }
        
        if (block.type === 'custom' && block.customType) {
            cleaned.customType = block.customType;
        }

        // Recursively clean children
        if (block.children && block.children.length > 0) {
            cleaned.children = block.children.map(c => this.cleanBlockData(c));
        }

        return cleaned;
    }

    countAllBlocks(blocks) {
        let count = blocks.length;
        blocks.forEach(b => {
            if (b.children) {
                count += this.countAllBlocks(b.children);
            }
        });
        return count;
    }

    updateOutput() {
        const prompt = this.generatePrompt();
        this.output.textContent = JSON.stringify(prompt, null, 2);
    }

    copyOutput() {
        Clipboard.copy(this.output.textContent, document.getElementById('copyBtn'));
    }
}

// Initialize
window.app = new CodeBlocks();
