// Canvas stage for visualizing the sprite
class Stage {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Sprite state
        this.sprite = {
            x: 150,
            y: 150,
            direction: 90, // 0 is up, 90 is right
            size: 100,
            visible: true,
            sayText: null,
            thinkText: null,
            sayTimeout: null
        };

        // Animation
        this.isRunning = false;
        this.commandQueue = [];
        this.variables = {};
        this.answer = '';

        this.init();
    }

    init() {
        this.draw();
        this.updateInfo();
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw sprite
        if (this.sprite.visible) {
            this.drawSprite();
        }

        // Draw speech/thought bubble
        if (this.sprite.sayText) {
            this.drawBubble(this.sprite.sayText, false);
        } else if (this.sprite.thinkText) {
            this.drawBubble(this.sprite.thinkText, true);
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = '#eee';
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= this.canvas.width; x += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= this.canvas.height; y += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // Center cross
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.moveTo(0, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }

    drawSprite() {
        const size = this.sprite.size / 100 * 40;
        const angle = (this.sprite.direction - 90) * Math.PI / 180;

        this.ctx.save();
        this.ctx.translate(this.sprite.x, this.sprite.y);
        this.ctx.rotate(angle);

        // Draw cat-like sprite
        this.ctx.fillStyle = '#ff8c00';
        
        // Body
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Head
        this.ctx.beginPath();
        this.ctx.arc(size * 0.5, 0, size * 0.35, 0, Math.PI * 2);
        this.ctx.fill();

        // Ears
        this.ctx.beginPath();
        this.ctx.moveTo(size * 0.7, -size * 0.25);
        this.ctx.lineTo(size * 0.9, -size * 0.4);
        this.ctx.lineTo(size * 0.8, -size * 0.1);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(size * 0.7, size * 0.25);
        this.ctx.lineTo(size * 0.9, size * 0.4);
        this.ctx.lineTo(size * 0.8, size * 0.1);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(size * 0.6, -size * 0.1, size * 0.1, 0, Math.PI * 2);
        this.ctx.arc(size * 0.6, size * 0.1, size * 0.1, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(size * 0.65, -size * 0.1, size * 0.04, 0, Math.PI * 2);
        this.ctx.arc(size * 0.65, size * 0.1, size * 0.04, 0, Math.PI * 2);
        this.ctx.fill();

        // Nose
        this.ctx.fillStyle = '#ff69b4';
        this.ctx.beginPath();
        this.ctx.arc(size * 0.75, 0, size * 0.05, 0, Math.PI * 2);
        this.ctx.fill();

        // Tail
        this.ctx.strokeStyle = '#ff8c00';
        this.ctx.lineWidth = size * 0.15;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(-size * 0.5, 0);
        this.ctx.quadraticCurveTo(-size * 0.8, -size * 0.3, -size * 0.9, -size * 0.1);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawBubble(text, isThought) {
        const bubbleX = this.sprite.x + 50;
        const bubbleY = this.sprite.y - 60;
        const padding = 10;
        
        this.ctx.font = '14px sans-serif';
        const textWidth = this.ctx.measureText(text).width;
        const bubbleWidth = Math.max(textWidth + padding * 2, 60);
        const bubbleHeight = 40;

        // Draw bubble
        this.ctx.fillStyle = '#fff';
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 10);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw tail
        this.ctx.beginPath();
        if (isThought) {
            // Thought bubbles have circles
            this.ctx.arc(bubbleX + 10, bubbleY + bubbleHeight + 10, 5, 0, Math.PI * 2);
            this.ctx.arc(bubbleX - 5, bubbleY + bubbleHeight + 20, 3, 0, Math.PI * 2);
        } else {
            // Speech bubble has a triangle
            this.ctx.moveTo(bubbleX + 10, bubbleY + bubbleHeight);
            this.ctx.lineTo(bubbleX, bubbleY + bubbleHeight + 15);
            this.ctx.lineTo(bubbleX + 25, bubbleY + bubbleHeight);
        }
        this.ctx.fill();
        this.ctx.stroke();

        // Draw text
        this.ctx.fillStyle = '#333';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2);
    }

    updateInfo() {
        document.getElementById('spriteX').textContent = Math.round(this.sprite.x - 150);
        document.getElementById('spriteY').textContent = Math.round(150 - this.sprite.y);
        document.getElementById('spriteDir').textContent = Math.round(this.sprite.direction);
    }

    // Command execution
    async runScript(script) {
        if (script.type === 'when_start' || script.type === 'when_key') {
            for (const block of script.nested || []) {
                await this.executeBlock(block);
            }
        }
    }

    async executeBlock(block) {
        switch (block.type) {
            case 'move':
                await this.move(parseInt(block.values.steps));
                break;
            case 'turn':
                await this.turn(parseInt(block.values.degrees));
                break;
            case 'goto':
                await this.goTo(parseInt(block.values.x), parseInt(block.values.y));
                break;
            case 'say':
                await this.say(block.values.message, parseFloat(block.values.seconds));
                break;
            case 'think':
                await this.think(block.values.message, parseFloat(block.values.seconds));
                break;
            case 'change_size':
                await this.changeSize(parseInt(block.values.amount));
                break;
            case 'wait':
                await this.wait(parseFloat(block.values.seconds));
                break;
            case 'repeat':
                for (let i = 0; i < parseInt(block.values.times); i++) {
                    for (const nested of block.nested || []) {
                        await this.executeBlock(nested);
                    }
                }
                break;
            case 'if':
                // Simple condition evaluation (mock)
                const condition = block.values.condition.toLowerCase();
                const isTrue = this.evaluateCondition(condition);
                if (isTrue) {
                    for (const nested of block.nested || []) {
                        await this.executeBlock(nested);
                    }
                }
                break;
            case 'set_var':
                this.variables[block.values.varname] = block.values.value;
                break;
            case 'change_var':
                const current = parseFloat(this.variables[block.values.varname] || 0);
                this.variables[block.values.varname] = current + parseFloat(block.values.amount);
                break;
            case 'ask':
                this.answer = prompt(block.values.question) || '';
                break;
        }
    }

    evaluateCondition(condition) {
        // Very simple condition evaluator for demo
        if (condition.includes('>')) {
            const parts = condition.split('>');
            return parseFloat(parts[0]) > parseFloat(parts[1]);
        }
        if (condition.includes('<')) {
            const parts = condition.split('<');
            return parseFloat(parts[0]) < parseFloat(parts[1]);
        }
        if (condition.includes('=')) {
            const parts = condition.split('=');
            return parts[0].trim() === parts[1].trim();
        }
        return true; // Default to true for unknown conditions
    }

    // Actions
    async move(steps) {
        const radians = (this.sprite.direction - 90) * Math.PI / 180;
        const dx = Math.cos(radians) * steps;
        const dy = Math.sin(radians) * steps;
        
        // Animate
        const duration = 500;
        const startX = this.sprite.x;
        const startY = this.sprite.y;
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.sprite.x = startX + dx * progress;
                this.sprite.y = startY + dy * progress;
                this.draw();
                this.updateInfo();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            animate();
        });
    }

    async turn(degrees) {
        const targetDir = this.sprite.direction + degrees;
        const duration = 300;
        const startDir = this.sprite.direction;
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.sprite.direction = startDir + degrees * progress;
                this.draw();
                this.updateInfo();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            animate();
        });
    }

    async goTo(x, y) {
        this.sprite.x = 150 + x;
        this.sprite.y = 150 - y;
        this.draw();
        this.updateInfo();
        await this.wait(0.1);
    }

    async say(text, seconds) {
        this.sprite.sayText = text;
        this.sprite.thinkText = null;
        this.draw();
        await this.wait(seconds);
        this.sprite.sayText = null;
        this.draw();
    }

    async think(text, seconds) {
        this.sprite.thinkText = text;
        this.sprite.sayText = null;
        this.draw();
        await this.wait(seconds);
        this.sprite.thinkText = null;
        this.draw();
    }

    async changeSize(amount) {
        this.sprite.size += amount;
        this.draw();
        await this.wait(0.1);
    }

    async wait(seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    reset() {
        this.sprite = {
            x: 150,
            y: 150,
            direction: 90,
            size: 100,
            visible: true,
            sayText: null,
            thinkText: null,
            sayTimeout: null
        };
        this.variables = {};
        this.draw();
        this.updateInfo();
    }
}
