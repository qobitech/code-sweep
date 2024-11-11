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
      console.log("Found VariableDeclarator:", variableName)
      declared.variables.add(variableName)
      unused.variables.add(variableName)
    },
    FunctionDeclaration(path) {
      const functionName = path.node.id.name
      console.log("Found FunctionDeclaration:", functionName)
      declared.functions.add(functionName)
      unused.functions.add(functionName)
    },
    JSXIdentifier(path) {
      const componentName = path.node.name
      declared.components.add(componentName)
      unused.components.add(componentName)
    },
  })

  // Step 2: Traverse again to find used references
  traverse(ast, {
    Identifier(path) {
      const name = path.node.name

      // Ignore identifiers that are part of their own declaration
      if (
        path.parent.type !== "VariableDeclarator" &&
        path.parent.type !== "FunctionDeclaration" &&
        path.scope.hasBinding(name) // Verify binding in scope
      ) {
        console.log("Identifier found:", name)
        if (declared.variables.has(name)) {
          unused.variables.delete(name)
          console.log("Variable in use:", name)
        }
        if (declared.functions.has(name)) {
          unused.functions.delete(name)
          console.log("Function in use:", name)
        }
      }
    },
    CallExpression(path) {
      const callee = path.get("callee")

      // Handle both direct function calls and object method calls
      if (callee.isIdentifier()) {
        const functionName = callee.node.name
        if (declared.functions.has(functionName)) {
          console.log("Function called:", functionName)
          unused.functions.delete(functionName)
        }
      } else if (
        callee.isMemberExpression() &&
        callee.get("object").isIdentifier()
      ) {
        const functionName = callee.get("object").node.name
        if (declared.functions.has(functionName)) {
          console.log("Function called (as method):", functionName)
          unused.functions.delete(functionName)
        }
      }
    },
    JSXIdentifier(path) {
      const componentName = path.node.name
      if (declared.components.has(componentName)) {
        console.log("JSX component found:", componentName)
        unused.components.delete(componentName)
      }
    },
  })

  console.log("Unused variables:", Array.from(unused.variables))
  console.log("Unused functions:", Array.from(unused.functions))
  console.log("Unused components:", Array.from(unused.components))

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

function commentCode(ast) {
  // Track declared and used identifiers
  const declaredVariables = new Set()
  const declaredFunctions = new Set()
  const usedIdentifiers = new Set()

  // Step 1: Collect declared variables and functions
  traverse(ast, {
    VariableDeclarator(path) {
      const variableName = path.node.id.name
      declaredVariables.add(variableName)
    },
    FunctionDeclaration(path) {
      const functionName = path.node.id.name
      declaredFunctions.add(functionName)
    },
    JSXIdentifier(path) {
      usedIdentifiers.add(path.node.name)
    },
  })

  // Step 2: Track identifiers that are actually used
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

  // Step 3: Modify code based on usage
  traverse(ast, {
    VariableDeclarator(path) {
      const variableName = path.node.id.name
      if (!usedIdentifiers.has(variableName)) {
        path.replaceWithSourceString(
          `/* TODO: Unused Variable \n${path.toString()}\n*/`
        )
      }
    },
    FunctionDeclaration(path) {
      const functionName = path.node.id.name
      if (!usedIdentifiers.has(functionName)) {
        // Wrap in comment block for entire function
        path.replaceWithSourceString(
          `/* TODO: Unused Function \n${path.toString()}\n*/`
        )
      }
    },
  })
}

function deleteCode(ast) {
  // Track declared and used identifiers within the current scope
  const declaredVariables = new Set()
  const declaredFunctions = new Set()
  const usedIdentifiers = new Set()

  function trackIdentifiers(path) {
    if (path.isVariableDeclarator()) {
      declaredVariables.add(path.node.id.name)
    } else if (path.isFunctionDeclaration()) {
      declaredFunctions.add(path.node.id.name)
    } else if (path.isIdentifier()) {
      if (
        declaredVariables.has(path.node.name) ||
        declaredFunctions.has(path.node.name)
      ) {
        usedIdentifiers.add(path.node.name)
      }
    }
  }

  traverse(ast, {
    enter(path) {
      // Clear sets at the beginning of each scope
      declaredVariables.clear()
      declaredFunctions.clear()
      usedIdentifiers.clear()

      trackIdentifiers(path)
    },
    Identifier(path) {
      trackIdentifiers(path)
    },
    exit(path) {
      if (path.isVariableDeclarator() || path.isFunctionDeclaration()) {
        const name = path.node.id.name
        if (!usedIdentifiers.has(name)) {
          path.remove()
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
  commentCode,
  deleteCode,
}
