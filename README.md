# 🧩 CodeBlocks

A visual code structure builder that generates LLM-readable prompts for code generation.

![CodeBlocks Screenshot](assets/screenshot.png)

---

## 📚 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [The Nested Editor](#the-nested-editor)
- [The Grid Canvas](#the-grid-canvas)
- [Working with Blocks](#working-with-blocks)
- [Saving and Loading](#saving-and-loading)
- [Tips and Tricks](#tips-and-tricks)

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
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

## Quick Start

### Your First 2 Minutes

1. **Open the app** - You should see the main editor with a toolbar at the top
2. **Add a Class** - Click the **"+ Class"** button
3. **Name it** - Type `UserManager` in the name field
4. **Add a Function** - Click **"+ Function"**, name it `createUser`
5. **Nest the Function** - Drag the Function block and drop it onto the Class block
6. **View the JSON** - Look at the right panel to see the generated structure

Congratulations! You've created your first code structure.

---

## The Nested Editor

The Nested Editor (`index.html`) is where you build hierarchical code structures using parent-child relationships.

### Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│  🧩 CodeBlocks    [+Class][+Func][+Var][+Custom][+Import]   │  ← Toolbar
├──────────────────┬──────────────────────────┬───────────────┤
│                  │                          │               │
│  💾 Saved Blocks │    📦 Canvas Area        │  📄 System    │
│                  │                          │     JSON      │
│  ─────────────   │                          │               │
│  Block 1         │  ┌─────────────────┐     │  {            │
│  Block 2         │  │ Class: User     │     │    "blocks":  │
│                  │  │ ├─ Function:    │     │    [...]      │
│  Drag blocks     │  │ │   getName     │     │  }            │
│  here to save    │  │ └─ Variable:    │     │               │
│                  │  │     count       │     │               │
│  Click to        │  └─────────────────┘     │               │
│  restore         │                          │               │
│                  │                          │               │
└──────────────────┴──────────────────────────┴───────────────┘
        ↑                    ↑                      ↑
   Saved Blocks          Canvas Area           Output Panel
   (Sidebar)            (Main Editor)         (JSON View)
```

### Toolbar Buttons

| Button | What It Does |
|--------|--------------|
| **+ Class** | Creates a class block that can contain functions and variables |
| **+ Function** | Creates a function block with parameters and return type fields |
| **+ Variable** | Creates a variable block with type and initial value |
| **+ Custom** | Creates a custom block for any purpose (components, services, etc.) |
| **+ Import** | Creates an import/module dependency block |
| **Clear All** | Removes all blocks from the canvas |
| **🖼️ Canvas** | Switches to the Grid Canvas mode |
| **📖 Sidebar** | Toggles the Saved Blocks sidebar |

### Nesting Rules

You can drag blocks to nest them inside other blocks:

- ✅ **Function** → inside → **Class**
- ✅ **Variable** → inside → **Class**
- ✅ **Variable** → inside → **Function**
- ❌ **Class** → inside → **Function** (not allowed)

**How to nest:** Click and drag a block, then drop it onto the block you want to parent it.

---

## The Grid Canvas

The Grid Canvas (`canvas.html`) is a free-form workspace where you can place blocks anywhere and draw connections between them.

### Switching to Grid Canvas

Click the **🖼️ Canvas** button in the toolbar to open the Grid Canvas.

### Grid Canvas Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back    🖼️ Grid Canvas                    [Clear Canvas]             │
├──────────┬────────────┬──────────────────────────────┬──────────────────┤
│          │            │                              │                  │
│  📁      │  💾        │                              │  📄 System JSON  │
│ Projects │ Saved      │      🎯 Grid Canvas          │                  │
│          │ Blocks     │                              │  {               │
│  ─────── │ ─────────  │    ┌─────┐      ┌─────┐     │    "blocks":     │
│  Proj 1  │  Block A   │    │  A  │─────▶│  B  │     │    [...],        │
│  Proj 2  │  Block B   │    └─────┘      └─────┘     │    "relationships│
│          │  Block C   │         │                 │  ": [...]         │
│  [Save]  │            │         └────────────────▶  │  }               │
│          │  3 blocks  │                              │                  │
│          │            │  📦 Drag blocks from sidebar │  [Copy]          │
│          │            │                              │                  │
├──────────┴────────────┴──────────────────────────────┴──────────────────┤
│                    🗑️ Drag here to delete                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Grid Canvas Features

#### 1. Projects Panel (Left)
- Save your entire canvas layout as a named project
- Load previously saved projects
- Delete projects you no longer need

#### 2. Saved Blocks Panel (Left-Center)
- Shows all blocks saved from the main editor
- Drag blocks onto the canvas to place them
- Click a block to place it at the center

#### 3. Grid Canvas (Center)
- **Drag to place**: Drag blocks from the Saved Blocks panel
- **Click to connect**: Click the ↗ button on a block, then click another block to connect them
- **Drag to move**: Drag placed blocks to reposition them
- **Drag to delete**: Drag blocks to the delete zone at the bottom

#### 4. System JSON Panel (Right)
- Shows the complete system description in JSON format
- Includes blocks and their relationships
- Click **Copy** to copy to clipboard

#### 5. Minimize Buttons
Each panel has a **−** button in its header to minimize/expand:
- Click **−** to collapse a panel and free up space
- Click again (now showing a rotated minus) to expand
- Your preference is saved and restored on reload

### Creating Connections

1. Click the **↗** button on the source block
2. The block will pulse to indicate it's waiting for a target
3. Click the target block
4. Enter a relationship description (e.g., "calls", "extends", "uses")
5. An arrow will appear showing the connection

**Tip:** Click on an arrow to edit or delete the connection.

---

## Working with Blocks

### Block Types

#### 📦 Class Block
```
┌─────────────────────────┐
│ Class: UserManager      │
├─────────────────────────┤
│ Purpose: Manages users  │
└─────────────────────────┘
```
- **Name**: The class name
- **Purpose**: Description of what the class does
- Can contain: Functions, Variables

#### ⚡ Function Block
```
┌─────────────────────────┐
│ Function: createUser    │
├─────────────────────────┤
│ Purpose: Creates user   │
│ Parameters: name, email │
│ Returns: User object    │
└─────────────────────────┘
```
- **Name**: The function name
- **Purpose**: What the function does
- **Parameters**: Input parameters
- **Returns**: Return type/description
- Can contain: Variables

#### 📊 Variable Block
```
┌─────────────────────────┐
│ Variable: userCount     │
├─────────────────────────┤
│ Type: number            │
│ Value: 0                │
└─────────────────────────┘
```
- **Name**: Variable name
- **Type**: Data type (number, string, etc.)
- **Value**: Initial value

#### 🔧 Custom Block
```
┌─────────────────────────┐
│ Component: UserCard     │
├─────────────────────────┤
│ Purpose: Display user   │
└─────────────────────────┘
```
- **Custom Type**: Component, Service, Module, etc.
- **Name**: The item name
- **Purpose**: Description

#### 📥 Import Block
```
┌─────────────────────────┐
│ Import: react           │
├─────────────────────────┤
│ Module: react           │
│ Items: useState, useEffect
└─────────────────────────┘
```
- **Module**: The module to import from
- **Items**: Specific imports (optional)

### Editing Blocks

Click on any block field to edit it:
- **Click the name** to rename
- **Click the purpose** to add a description
- **Click parameters/returns** to specify function signature

### Deleting Blocks

- **In Nested Editor**: Click the **×** button on the block
- **In Grid Canvas**: Drag the block to the **🗑️ Delete Zone** at the bottom

---

## Saving and Loading

### Saving Blocks to Sidebar

1. Create a block in the main editor
2. **Drag the block to the Saved Blocks sidebar** (left side)
3. The block is now saved and available in both editors

### Loading Saved Blocks

- **In Nested Editor**: Click a saved block in the sidebar to add it to the canvas
- **In Grid Canvas**: Drag saved blocks onto the canvas, or click to place at center

### Saving Projects (Grid Canvas)

1. Arrange your blocks on the Grid Canvas
2. Click the **+ Save** button in the Projects panel
3. Enter a project name
4. Your layout and connections are saved

### Loading Projects

Click on a project name in the Projects panel to restore that layout.

### Clearing Saved Blocks

Click the **×** button next to "Saved Blocks" in the sidebar to clear all saved blocks.

---

## Tips and Tricks

### For Better LLM Prompts

1. **Be specific with purposes** - The purpose field becomes part of the LLM instruction
2. **Use relationships** - In Grid Canvas, define how blocks relate ("calls", "extends", "imports")
3. **Group related blocks** - Use the canvas layout to show logical groupings
4. **Name consistently** - Use clear, descriptive names that the LLM will understand

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Cancel connection / Close modal |
| `Delete` | Delete selected block (in some contexts) |

### Data Persistence

All your data is stored in the browser's localStorage:
- ✅ Saved blocks persist across sessions
- ✅ Projects are remembered
- ✅ Panel minimize states are saved
- ⚠️ Clearing browser data will remove saved blocks and projects

### Browser Compatibility

CodeBlocks works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

---

## Example Workflow

Let's build a simple user authentication system:

### Step 1: Create Blocks in Nested Editor

1. Click **+ Class** → Name: `AuthService`
2. Click **+ Function** → Name: `login`, Purpose: `Authenticates user with credentials`
3. Drag `login` into `AuthService`
4. Click **+ Function** → Name: `logout`, Purpose: `Logs out current user`
5. Drag `logout` into `AuthService`
6. Click **+ Variable** → Name: `currentUser`, Type: `User`, Value: `null`
7. Drag `currentUser` into `AuthService`

### Step 2: Save Blocks

Drag `AuthService` to the Saved Blocks sidebar.

### Step 3: Switch to Grid Canvas

Click **🖼️ Canvas** button.

### Step 4: Build System Architecture

1. Drag `AuthService` onto the canvas
2. Click **+ Custom** in main editor, create `UserController`
3. Save and drag `UserController` to canvas
4. Click ↗ on `UserController`, then click `AuthService`
5. Enter relationship: `uses`

### Step 5: Copy JSON

Click **Copy** in the System JSON panel. Your clipboard now contains:

```json
{
  "instruction": "Generate code with the following structure:\n\nClass \"AuthService\"...",
  "blocks": [...],
  "relationships": [...]
}
```

### Step 6: Use with LLM

Paste the JSON into ChatGPT, Claude, or your favorite LLM with a prompt like:

> "Generate TypeScript code based on this structure: [paste JSON]"

---

## Troubleshooting

### Blocks not nesting?
- Make sure you're dropping directly onto the parent block
- Only certain block types can be nested (Function → Class, Variable → Function/Class)

### Saved blocks not appearing?
- Check that you dragged the block all the way to the sidebar
- Refresh the page - saved blocks are stored in localStorage

### Canvas not loading?
- Make sure you're opening `index.html` first, then clicking Canvas
- Or directly open `canvas.html`

### Data lost?
- Data is stored in browser localStorage
- Clearing cookies/site data will remove saved blocks
- Use the Projects feature to save important layouts

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
