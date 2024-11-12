// Export other modules for programmatic use
const {
  readDirectory,
  parseFileToAST,
  findUnused,
  listUnused,
  commentCode,
  deleteCode,
} = require("./lib") // Adjust the path if necessary

module.exports = {
  readDirectory,
  parseFileToAST,
  findUnused,
  listUnused,
  commentCode,
  deleteCode,
}
