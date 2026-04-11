// Workspace management - drag and drop, block organization
class Workspace {
    constructor(element) {
        this.element = element;
        this.blocks = [];
        this.draggedBlock = null;
        this.dropTarget = null;
        this.scripts = []; // Top-level block stacks

        this.init();
    }

    init() {
        // Drag from palette
        document.querySelectorAll('.palette .block').forEach(block => {
            block.addEventListener('dragstart', (e) => this.onPaletteDragStart(e));
            block.addEventListener('dragend', (e) => this.onDragEnd(e));
        });

        // Workspace drop zone
        this.element.addEventListener('dragover', (e) => this.onDragOver(e));
        this.element.addEventListener('drop', (e) => this.onDrop(e));
        this.element.addEventListener('dragleave', (e) => this.onDragLeave(e));

        // Delete block on right-click
        this.element.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.block')) {
                e.preventDefault();
                const block = e.target.closest('.block');
                if (confirm('Delete this block?')) {
                    this.removeBlock(block);
                }
            }
        });
    }

    onPaletteDragStart(e) {
        const blockType = e.target.dataset.type;
        e.dataTransfer.setData('blockType', blockType);
        e.dataTransfer.setData('source', 'palette');
        e.dataTransfer.effectAllowed = 'copy';
        
        // Create a ghost image
        const rect = e.target.getBoundingClientRect();
        e.dataTransfer.setDragImage(e.target, rect.width / 2, 20);
    }

    onWorkspaceDragStart(e) {
        const block = e.target.closest('.block');
        this.draggedBlock = block;
        
        e.dataTransfer.setData('source', 'workspace');
        e.dataTransfer.effectAllowed = 'move';
        
        block.classList.add('dragging');
        
        // Delay to allow drag image to be created
        setTimeout(() => {
            block.style.opacity = '0.5';
        }, 0);
    }

    onDragEnd(e) {
        const block = e.target.closest('.block');
        if (block) {
            block.classList.remove('dragging');
            block.style.opacity = '1';
        }
        this.draggedBlock = null;
        this.clearDropIndicators();
    }

    onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.dataTransfer.getData('source') === 'palette' ? 'copy' : 'move';

        // Find drop position
        const afterElement = this.getDragAfterElement(this.element, e.clientY);
        this.showDropIndicator(afterElement);
    }

    onDragLeave(e) {
        if (e.target === this.element) {
            this.clearDropIndicators();
        }
    }

    onDrop(e) {
        e.preventDefault();
        this.clearDropIndicators();

        const source = e.dataTransfer.getData('source');
        const blockType = e.dataTransfer.getData('blockType');

        // Remove hint if present
        const hint = this.element.querySelector('.workspace-hint');
        if (hint) hint.remove();

        if (source === 'palette' && blockType) {
            // Create new block from palette
            const newBlock = BlockFactory.createBlock(blockType);
            if (newBlock) {
                this.addWorkspaceBlockEvents(newBlock);
                const afterElement = this.getDragAfterElement(this.element, e.clientY);
                
                if (afterElement) {
                    this.element.insertBefore(newBlock, afterElement);
                } else {
                    this.element.appendChild(newBlock);
                }
                
                this.updateScripts();
            }
        } else if (source === 'workspace' && this.draggedBlock) {
            // Move existing block
            const afterElement = this.getDragAfterElement(this.element, e.clientY);
            
            if (afterElement) {
                this.element.insertBefore(this.draggedBlock, afterElement);
            } else {
                this.element.appendChild(this.draggedBlock);
            }
            
            this.draggedBlock.style.opacity = '1';
            this.updateScripts();
        }

        // Trigger prompt update
        if (window.promptGenerator) {
            window.promptGenerator.update();
        }
    }

    addWorkspaceBlockEvents(block) {
        block.draggable = true;
        block.addEventListener('dragstart', (e) => this.onWorkspaceDragStart(e));
        block.addEventListener('dragend', (e) => this.onDragEnd(e));

        // Make nested blocks droppable
        const nestedContainers = block.querySelectorAll('.c-content');
        nestedContainers.forEach(container => {
            container.addEventListener('dragover', (e) => this.onNestedDragOver(e, container));
            container.addEventListener('drop', (e) => this.onNestedDrop(e, container));
        });

        // Update prompt when inputs change
        block.querySelectorAll('.block-input').forEach(input => {
            input.addEventListener('change', () => {
                if (window.promptGenerator) {
                    window.promptGenerator.update();
                }
            });
        });
    }

    onNestedDragOver(e, container) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        const afterElement = this.getDragAfterElement(container, e.clientY);
        this.showDropIndicator(afterElement, container);
    }

    onNestedDrop(e, container) {
        e.preventDefault();
        e.stopPropagation();
        this.clearDropIndicators();

        const source = e.dataTransfer.getData('source');
        const blockType = e.dataTransfer.getData('blockType');

        if (source === 'palette' && blockType) {
            const newBlock = BlockFactory.createBlock(blockType);
            if (newBlock) {
                this.addWorkspaceBlockEvents(newBlock);
                const afterElement = this.getDragAfterElement(container, e.clientY);
                
                if (afterElement) {
                    container.insertBefore(newBlock, afterElement);
                } else {
                    container.appendChild(newBlock);
                }
            }
        } else if (source === 'workspace' && this.draggedBlock) {
            const afterElement = this.getDragAfterElement(container, e.clientY);
            
            if (afterElement) {
                container.insertBefore(this.draggedBlock, afterElement);
            } else {
                container.appendChild(this.draggedBlock);
            }
            
            this.draggedBlock.style.opacity = '1';
        }

        this.updateScripts();
        if (window.promptGenerator) {
            window.promptGenerator.update();
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.block:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    showDropIndicator(afterElement, container = this.element) {
        this.clearDropIndicators();
        
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        
        if (afterElement) {
            container.insertBefore(indicator, afterElement);
        } else {
            container.appendChild(indicator);
        }
    }

    clearDropIndicators() {
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    }

    removeBlock(block) {
        block.remove();
        this.updateScripts();
        if (window.promptGenerator) {
            window.promptGenerator.update();
        }
    }

    updateScripts() {
        // Build script structure from DOM
        this.scripts = [];
        const topLevelBlocks = [...this.element.querySelectorAll(':scope > .block')];
        
        topLevelBlocks.forEach(block => {
            this.scripts.push(this.serializeBlock(block));
        });
    }

    serializeBlock(block) {
        const type = block.dataset.type;
        const definition = BlockFactory.getBlockDefinition(type);
        const values = BlockFactory.getBlockValues(block);
        
        const serialized = {
            type: type,
            category: definition?.category,
            values: values,
            nested: []
        };

        // Get nested blocks
        const nestedContainer = block.querySelector(':scope > .c-content');
        if (nestedContainer) {
            const nestedBlocks = [...nestedContainer.querySelectorAll(':scope > .block')];
            serialized.nested = nestedBlocks.map(b => this.serializeBlock(b));
        }

        // Get else blocks
        const elseContainer = block.querySelector(':scope > .else-content');
        if (elseContainer) {
            const elseBlocks = [...elseContainer.querySelectorAll(':scope > .block')];
            serialized.else = elseBlocks.map(b => this.serializeBlock(b));
        }

        return serialized;
    }

    getScripts() {
        return this.scripts;
    }

    clear() {
        const blocks = this.element.querySelectorAll('.block');
        blocks.forEach(b => b.remove());
        
        this.element.innerHTML = '<div class="workspace-hint">Drag blocks here to build your program</div>';
        this.scripts = [];
        
        if (window.promptGenerator) {
            window.promptGenerator.update();
        }
    }
}
