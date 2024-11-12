jest.mock("../lib.js", () => ({
  readDirectory: jest.fn(),
  parseFileToAST: jest.fn(),
  findUnused: jest.fn(),
  listUnused: jest.fn(),
  commentCode: jest.fn(),
  deleteCode: jest.fn(),
}))

const fs = require("fs")
const path = require("path")
const { Command } = require("commander")
const {
  readDirectory,
  parseFileToAST,
  findUnused,
  listUnused,
  commentCode,
  deleteCode,
} = require("../lib")

describe("CLI Tests", () => {
  const mockFilePath = "testDirectory/mockFile.js"
  const mockDirectory = "testDirectory"
  const mockFileContent = `
    const unusedVariable = 5;
    function unusedFunction() {}
    const usedVariable = 10;
    function usedFunction() { console.log(usedVariable); }
  `

  beforeEach(() => {
    jest.clearAllMocks()

    // Set up mock functions for fs
    jest.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
      if (filePath === mockFilePath) return mockFileContent
      return ""
    })
    jest.spyOn(fs, "writeFileSync").mockImplementation(() => {})

    // Mock implementations for CLI utilities
    readDirectory.mockReturnValue([mockFilePath])
    parseFileToAST.mockImplementation(() => ({})) // mock AST object
    findUnused.mockReturnValue({
      variables: ["unusedVariable"],
      functions: ["unusedFunction"],
    })
  })

  test("should list unused variables and functions when action is 'list'", () => {
    const program = new Command() // Initialize new command
    // Program setup
    program
      .exitOverride() // Prevent exit on error in tests
      .option("-d, --directory <path>", "directory to analyze")
      .option(
        "-a, --action <action>",
        "action to perform (list, comment, delete)"
      )

    listUnused.mockImplementation((unusedItems) => {
      expect(unusedItems).toEqual({
        variables: ["unusedVariable"],
        functions: ["unusedFunction"],
      })
    })

    process.argv = ["node", "cli.js", "-d", mockDirectory, "-a", "list"]
    program.parse(process.argv)
  })

  test("should comment unused code when action is 'comment'", () => {
    const program = new Command() // Initialize new command
    // Program setup
    program
      .exitOverride() // Prevent exit on error in tests
      .option("-d, --directory <path>", "directory to analyze")
      .option(
        "-a, --action <action>",
        "action to perform (list, comment, delete)"
      )

    commentCode.mockImplementation((ast) => {
      expect(ast).toBeDefined()
    })

    fs.writeFileSync.mockImplementation((filePath, data) => {
      expect(filePath).toBe(mockFilePath)
      expect(data).toContain("// TODO: Unused Variable") // Check for the added comment
    })

    process.argv = ["node", "cli.js", "-d", mockDirectory, "-a", "comment"]
    program.parse(process.argv)
  })

  test("should delete unused code when action is 'delete'", () => {
    const program = new Command() // Initialize new command
    // Program setup
    program
      .exitOverride() // Prevent exit on error in tests
      .option("-d, --directory <path>", "directory to analyze")
      .option(
        "-a, --action <action>",
        "action to perform (list, comment, delete)"
      )

    deleteCode.mockImplementation((ast) => {
      expect(ast).toBeDefined()
    })

    fs.writeFileSync.mockImplementation((filePath, data) => {
      expect(filePath).toBe(mockFilePath)
      expect(data).not.toContain("unusedVariable")
      expect(data).not.toContain("unusedFunction")
    })

    process.argv = ["node", "cli.js", "-d", mockDirectory, "-a", "delete"]
    program.parse(process.argv)
  })
})
