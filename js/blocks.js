// Block definitions and types
const BlockTypes = {
    // Events
    WHEN_START: {
        type: 'when_start',
        category: 'events',
        label: 'When Start',
        shape: 'hat',
        description: 'Starts the program when the green flag is clicked'
    },
    WHEN_KEY: {
        type: 'when_key',
        category: 'events',
        label: 'When key pressed',
        inputs: [{ name: 'key', type: 'select', options: ['space', 'enter', 'up', 'down', 'left', 'right'] }],
        shape: 'hat',
        description: 'Starts when a specific key is pressed'
    },

    // Motion
    MOVE: {
        type: 'move',
        category: 'motion',
        label: 'Move steps',
        inputs: [{ name: 'steps', type: 'number', default: 10 }],
        description: 'Move the sprite forward by specified steps'
    },
    TURN: {
        type: 'turn',
        category: 'motion',
        label: 'Turn degrees',
        inputs: [{ name: 'degrees', type: 'number', default: 15 }],
        description: 'Turn the sprite by specified degrees'
    },
    GOTO: {
        type: 'goto',
        category: 'motion',
        label: 'Go to x: y:',
        inputs: [
            { name: 'x', type: 'number', default: 0 },
            { name: 'y', type: 'number', default: 0 }
        ],
        description: 'Move the sprite to a specific position'
    },

    // Looks
    SAY: {
        type: 'say',
        category: 'looks',
        label: 'Say for seconds',
        inputs: [
            { name: 'message', type: 'text', default: 'Hello!' },
            { name: 'seconds', type: 'number', default: 2 }
        ],
        description: 'Display a speech bubble for a specified time'
    },
    THINK: {
        type: 'think',
        category: 'looks',
        label: 'Think for seconds',
        inputs: [
            { name: 'message', type: 'text', default: 'Hmm...' },
            { name: 'seconds', type: 'number', default: 2 }
        ],
        description: 'Display a thought bubble for a specified time'
    },
    CHANGE_SIZE: {
        type: 'change_size',
        category: 'looks',
        label: 'Change size by',
        inputs: [{ name: 'amount', type: 'number', default: 10 }],
        description: 'Change the size of the sprite'
    },

    // Control
    REPEAT: {
        type: 'repeat',
        category: 'control',
        label: 'Repeat',
        inputs: [{ name: 'times', type: 'number', default: 10 }],
        shape: 'c',
        hasNested: true,
        description: 'Repeat the contained blocks a specified number of times'
    },
    IF: {
        type: 'if',
        category: 'control',
        label: 'If',
        inputs: [{ name: 'condition', type: 'text', default: 'condition' }],
        shape: 'c',
        hasNested: true,
        description: 'Execute blocks only if the condition is true'
    },
    IF_ELSE: {
        type: 'if_else',
        category: 'control',
        label: 'If else',
        inputs: [{ name: 'condition', type: 'text', default: 'condition' }],
        shape: 'c-else',
        hasNested: true,
        hasElse: true,
        description: 'Execute one set of blocks if true, another if false'
    },
    WAIT: {
        type: 'wait',
        category: 'control',
        label: 'Wait seconds',
        inputs: [{ name: 'seconds', type: 'number', default: 1 }],
        description: 'Pause execution for a specified time'
    },

    // Sensing
    ASK: {
        type: 'ask',
        category: 'sensing',
        label: 'Ask and wait',
        inputs: [{ name: 'question', type: 'text', default: "What's your name?" }],
        description: 'Ask the user a question and wait for input'
    },
    ANSWER: {
        type: 'answer',
        category: 'sensing',
        label: 'answer',
        shape: 'reporter',
        description: 'The answer from the last ask block'
    },
    MOUSE_X: {
        type: 'mouse_x',
        category: 'sensing',
        label: 'mouse x',
        shape: 'reporter',
        description: 'The current x position of the mouse'
    },
    MOUSE_Y: {
        type: 'mouse_y',
        category: 'sensing',
        label: 'mouse y',
        shape: 'reporter',
        description: 'The current y position of the mouse'
    },

    // Variables
    SET_VAR: {
        type: 'set_var',
        category: 'variables',
        label: 'Set to',
        inputs: [
            { name: 'varname', type: 'text', default: 'my variable' },
            { name: 'value', type: 'text', default: '0' }
        ],
        description: 'Set a variable to a specific value'
    },
    CHANGE_VAR: {
        type: 'change_var',
        category: 'variables',
        label: 'Change by',
        inputs: [
            { name: 'varname', type: 'text', default: 'my variable' },
            { name: 'amount', type: 'number', default: 1 }
        ],
        description: 'Change a variable by a specific amount'
    }
};

// Block factory - creates block elements
class BlockFactory {
    static createBlock(type, values = {}) {
        const definition = Object.values(BlockTypes).find(b => b.type === type);
        if (!definition) return null;

        const block = document.createElement('div');
        block.className = `block ${definition.category}-block`;
        block.dataset.type = type;
        block.draggable = true;

        // Add shape-specific classes
        if (definition.shape === 'hat') {
            block.classList.add('hat-block');
        } else if (definition.shape === 'c' || definition.shape === 'c-else') {
            block.classList.add('c-block');
        } else if (definition.shape === 'reporter') {
            block.classList.add('reporter');
        }

        // Build block content
        let content = '';
        const inputs = definition.inputs || [];
        
        if (inputs.length === 0) {
            content = `<span class="block-text">${definition.label}</span>`;
        } else {
            content = '<span class="block-text">';
            const labelParts = definition.label.split(/\s+/);
            let inputIndex = 0;

            labelParts.forEach(part => {
                if (part.includes(':') && inputIndex < inputs.length) {
                    const input = inputs[inputIndex];
                    const value = values[input.name] !== undefined ? values[input.name] : input.default;
                    
                    if (input.type === 'select') {
                        const options = input.options.map(opt => 
                            `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
                        ).join('');
                        content += `<select class="block-input" data-input="${input.name}">${options}</select> `;
                    } else {
                        content += `<input type="${input.type}" class="block-input" data-input="${input.name}" value="${value}"> `;
                    }
                    inputIndex++;
                } else {
                    content += part + ' ';
                }
            });

            // Add remaining inputs
            while (inputIndex < inputs.length) {
                const input = inputs[inputIndex];
                const value = values[input.name] !== undefined ? values[input.name] : input.default;
                content += `<input type="${input.type}" class="block-input" data-input="${input.name}" value="${value}"> `;
                inputIndex++;
            }

            content += '</span>';
        }

        block.innerHTML = content;

        // Add nested content container for C-blocks
        if (definition.hasNested) {
            const nested = document.createElement('div');
            nested.className = 'c-content';
            block.appendChild(nested);

            if (definition.hasElse) {
                const elseLabel = document.createElement('div');
                elseLabel.className = 'else-label';
                elseLabel.textContent = 'else';
                elseLabel.style.cssText = 'color: white; padding: 5px 0; font-size: 13px;';
                block.appendChild(elseLabel);

                const elseContent = document.createElement('div');
                elseContent.className = 'c-content else-content';
                block.appendChild(elseContent);
            }
        }

        return block;
    }

    static getBlockDefinition(type) {
        return Object.values(BlockTypes).find(b => b.type === type);
    }

    static getBlockValues(block) {
        const definition = this.getBlockDefinition(block.dataset.type);
        if (!definition || !definition.inputs) return {};

        const values = {};
        definition.inputs.forEach(input => {
            const inputEl = block.querySelector(`[data-input="${input.name}"]`);
            if (inputEl) {
                values[input.name] = inputEl.value;
            }
        });

        return values;
    }
}
