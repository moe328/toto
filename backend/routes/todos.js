const router = require("express").Router();
const { readTodos, saveTodos, validTodo } = require("../store");

router.get("/api.todos", (req, res) => {
  try {
    res.json(readTodos());
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not read data.json" });
  }
});


router.post("/api.todos", (req, res) => {
  try {
    const { text, completed = false, priority = "Medium" } = req.body || {};
    if (!validTodo({ text, completed, priority })) {
      return res.status(400).json({ message: "Send text, completed (boolean), and priority (Low, Medium, High)" });
    }
    const todos = readTodos();
    const nextId = todos.reduce((highestId, task) => {
      const id = Number(task.id);
      return Number.isSafeInteger(id) && id > highestId ? id : highestId;
    }, 0) + 1;
    const todo = { id: nextId, text: text.trim(), completed, priority };
    todos.push(todo);
    saveTodos(todos);
    res.status(201).json(todo);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not save task" });
  }
});


router.put("/api.todos/:id", (req, res) => {
  try {
    const todos = readTodos();
    const index = todos.findIndex(todo => String(todo.id) === req.params.id);
    if (index === -1) return res.status(404).json({ message: "Todo not found" });
    const { text, completed, priority } = req.body || {};
    if (!validTodo({ text, completed, priority })) {
      return res.status(400).json({ message: "Send text, completed (boolean), and priority (Low, Medium, High)" });
    }
    todos[index] = { ...todos[index], text: text.trim(), completed, priority };
    saveTodos(todos);
    res.json(todos[index]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not update task" });
  }
});


router.delete(["/api.todos/:id", "/todos/:id"], (req, res) => {
  try {
    const todos = readTodos();
    const index = todos.findIndex(todo => String(todo.id) === req.params.id);
    if (index === -1) return res.status(404).json({ message: "Todo not found" });
    const [todo] = todos.splice(index, 1);
    saveTodos(todos);
    res.json({ message: "Todo deleted successfully", todo });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not delete task" });
  }
});


module.exports = router;
