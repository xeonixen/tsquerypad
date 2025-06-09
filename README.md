# TSQueryPad

Run powerful, LINQ-inspired TypeScript/JavaScript queries on any file inside VS Code.

---

## Overview

**TSQueryPad** lets you run custom TypeScript or JavaScript code to query and analyze the contents of files directly within Visual Studio Code.

- Execute code snippets on the currently open document or any file in the explorer.
- Access the file's lines via a special variable `lines` — an array of strings representing each line.
- Use handy array methods like `distinct()`, `sum()`, `average()`, and more — just like LINQ.
- Supports advanced filtering, aggregation, and transformation using full TypeScript/JavaScript capabilities.
- For binary files (e.g. `.exe`, `.bin`, `.img`), it runs `strings` to extract readable text before querying.
- Results display instantly below the editor for quick insight.

---

## Features

- Run queries on the active text editor with the command **"Run TSQueryPad on Document"**.
- Right-click any file in the Explorer and select **"Query This File with TSQueryPad"** to run a query.
- Rich editor with syntax highlighting and IntelliSense powered by Monaco Editor.
- Supports complex queries with generics, function arguments, and array transformations.
- Toggle visibility of helper methods and descriptions for quick reference.
- Lightweight and fast — no external tools required besides VS Code.

---

## Usage

1. Open any file in VS Code or right-click a file in the Explorer.
2. Run the **"Run TSQueryPad on Document"** command or use the context menu option.
3. Type your TypeScript/JavaScript query in the editor window that appears.
4. Use the `lines` array variable to access the file content line by line.
5. Click **Run** or press `Ctrl+Enter` to execute the query.
6. View the results immediately below the query editor.

---

## Example

```ts
// Find all distinct lines containing "TODO"
doc.lines.filter(line => line.includes("TODO")).distinct()

// or async
for await(const line of doc.linesAsync){
    if(line.includes('TODO'))
        yield line;
}
