const fs = require("fs")
const path = require("path")
const {
  readDirectory,
  parseFileToAST,
  findUnused,
  listUnused,
  commentCode,
  deleteCode,
} = require("../lib")

describe("Code Sweep Utility Tests", () => {
  // Sample files and ASTs for testing
  const testDir = path.join(__dirname, "sampleFiles")

  beforeAll(() => {
    // Setup sample files in the test directory for testing if necessary
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir)
    }

    // Create some test files with unused variables, functions, etc.
    fs.writeFileSync(
      path.join(testDir, "testFile.js"),
      `
      const unusedVariable = 10;
      function unusedFunction() {}
      const usedVariable = 20;
      function usedFunction() { return usedVariable; }
      usedFunction()
    `
    )
  })

  afterAll(() => {
    // Cleanup sample files
    fs.rmdirSync(testDir, { recursive: true })
  })

  test("readDirectory should return JavaScript and TypeScript files", () => {
    const files = readDirectory(testDir)
    expect(files).toContain(path.join(testDir, "testFile.js"))
  })

  test("parseFileToAST should parse file to AST without errors", () => {
    const filePath = path.join(testDir, "testFile.js")
    const ast = parseFileToAST(filePath)
    expect(ast).toBeDefined()
    expect(ast.type).toBe("File")
  })

  test("findUnused should detect unused variables and functions", () => {
    const filePath = path.join(testDir, "testFile.js")
    const ast = parseFileToAST(filePath)
    const unusedItems = findUnused(ast)

    expect(unusedItems.variables).toContain("unusedVariable")
    expect(unusedItems.functions).toContain("unusedFunction")
    expect(unusedItems.variables).not.toContain("usedVariable")
    expect(unusedItems.functions).not.toContain("usedFunction")
  })

  test("listUnused should output unused items to console", () => {
    console.log = jest.fn()
    const unusedItems = {
      variables: ["unusedVariable"],
      functions: ["unusedFunction"],
      components: [],
    }

    listUnused(unusedItems)

    expect(console.log).toHaveBeenCalledWith("Unused Variables:", [
      "unusedVariable",
    ])
    expect(console.log).toHaveBeenCalledWith("Unused Functions:", [
      "unusedFunction",
    ])
  })

  test("modifyCode should delete out unused code based on action", () => {
    const filePath = path.join(testDir, "testFile.js")

    // Test delete action
    const ast = parseFileToAST(filePath)
    deleteCode(ast)

    // Check that unusedVariable and unusedFunction were removed
    let editModifiedUnused = findUnused(ast)
    expect(editModifiedUnused.variables).not.toContain("unusedVariable")
    expect(editModifiedUnused.functions).not.toContain("unusedFunction")
  })

  test("modifyCode should comment out unused code based on action", () => {
    const filePath = path.join(testDir, "testFile.js")

    // Reload AST for comment action
    const astForComment = parseFileToAST(filePath)
    commentCode(astForComment)

    // Check that comments were added to unusedVariable and unusedFunction
    let modifiedUnused = findUnused(astForComment)
    expect(modifiedUnused.variables).toContain("unusedVariable") // Comment should preserve the variable
    expect(modifiedUnused.functions).toContain("unusedFunction") // Comment should preserve the function
  })
})
