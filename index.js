// index.js
const fs = require("fs")
const path = require("path")
const parser = require("@babel/parser")
const traverse = require("@babel/traverse").default

// Function to read all files in a directory
function readDirectory(dir) {
  const files = fs.readdirSync(dir)
  const jsFiles = files.filter(
    (file) =>
      file.endsWith(".js") ||
      file.endsWith(".jsx") ||
      file.endsWith(".ts") ||
      file.endsWith(".tsx")
  )
  return jsFiles.map((file) => path.join(dir, file))
}

// Function to parse a file to AST
function parseFileToAST(filePath) {
  const code = fs.readFileSync(filePath, "utf8")
  return parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  })
}

function findUnused(ast) {
  const unused = {
    variables: new Set(),
    functions: new Set(),
    components: new Set(),
  }
  const declared = {
    variables: new Set(),
    functions: new Set(),
    components: new Set(),
  }

  // Step 1: Traverse AST to find all declarations
  traverse(ast, {
    VariableDeclarator(path) {
      const variableName = path.node.id.name
      declared.variables.add(variableName)
      unused.variables.add(variableName) // Start assuming it's unused
    },
    FunctionDeclaration(path) {
      const functionName = path.node.id.name
      declared.functions.add(functionName)
      unused.functions.add(functionName)
    },
    JSXIdentifier(path) {
      // Add component detection logic
      const componentName = path.node.name
      declared.components.add(componentName)
      unused.components.add(componentName)
    },
  })

  // Step 2: Traverse AST again to find used references
  traverse(ast, {
    Identifier(path) {
      const name = path.node.name
      if (declared.variables.has(name)) unused.variables.delete(name)
      if (declared.functions.has(name)) unused.functions.delete(name)
    },
    JSXIdentifier(path) {
      const componentName = path.node.name
      if (declared.components.has(componentName))
        unused.components.delete(componentName)
    },
  })

  return {
    variables: Array.from(unused.variables),
    functions: Array.from(unused.functions),
    components: Array.from(unused.components),
  }
}

function listUnused(unusedItems) {
  console.log("Unused Variables:", unusedItems.variables)
  console.log("Unused Functions:", unusedItems.functions)
  console.log("Unused Components:", unusedItems.components)
}

function modifyCode(ast, action) {
  // Step 1: Track declared variables and functions
  const declaredVariables = new Set()
  const declaredFunctions = new Set()
  const usedIdentifiers = new Set()

  // First traversal to gather all declared identifiers
  traverse(ast, {
    VariableDeclarator(path) {
      const variableName = path.node.id.name
      declaredVariables.add(variableName)
    },
    FunctionDeclaration(path) {
      const functionName = path.node.id.name
      declaredFunctions.add(functionName)
    },
    // Track JSX components as well
    JSXIdentifier(path) {
      usedIdentifiers.add(path.node.name)
    },
  })

  // Second traversal to track used identifiers
  traverse(ast, {
    Identifier(path) {
      if (
        declaredVariables.has(path.node.name) ||
        declaredFunctions.has(path.node.name)
      ) {
        usedIdentifiers.add(path.node.name)
      }
    },
  })

  // Step 3: Modify code based on unused status
  traverse(ast, {
    VariableDeclarator(path) {
      const variableName = path.node.id.name
      if (!usedIdentifiers.has(variableName)) {
        // Variable is unused
        if (action === "delete") {
          path.remove()
        } else if (action === "comment") {
          path.addComment("leading", " TODO: Unused Variable")
        }
      }
    },
    FunctionDeclaration(path) {
      const functionName = path.node.id.name
      if (!usedIdentifiers.has(functionName)) {
        // Function is unused
        if (action === "delete") {
          path.remove()
        } else if (action === "comment") {
          path.addComment("leading", " TODO: Unused Function")
        }
      }
    },
  })
}

module.exports = {
  readDirectory,
  parseFileToAST,
  findUnused,
  listUnused,
  modifyCode,
}
