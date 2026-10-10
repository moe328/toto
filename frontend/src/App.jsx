import React, { useEffect, useState } from "react";

const priorities = ["Low", "Medium", "High"];

async function readResponse(response, fallbackMessage) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || fallbackMessage);
  }
  if (response.status === 204) return null;
  return response.json();
}

export default function TodoList() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("http://localhost:3000/api.todos", { method: "GET", signal: controller.signal })
      .then(response => readResponse(response, "Could not load tasks."))
      .then(todos => {
        if (!Array.isArray(todos)) throw new Error("The API must return an array of tasks.");
        setTasks(todos);
      })
      .catch(error => {
        if (error.name !== "AbortError") setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function addTask(event) {
    event.preventDefault();
    const text = taskText.trim();
    if (!text || saving) return;
    setError("");
    setSaving(true);
    try {
      const response = await fetch("http://localhost:3000/api.todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, completed: false, priority: newPriority }),
      });
      const savedTask = await readResponse(response, "Could not add task.");
      setTasks(current => [...current, savedTask]);
      setTaskText("");
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(id) {
    const task = tasks.find(task => task.id === id);
    if (!task || saving) return false;
    const updatedTask = { ...task, completed: !task.completed };
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`http://localhost:3000/api.todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });
      const savedTask = await readResponse(response, "Could not update task.");
      setTasks(current => current.map(task => task.id === id ? savedTask : task));
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function startEditing(task) {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const response = await fetch("http://localhost:3000/api.todos", { method: "GET" });
      const todos = await readResponse(response, "Could not load task for editing.");
      if (!Array.isArray(todos)) throw new Error("The API must return an array of tasks.");
      const savedTask = todos.find(item => String(item.id) === String(task.id));
      if (!savedTask) throw new Error("Task no longer exists.");
      setTasks(current => current.map(item => item.id === task.id
        ? { ...item, ...savedTask, id: task.id } : item));
      setEditingId(task.id);
      setEditText(savedTask.text);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePriority(id, priority) {
    await saveTask(null, id, { priority });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditText("");
  }

  async function saveTask(event, id, changes = null) {
    event?.preventDefault();
    const task = tasks.find(task => task.id === id);
    if (!task || saving) return;
    if (!changes && !editText.trim()) return;
    const updatedTask = { ...task, ...(changes || { text: editText.trim() }) };
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`http://localhost:3000/api.todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });
      const savedTask = await readResponse(response, "Could not save task.");
      setTasks(current => current.map(task => task.id === id ? savedTask : task));
      if (!changes) cancelEditing();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(id) {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`http://localhost:3000/api.todos/${id}`, {
        method: "DELETE",
      });
      await readResponse(response, "Could not delete task.");
      setTasks(current => current.filter(task => task.id !== id));
      if (editingId === id) cancelEditing();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function clearAllTasks() {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      for (const task of tasks) {
        const response = await fetch(`http://localhost:3000/api.todos/${task.id}`, {
          method: "DELETE",
        });
        await readResponse(response, "Could not delete all tasks. Remaining tasks were kept.");
        setTasks(current => current.filter(item => item.id !== task.id));
        if (editingId === task.id) cancelEditing();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  // A task must match BOTH the search text and the selected status.
  const visibleTasks = tasks.filter((task) => {
    const matchesSearch = task.text.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = filter === "All"
      || (filter === "Completed" && task.completed)
      || (filter === "Uncompleted" && !task.completed);
    return matchesSearch && matchesStatus;
  });

  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <>
      <section className="task-panel" aria-label="Manage tasks"><fieldset disabled={loading || saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <form onSubmit={addTask}>
          <label htmlFor="new-task">New task</label>
          <div className="add-row">
            <input
              id="new-task"
              value={taskText}
              onChange={(event) => setTaskText(event.target.value)}
              placeholder="Enter a task"
              autoComplete="off"
            />
            <select
              aria-label="New task priority"
              value={newPriority}
              onChange={(event) => setNewPriority(event.target.value)}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
            <button className="add-button" disabled={!taskText.trim()}>Add</button>
          </div>
        </form>

        <div className="search-section">
          <label htmlFor="search">Search tasks</label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks"
          />
        </div>

        <div className="filters" role="group" aria-label="Task filters and actions">
          {["All", "Completed", "Uncompleted"].map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
          <button
            type="button"
            className="delete-button"
            onClick={clearAllTasks}
            disabled={tasks.length === 0}
          >
            Clear all
          </button>
        </div>

        {loading ? <p role="status">Loading tasks…</p> : visibleTasks.length > 0 ? (
          <ul className="task-list">
            {visibleTasks.map((task) => (
              <li className="task-row" key={task.id}>
                {editingId === task.id ? (
                  <form className="edit-form" onSubmit={(event) => saveTask(event, task.id)}>
                    <input
                      aria-label="Edit task"
                      value={editText}
                      onChange={(event) => setEditText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") cancelEditing();
                      }}
                      autoFocus
                    />
                    <button type="submit" disabled={!editText.trim()}>Save</button>
                    <button type="button" onClick={cancelEditing}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <label className={task.completed ? "task completed" : "task"}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                      />
                      <span>{task.text}</span>
                    </label>
                    <button type="button" onClick={() => startEditing(task)}>
                      Edit
                    </button>
                  </>
                )}
                <select
                  aria-label={`Priority for ${task.text}`}
                  value={task.priority}
                  onChange={(event) => changePriority(task.id, event.target.value)}
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
                <button type="button" className="delete-button" onClick={() => deleteTask(task.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state" role="status">
            <p>{tasks.length === 0
              ? "No tasks yet."
              : "No matching tasks. Try another search or filter."}</p>
          </div>
        )}

        <footer aria-live="polite">
          <span>{tasks.length - completedCount} remaining</span>
          <span>{completedCount} of {tasks.length} completed</span>
        </footer>
      </fieldset></section>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="session-note" role="status">
        {saving ? "Saving…" : "Changes are saved through the API."}
      </p>
    </>
  );
}
