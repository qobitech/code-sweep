const fs = require("fs")
const { program } = require("commander")
const generate = require("@babel/generator").default
const {
  readDirectory,
  parseFileToAST,
  findUnused,
  listUnused,
  commentCode,
  deleteCode,
} = require("./index")

// Set up CLI options
program
  .option("-d, --directory <path>", "directory to analyze")
  .option("-a, --action <action>", "action to perform (list, comment, delete)")
  .parse(process.argv)

const options = program.opts()

// Process each file in the directory
const files = readDirectory(options.directory || "./")
files.forEach((file) => {
  const ast = parseFileToAST(file)
  const unusedItems = findUnused(ast)

  if (options.action === "list") {
    // List unused items without modifying the file
    listUnused(unusedItems)
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
