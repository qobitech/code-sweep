#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { program } = require("commander")
const generate = require("@babel/generator").default
const {
  readDirectory,
  parseFileToAST,
  findUnused,
  listUnused,
  commentCode,
  deleteCode,
} = require("./lib")

// Set up CLI options
program
  .option("-d, --directory <path>", "directory to analyze")
  .option("-a, --action <action>", "action to perform (list, comment, delete)")
  .parse(process.argv)

const options = program.opts()
const directory = options.directory || "./"

// Process each file in the directory recursively
const files = readDirectory(directory)
files.forEach((file) => {
  const ast = parseFileToAST(file)
  const unusedItems = findUnused(ast, file) // Pass file path for logging and traceability

  if (options.action === "list") {
    // List unused items without modifying the file
    listUnused(unusedItems, file)
  } else if (options.action === "comment" || options.action === "delete") {
    // Modify the AST based on the action
    if (options.action === "comment") {
      commentCode(ast)
    }

    if (options.action === "delete") {
      deleteCode(ast)
    }

    // Convert the modified AST back to code
    const modifiedCode = generate(ast, {}, fs.readFileSync(file, "utf8")).code

    // Write the modified code back to the original file
    fs.writeFileSync(file, modifiedCode)
  }
})
