// Minimal CDP driver for the evidence pack — no dependencies (Node ≥22 native
// WebSocket). Talks to a headless Chrome launched with --remote-debugging-port.
// Usage:
//   node evidence/cdp.mjs nav <url>
//   node evidence/cdp.mjs eval '<js>'          (awaited, returnByValue)
//   node evidence/cdp.mjs buttons              (dump visible button texts)
//   node evidence/cdp.mjs click '<text>'       (click first visible button containing text)
//   node evidence/cdp.mjs shot <path>          (viewport PNG)
//   node evidence/cdp.mjs media reduce|no-preference
const PORT = process.env.CDP_PORT ?? '9222'

async function getTarget() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) throw new Error('no page target')
  return page
}

async function withClient(fn) {
  const target = await getTarget()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const mid = ++id
      pending.set(mid, (msg) => (msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)))
      ws.send(JSON.stringify({ id: mid, method, params }))
    })
  try {
    return await fn(send)
  } finally {
    ws.close()
  }
}

const [, , cmd, ...rest] = process.argv

await withClient(async (send) => {
  await send('Page.enable')
  await send('Runtime.enable')
  if (cmd === 'nav') {
    await send('Page.navigate', { url: rest[0] })
    console.log('navigated', rest[0])
  } else if (cmd === 'eval') {
    const r = await send('Runtime.evaluate', {
      expression: rest[0],
      awaitPromise: true,
      returnByValue: true,
    })
    console.log(JSON.stringify(r.result?.value ?? r, null, 0))
  } else if (cmd === 'buttons') {
    const r = await send('Runtime.evaluate', {
      expression: `JSON.stringify([...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null||e.getClientRects().length).map(e=>e.textContent.trim().replace(/\\s+/g,' ').slice(0,90)))`,
      returnByValue: true,
    })
    console.log(r.result.value)
  } else if (cmd === 'click') {
    const text = rest[0]
    const r = await send('Runtime.evaluate', {
      expression: `(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null||e.getClientRects().length);const el=els.find(e=>e.textContent.includes(${JSON.stringify(text)}));if(!el)return 'NOT FOUND';el.click();return 'clicked: '+el.textContent.trim().replace(/\\s+/g,' ').slice(0,90)})()`,
      returnByValue: true,
    })
    console.log(r.result.value)
  } else if (cmd === 'shot') {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    const { writeFileSync } = await import('node:fs')
    writeFileSync(rest[0], Buffer.from(r.data, 'base64'))
    console.log('saved', rest[0])
  } else if (cmd === 'media') {
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: rest[0] }],
    })
    console.log('media', rest[0])
  } else {
    console.error('unknown command', cmd)
    process.exit(1)
  }
})
