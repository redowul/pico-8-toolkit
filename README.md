# PICO-8 Token Tracker

A Visual Studio Code extension that displays the current token usage across your entire PICO-8 project directory. Ideal for keeping track of the 8192 token limit in multi-file `.p8` projects.

---

## Features

- ✅ Live token counting across all `.p8` files in the workspace
- ✅ Accurate parsing using rules aligned with PICO-8 tokenization
- ✅ Displays token count in the status bar
- ✅ Hovering the status bar shows a detailed breakdown by file
- ✅ Automatically updates when files are changed, opened, or saved

![Status bar token count](images/status-bar.png)
![Token breakdown tooltip](images/token-tooltip.png)

---

## Requirements

- VS Code 1.77+  
- Your `.p8` source files should be in the same directory as the workspace root

No additional dependencies required.

---

## Known Issues

- Token count does not update for new `.p8` files until they are saved or opened in the editor.
- Only top-level `.p8` files are tracked—subfolders are ignored for now.

---

## Release Notes

### 0.1.0

- Initial release
- Live token tracking and status bar output
- Breakdown tooltip with right-aligned counts

---

## License

[Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)  
You are free to use, modify, and share this project, with credit.

---

## Author

Created by [@redowul](https://github.com/redowul)
