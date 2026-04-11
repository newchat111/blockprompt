# 🧩 CodeBlocks

A visual code structure builder that generates LLM-readable prompts for code generation.

![CodeBlocks Screenshot](assets/screenshot.png)

## 🎯 Purpose

CodeBlocks helps developers and AI-assisted workflows by:
1. **Visualizing code architecture** through drag-and-drop blocks
2. **Building code structure** without writing boilerplate
3. **Generating LLM prompts** that accurately describe code intent
4. **Documenting relationships** between components

## ✨ Features

### Block Types
- **📦 Class** - Define classes with nested functions and variables
- **⚡ Function** - Define functions with parameters and return types
- **📊 Variable** - Define variables with types and initial values
- **🔧 Custom** - Create custom block types (Components, Services, etc.)

### Two Editor Modes
- **Nested Editor** - Hierarchical parent-child relationships
- **Grid Canvas** - Free-form placement with relationship arrows

### Live JSON Generation
- **Structure Output** - Machine-readable JSON for programmatic use
- **Instruction Output** - Natural language description for LLMs
- **Connection Mapping** - Visual arrows become relationship descriptions

## 🚀 Quick Start

1. Open `index.html` in your browser
2. Add blocks using the toolbar buttons
3. Drag Function/Variable blocks into Class blocks to nest them
4. Click **🖼️ Canvas** to switch to grid mode and add connections
5. Copy the generated JSON to use with your favorite LLM

## 📝 Example Output

**Blocks:**
```
[Class "UserManager"]
    [Function "createUser"]
    [Function "deleteUser"]
```

**Generated JSON:**
```json
{
  "instruction": "Generate code with the following structure:\n\nClass \"UserManager\"\n  Function \"createUser\"()\n  Function \"deleteUser\"()\n...",
  "structure": [
    {
      "type": "class",
      "name": "UserManager",
      "children": [
        { "type": "function", "name": "createUser" },
        { "type": "function", "name": "deleteUser" }
      ]
    }
  ]
}
```

## 🎮 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+C` | Copy generated JSON |
| `Delete` | Delete selected block |
| `Escape` | Cancel connection / Close modal |

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Block Toolbar  │────▶│  Canvas Editor  │────▶│  JSON Generator │
│  (Add Blocks)   │     │  (Arrange)      │     │  (LLM Output)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Saved Blocks   │     │  Grid Canvas    │
│  (Sidebar)      │     │  (Relationships)│
└─────────────────┘     └─────────────────┘
```

## 🗂️ Project Structure

```
canvas_coding/
├── index.html          # Main nested block editor
├── canvas.html         # Grid canvas with relationships
├── css/
│   ├── style.css      # Main editor styles
│   └── canvas.css     # Grid canvas styles
├── js/
│   ├── app.js         # Main editor logic
│   └── canvas.js      # Grid canvas logic
└── assets/            # Images and screenshots
```

## 🔮 Future Ideas

- [ ] Import block type for dependency management
- [ ] Export to actual code (Python, TypeScript, etc.)
- [ ] Template library for common patterns
- [ ] Collaboration features
- [ ] AI-assisted block suggestions

## 📄 License

MIT License - feel free to use and modify!
