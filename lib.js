const fs = require("fs")
const path = require("path")
const parser = require("@babel/parser")
const traverse = require("@babel/traverse").default

// Recursive directory reader to get all files within the directory and subdirectories
function readDirectory(directory) {
  let files = []
  fs.readdirSync(directory).forEach((file) => {
    const fullPath = path.join(directory, file)
    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(readDirectory(fullPath)) // Recursively read subdirectories
    } else if (
      fullPath.endsWith(".js") ||
      fullPath.endsWith(".jsx") ||
      fullPath.endsWith(".ts") ||
      fullPath.endsWith(".tsx")
    ) {
      files.push(fullPath) // Only include JavaScript/TypeScript files
    }
  })
  return files
}

// Function to parse a file to AST
function parseFileToAST(filePath) {
  const code = fs.readFileSync(filePath, "utf8")
  return parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  })
}

function findUnused(ast, filePath) {
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

  const exported = new Set()
  const imported = new Set()

  // Step 1: Traverse AST to find all declarations and exports
  traverse(ast, {
    VariableDeclarator(path) {
      const variableName = path.node.id.name
      declared.variables.add(variableName)
      unused.variables.add(variableName)
    },
    FunctionDeclaration(path) {
      const functionName = path.node.id.name
      declared.functions.add(functionName)
      unused.functions.add(functionName)
    },
    ExportNamedDeclaration(path) {
      if (path.node.declaration) {
        const declaration = path.node.declaration
        if (declaration.id) {
          const name = declaration.id.name
          exported.add(name)
        } else if (declaration.declarations) {
          declaration.declarations.forEach((decl) => exported.add(decl.id.name))
        }
      } else {
        path.node.specifiers.forEach((spec) => exported.add(spec.exported.name))
      }
    },
    ImportSpecifier(path) {
      imported.add(path.node.local.name)
    },
    JSXIdentifier(path) {
      const componentName = path.node.name
      declared.components.add(componentName)
      unused.components.add(componentName)
    },
  })

  // Step 2: Traverse again to find used references within this file
  traverse(ast, {
    Identifier(path) {
      const name = path.node.name
      if (
        path.parent.type !== "VariableDeclarator" &&
        path.parent.type !== "FunctionDeclaration" &&
        path.scope.hasBinding(name) // Verify binding in scope
      ) {
        if (declared.variables.has(name)) {
          unused.variables.delete(name)
        }
        if (declared.functions.has(name)) {
          unused.functions.delete(name)
        }
      }
    },
    CallExpression(path) {
      const callee = path.get("callee")
      if (callee.isIdentifier()) {
        const functionName = callee.node.name
        if (declared.functions.has(functionName)) {
          unused.functions.delete(functionName)
        }
      }
    },
    JSXIdentifier(path) {
      const componentName = path.node.name
      if (declared.components.has(componentName)) {
        unused.components.delete(componentName)
      }
    },
  })

  // Step 3: Detect unused exports by comparing with imports
  const unusedExports = [...exported].filter((name) => !imported.has(name))

  // Log with file path for better traceability
  console.log(`File: ${filePath}`)
  console.log("Unused variables:", Array.from(unused.variables))
  console.log("Unused functions:", Array.from(unused.functions))
  console.log("Unused components:", Array.from(unused.components))
  console.log("Unused exports:", unusedExports)

  return {
    filePath, // include the file path in the returned object
    variables: Array.from(unused.variables),
    functions: Array.from(unused.functions),
    components: Array.from(unused.components),
    exports: unusedExports,
  }
}

function listUnused(unusedItems) {
  console.log("Unused Variables:", unusedItems.variables)
  console.log("Unused Functions:", unusedItems.functions)
  console.log("Unused Components:", unusedItems.components)
  console.log("Unused Exports:", unusedItems.exports)
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
