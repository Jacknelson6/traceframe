import { createServer } from 'node:http';
export async function startFixture() {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(req.url);
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><title>Research fixture ${req.url}</title><style>
      body{font-family:system-ui;padding:30px;min-height:1600px} .pulse{width:100px;height:50px;background:blue;animation:pulse 2s infinite alternate}
      @keyframes pulse{from{opacity:.2;transform:translateX(0)}to{opacity:1;transform:translateX(40px)}}
      details[open] p{animation:reveal 1s ease} @keyframes reveal{from{opacity:0}to{opacity:1}}
    </style></head><body><h1>Research fixture</h1><div class="pulse"></div>
    <details><summary>Show details</summary><p>Visible disclosure content</p></details>
    <a href="/second">Second page</a><a href="/">Home</a><a href="/logout">Log out</a><a href="/delete">Delete</a>
    <a href="http://127.0.0.1:1/external">Outside origin</a><a href="/archive.pdf">Download</a>
    </body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {url: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise(resolve => server.close(resolve))};
}
