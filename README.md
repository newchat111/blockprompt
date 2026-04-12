# 🧩 CodeBlocks

A visual code structure builder that generates LLM-readable prompts for code generation.

![CodeBlocks Screenshot](assets/screenshot.png)

---

## Installation

### 1. Clone the Repository

```bash
git clone git@github.com:newchat111/blockprompt.git
cd canvas_coding
```

### 2. Open in Browser

Since CodeBlocks is a client-side application, you can simply open the HTML files in your browser:

```bash
# On macOS
open index.html

# On Linux
xdg-open index.html

# On Windows
start index.html
```

Or use a local development server (recommended):

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000` in your browser.

---

## Project Structure

```
canvas_coding/
├── index.html          # Main nested block editor
├── canvas.html         # Grid canvas with relationships
├── css/
│   ├── style.css      # Main editor styles
│   └── canvas.css     # Grid canvas styles
├── js/
│   ├── app.js         # Main editor logic
│   ├── blocks.js      # Block definitions
│   ├── canvas.js      # Grid canvas logic
│   ├── workspace.js   # Workspace management
│   ├── stage.js       # Stage/canvas handling
│   └── promptGenerator.js  # JSON generation
└── assets/            # Images and screenshots
```

---

## License

MIT License - feel free to use and modify!

---

## Contributing

Found a bug or have a feature idea? Feel free to:
1. Fork the repository
2. Make your changes
3. Submit a pull request

Happy coding! 🚀