import React from 'react'
import { Callout, Code, Term, Tbl, R } from '../../components/ui.jsx'

const RESP = `{
  "id": "gen-1",
  "text": " the most powerful machines on the planet.",
  "finish_reason": "length",
  "usage": { "prompt_tokens": 10, "completion_tokens": 8, "total_tokens": 18 },
  "timings": { "ttft_ms": 551.1, "total_ms": 844.1 }
}`

const CHAT_CODE = `# POST /v1/chat/completions — messages become a prompt
messages = [{"role": "system",    "content": "You complete sentences."},
            {"role": "user",      "content": "Alan Turing theorized that ... become"}]

rendered prompt (template is model-family config — Day 2):
  "System: You complete sentences.\\nUser: Alan Turing theorized that ... become\\nAssistant:"

-> tokenize -> the SAME /v1/generate pipeline -> wrap in chat.completion JSON`

const OUT = [
  ['p', '[health]   {status: ok, model: gpt2 (numpy), ctx: 1024, waiting: 0, running: 0}'],
  ['ok', "[generate] text=' the most powerful machines on the planet.' finish=length"],
  ['dim', '           usage={prompt:10, completion:8, total:18} timings={ttft:551ms, total:844ms}'],
  ['ok', '[seed]     seed=42 twice -> identical: True | seed=7 -> different: True'],
  ['ok', "[stream]   8 token frames, first=' the', last='.'; done frame finish=length"],
  ['ok', "[chat]     assistant content=' A computer would be able to do things'"],
  ['ok', '[errors]   overflow -> 400 with JSON body | temperature=-1 -> 422'],
  ['ok', '[concur]   4 simultaneous golden requests: all correct in 1.4s'],
  ['ok', '[abort]    after disconnect: slot freed = True (running=0)'],
  ['ok', 'CHECKSUM: PASS -- golden continuation over HTTP, streamed, under load.'],
]

export default function S3_API() {
  return (
    <>
      <h2 id="api">The API — a contract in JSON</h2>
      <p className="sub">
        <code className="inline">POST /v1/generate</code> with a prompt and sampling params; get back
        text, usage, timings, and a finish reason. Here is a <strong>real response</strong> from our
        server (captured by the test suite):
      </p>
      <Code title="real response body — POST /v1/generate">{RESP}</Code>

      <h3>Validation is a pre-compute gate</h3>
      <Tbl head={['check', 'bad input', 'response', 'why before compute']}>
        <R cells={['prompt type/emptiness', '<code class="inline">{"prompt": 42}</code>', '400', 'tokenizing garbage wastes a slot']} monoCols={[1]} />
        <R cells={['context budget', '1,001-token prompt + max_tokens 64', '<strong>400</strong>', 'IndexError at token 1,024 = a crashed request 30 s in']} monoCols={[1,2]} />
        <R cells={['temperature range', '<code class="inline">-1</code>', '<strong>422</strong>', 'negative temperature is meaningless']} monoCols={[1]} />
        <R cells={['top_p range', '<code class="inline">1.5</code>', '<strong>422</strong>', 'probability mass cannot exceed 1']} monoCols={[1]} />
        <R cells={['max_tokens range', '<code class="inline">0</code> or 10,000', '<strong>422</strong>', 'bounds protect the pool from absurd reservations']} monoCols={[1]} />
      </Tbl>
      <p className="sub">
        Error responses carry a JSON body (<code className="inline">{'{"error": {"message": ..., "type": ...}}'}</code>),
        not a traceback. A stack trace after 30 seconds of generation is a crashed request; a 400
        before any FLOP is a served error.
      </p>

      <h3>Chat completions: messages → template → the same pipeline</h3>
      <Code title="the OpenAI-compatible shape, reduced to its mechanism">{CHAT_CODE}</Code>
      <p className="sub">
        The chat endpoint adds nothing mathematical — it renders messages into a prompt string via a
        template (the Day-2 artifact), runs the identical pipeline, and re-wraps the answer. Our
        GPT-2 replies <em>' A computer would be able to do things'</em> — the plumbing is correct; GPT-2
        simply isn't chat-trained. <strong>Test the plumbing, not the prose.</strong>
      </p>

      <h3>The full test suite, over real HTTP</h3>
      <Term title="code/03_client_tests.py — verified output" lines={OUT} />

      <Callout kind="disc" title="Seeds are per-request state, not global">
        <code className="inline">seed=42</code> twice → byte-identical text; <code className="inline">seed=7</code> → different
        text. This only works because each request owns its <code className="inline">default_rng(seed)</code>.
        A shared global RNG (gallery entry #4) makes "same seed, same output" depend on what other
        users are doing — a reproducibility leak that looks fine in single-user testing.
      </Callout>
      <div className="divider" />
    </>
  )
}
