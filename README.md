# CLI Code Cleanup Library

[![1.0.0](https://badge.fury.io/js/code-sweep.svg)](https://badge.fury.io/js/code-sweep)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Description

A command-line utility for analyzing JavaScript code, detecting unused variables and functions, and modifying code by listing, commenting, or deleting unused items based on the specified action.

## Features

- List unused code: Identify unused variables and functions without modifying the original files.
- Comment unused code: Automatically add comments to unused variables and functions, making them easy to review.
- Delete unused code: Remove all unused variables and functions from the codebase for optimized, clean code.

## Installation

Install the library globally or locally using npm:

```bash
# Globally

npm install -g code-sweep
```

```bash
# Locally (for project usage)

npm install code-sweep --save-dev
```

## Usage

After installation, use the CLI tool by specifying a directory and action.

```bash
code-sweep -d <directory_path> -a <action>
```

## CLI Options

```bash
-d, --directory <path> (required): Specifies the directory to analyze.
-a, --action <action> (required): Specifies the action to perform. Options:
list: List unused code without making changes.
comment: Add comments to unused code with // TODO: Unused Variable or // TODO: Unused Function.
delete: Remove unused code from the codebase.
```

## Examples

List Unused Code

```bash
code-sweep -d src -a list
```

Lists all unused variables and functions in the src directory.

Comment Unused Code

```bash
# Adds comments to unused variables and functions in the src directory.

code-sweep -d src -a comment
```

Delete Unused Code

```bash
# Deletes unused variables and functions from files in the src directory.

code-sweep -d src -a delete
```

## API

This library can also be used programmatically:

```bash
const { readDirectory, parseFileToAST, findUnused, commentCode, deleteCode } = require('code-sweep');

// Example: Read files in a directory and find unused code
const files = readDirectory('./src');
files.forEach((file) => {
  const ast = parseFileToAST(file);
  const unusedItems = findUnused(ast);
  console.log('Unused items:', unusedItems);
});
```

## License

This project is licensed under the MIT License.

## Contact

For issues, questions, or contributions, please reach out to edekobifrank@gmail.com
