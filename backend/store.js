const fs = require("node:fs");
const path = require("node:path");

const dataFile = process.env.TODO_DATA_FILE || path.join(__dirname, "data.json");
const priorities = ["Low", "Medium", "High"];

function readTodos() {
  let contents;
  try {
    contents = fs.readFileSync(dataFile, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const todos = JSON.parse(contents);
  if (!Array.isArray(todos)) throw new Error("data.json must contain an array");
  return todos.map(todo => ({ ...todo, priority: todo.priority || "Medium" }));
}

function saveTodos(todos) {
  const temporaryFile = `${dataFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(todos, null, 2) + "\n", "utf8");
  fs.renameSync(temporaryFile, dataFile);
}

function validTodo(todo) {
  return todo && typeof todo.text === "string" && todo.text.trim()
    && typeof todo.completed === "boolean" && priorities.includes(todo.priority);
}

module.exports = { readTodos, saveTodos, validTodo };
