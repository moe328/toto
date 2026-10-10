# toto

React Todo app with a Node.js/Express backend and numeric task IDs.

## Backend

```sh
cd backend
npm install
npm start
```

Runs on http://localhost:3000. All four routes are in backend/routes/todos.js:

- GET /api.todos
- POST /api.todos
- PUT /api.todos/:id
- DELETE /api.todos/:id

Tasks are saved automatically in backend/data.json (excluded from Git).

## Frontend

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5174. Fetch URLs point directly to http://localhost:3000/api.todos.

## Validation

Run npm test in backend and npm run build in frontend.
