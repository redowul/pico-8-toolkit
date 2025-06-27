# Change Log

### 1.3

- Added three new commands:
    - `PICO-8: Run` – launches PICO-8 with a specified .p8 file (single file only)
    - `PICO-8: Compile and Run` – merges selected files and immediately runs the result in PICO-8
    - `PICO-8: Stop` – stops the currently running PICO-8 process
- Changed "Auto-Compile" to "Compile" for clarity
- Added a new button to the file selection UI for the "Compile and Run" command

### 1.2

- Token count now calculates the sum of all selected .p8 files, regardless of directory
- Combined file export now strips `#include` statements from output

### 1.1

- Add interactive file selector UI
- Add file combination and export to `.p8`
- Add `--->8` separator for combined output
- Add support for auto-compiling to a preset path

### 1.0

- Initial release
- Live token tracking and status bar output
- Breakdown tooltip with right-aligned counts