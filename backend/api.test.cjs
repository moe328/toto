const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-api-test-'));
  const file = path.join(directory, 'data.json');
  process.env.TODO_DATA_FILE = file;
  const app = require('./server');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api.todos`;
  const request = (method, suffix = '', body) => fetch(url + suffix, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5173' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    assert.deepEqual(await (await request('GET')).json(), []);
    const preflight = await request('OPTIONS');
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173');
    const response = await request('POST', '', { text: 'Test', completed: false, priority: 'Medium' });
    assert.equal(response.status, 201);
    let task = await response.json();
    assert.equal(task.id, 1);
    assert.equal(JSON.parse(fs.readFileSync(file))[0].id, task.id);
    for (const change of [{ completed: true }, { text: 'Edited' }, { priority: 'High' }]) {
      task = { ...task, ...change };
      assert.equal((await request('PUT', `/${task.id}`, task)).status, 200);
      assert.deepEqual(JSON.parse(fs.readFileSync(file))[0], task);
      assert.deepEqual((await (await request('GET')).json())[0], task);
    }
    assert.equal((await request('POST', '', { text: '' })).status, 400);
    assert.equal((await request('PUT', '/missing', task)).status, 404);
    assert.equal((await request('DELETE', `/${task.id}`)).status, 200);
    assert.equal((await request('DELETE', `/${task.id}`)).status, 404);
    for (let i = 0; i < 3; i++) await request('POST', '', { text: `Task ${i}` });
    for (const item of await (await request('GET')).json()) {
      assert.equal((await request('DELETE', `/${item.id}`)).status, 200);
    }
    assert.deepEqual(JSON.parse(fs.readFileSync(file)), []);
    fs.writeFileSync(file, JSON.stringify([
      { id: 2, text: 'Existing', completed: false, priority: 'Medium' },
      { id: 7, text: 'Higher ID', completed: false, priority: 'Medium' },
    ]));
    const nextTask = await (await request('POST', '', { text: 'Next task' })).json();
    assert.equal(nextTask.id, 8);
    assert.equal((await request('DELETE', '/2')).status, 200);
    const afterDelete = await (await request('POST', '', { text: 'After deletion' })).json();
    assert.equal(afterDelete.id, 9);
    fs.writeFileSync(file, 'broken');
    assert.equal((await request('GET')).status, 500);
    assert.equal(fs.readFileSync(file, 'utf8'), 'broken');
    console.log('PASS: GET, POST, PUT text/status/priority, DELETE, clear-all, persistence, validation, CORS, file errors.');
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(directory);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
