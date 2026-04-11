// Converts block scripts to LLM-readable prompts
class PromptGenerator {
    constructor(workspace) {
        this.workspace = workspace;
        this.output = document.getElementById('promptOutput');
    }

    update() {
        const scripts = this.workspace.getScripts();
        const prompt = this.generatePrompt(scripts);
        this.output.textContent = prompt;
    }

    generatePrompt(scripts) {
        if (scripts.length === 0) {
            return '// Build your program with blocks to generate a prompt\n// The prompt will describe what your program does in plain English';
        }

        let prompt = '';

        scripts.forEach((script, index) => {
            if (index > 0) prompt += '\n\n';
            prompt += this.generateScriptPrompt(script, 0);
        });

        return prompt;
    }

    generateScriptPrompt(block, indent) {
        const definition = BlockFactory.getBlockDefinition(block.type);
        const indentStr = '  '.repeat(indent);
        
        let text = '';

        switch (block.type) {
            // Events
            case 'when_start':
                text = `${indentStr}WHEN THE PROGRAM STARTS:`;
                break;
            case 'when_key':
                text = `${indentStr}WHEN THE "${block.values.key}" KEY IS PRESSED:`;
                break;

            // Motion
            case 'move':
                text = `${indentStr}Move forward by ${block.values.steps} steps`;
                break;
            case 'turn':
                text = `${indentStr}Turn ${block.values.degrees > 0 ? 'right' : 'left'} by ${Math.abs(block.values.degrees)} degrees`;
                break;
            case 'goto':
                text = `${indentStr}Move to position (x: ${block.values.x}, y: ${block.values.y})`;
                break;

            // Looks
            case 'say':
                text = `${indentStr}Display speech bubble saying "${block.values.message}" for ${block.values.seconds} seconds`;
                break;
            case 'think':
                text = `${indentStr}Display thought bubble with "${block.values.message}" for ${block.values.seconds} seconds`;
                break;
            case 'change_size':
                const sizeChange = parseInt(block.values.amount) > 0 ? 'increase' : 'decrease';
                text = `${indentStr}${sizeChange} size by ${Math.abs(block.values.amount)}%`;
                break;

            // Control
            case 'repeat':
                text = `${indentStr}REPEAT the following ${block.values.times} times:`;
                if (block.nested && block.nested.length > 0) {
                    block.nested.forEach(nested => {
                        text += '\n' + this.generateScriptPrompt(nested, indent + 1);
                    });
                } else {
                    text += '\n' + '  '.repeat(indent + 1) + '(no actions inside)';
                }
                break;
            case 'if':
                text = `${indentStr}IF "${block.values.condition}" is true, then:`;
                if (block.nested && block.nested.length > 0) {
                    block.nested.forEach(nested => {
                        text += '\n' + this.generateScriptPrompt(nested, indent + 1);
                    });
                } else {
                    text += '\n' + '  '.repeat(indent + 1) + '(no actions inside)';
                }
                break;
            case 'if_else':
                text = `${indentStr}IF "${block.values.condition}" is true, then:`;
                if (block.nested && block.nested.length > 0) {
                    block.nested.forEach(nested => {
                        text += '\n' + this.generateScriptPrompt(nested, indent + 1);
                    });
                } else {
                    text += '\n' + '  '.repeat(indent + 1) + '(no actions inside)';
                }
                text += `\n${indentStr}OTHERWISE:`;
                if (block.else && block.else.length > 0) {
                    block.else.forEach(elseBlock => {
                        text += '\n' + this.generateScriptPrompt(elseBlock, indent + 1);
                    });
                } else {
                    text += '\n' + '  '.repeat(indent + 1) + '(no actions inside)';
                }
                break;
            case 'wait':
                text = `${indentStr}Wait for ${block.values.seconds} seconds`;
                break;

            // Sensing
            case 'ask':
                text = `${indentStr}Ask the user: "${block.values.question}" and wait for their response`;
                break;
            case 'answer':
                text = `the user's last answer`;
                break;
            case 'mouse_x':
                text = `the current mouse X position`;
                break;
            case 'mouse_y':
                text = `the current mouse Y position`;
                break;

            // Variables
            case 'set_var':
                text = `${indentStr}Set variable "${block.values.varname}" to "${block.values.value}"`;
                break;
            case 'change_var':
                const varChange = parseInt(block.values.amount) > 0 ? 'increase' : 'decrease';
                text = `${indentStr}${varChange} variable "${block.values.varname}" by ${Math.abs(block.values.amount)}`;
                break;

            default:
                text = `${indentStr}[${block.type}]`;
        }

        return text;
    }

    // Generate a more natural language version for non-technical LLMs
    generateNaturalLanguage(scripts) {
        if (scripts.length === 0) {
            return 'No program defined yet.';
        }

        let nl = '';

        scripts.forEach(script => {
            nl += this.blockToNaturalLanguage(script, 0) + '\n';
        });

        return nl.trim();
    }

    blockToNaturalLanguage(block, indent) {
        const indentStr = '  '.repeat(indent);
        
        switch (block.type) {
            case 'when_start':
                return `${indentStr}When the program starts, ` + this.describeActions(block.nested);
            
            case 'move':
                return `${indentStr}move ${block.values.steps} steps forward`;
            
            case 'say':
                return `${indentStr}say "${block.values.message}"`;
            
            case 'repeat':
                return `${indentStr}repeat ${block.values.times} times: ${this.describeActions(block.nested)}`;
            
            default:
                return `${indentStr}do ${block.type}`;
        }
    }

    describeActions(blocks) {
        if (!blocks || blocks.length === 0) return 'do nothing';
        return blocks.map(b => this.blockToNaturalLanguage(b, 0).trim()).join(', then ');
    }
}
