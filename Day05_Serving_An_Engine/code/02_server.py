"""02 — serve the engine over HTTP: JSON, SSE streaming, chat completions.

FastAPI does routing/validation/JSON; the ENGINE thread does all math.
HTTP handlers never touch the model — they submit Requests and drain event queues.
That separation is the whole architecture (and why disconnects can abort cleanly).
"""
import asyncio
import json
import queue
import time

import importlib.util
import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse

_spec = importlib.util.spec_from_file_location(
    "engine01", os.path.join(os.path.dirname(os.path.abspath(__file__)), "01_engine.py"))
_eng = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_eng)
Engine, Params, get_tokenizer, CTX = _eng.Engine, _eng.Params, _eng.get_tokenizer, _eng.CTX

app = FastAPI(title="from-scratch engine", version="0.5.0")
engine = Engine()
tok = get_tokenizer()


@app.on_event("startup")
def _start():
    engine.start()


@app.on_event("shutdown")
def _stop():
    engine.shutdown()


def err(status, msg, typ="invalid_request_error"):
    return JSONResponse(status_code=status, content={"error": {"message": msg, "type": typ}})


def validate(body):
    prompt = body.get("prompt")
    if not isinstance(prompt, str) or not prompt:
        return None, err(400, "prompt must be a non-empty string")
    p = Params(
        max_tokens=int(body.get("max_tokens", 16)),
        temperature=float(body.get("temperature", 0.0)),
        top_k=int(body.get("top_k", 0)),
        top_p=float(body.get("top_p", 1.0)),
        seed=body.get("seed", None),
        stop=body.get("stop", None),
    )
    if not (1 <= p.max_tokens <= 256):
        return None, err(422, "max_tokens must be in [1, 256]")
    if p.temperature < 0:
        return None, err(422, "temperature must be >= 0 (0 = greedy)")
    if not (0 < p.top_p <= 1.0):
        return None, err(422, "top_p must be in (0, 1]")
    ids = tok.encode(prompt)
    if len(ids) + p.max_tokens > CTX:
        return None, err(400, f"context length exceeded: prompt has {len(ids)} tokens, "
                              f"max_tokens {p.max_tokens} would pass the {CTX} limit")
    return (ids, p), None


@app.get("/health")
def health():
    s = engine.stats()
    return {"status": "ok", "model": "gpt2 (numpy)", "ctx": CTX, **s}


@app.post("/v1/generate")
def generate(body: dict):
    ok, fail = validate(body)
    if fail:
        return fail
    ids, p = ok
    req = engine.submit(ids, p)
    pieces, n = [], 0
    while True:
        ev = req.events.get()
        if ev["token"] is not None:
            pieces.append(ev["text"]); n += 1
        if ev["done"]:
            break
    if req.error:
        return err(400, req.error)
    t_end = time.perf_counter()
    return {
        "id": f"gen-{req.id}",
        "text": "".join(pieces),
        "finish_reason": req.finish_reason,
        "usage": {"prompt_tokens": len(ids), "completion_tokens": n,
                  "total_tokens": len(ids) + n},
        "timings": {"ttft_ms": round((req.t_first - req.t_submit) * 1000, 1),
                    "total_ms": round((t_end - req.t_submit) * 1000, 1)},
    }


@app.post("/v1/generate/stream")
async def generate_stream(body: dict, request: Request):
    ok, fail = validate(body)
    if fail:
        return fail
    ids, p = ok
    req = engine.submit(ids, p)

    async def frames():
        try:
            while True:
                if await request.is_disconnected():   # poll: client hung up
                    break
                try:
                    ev = req.events.get_nowait()      # non-blocking: engine lives in its thread
                except queue.Empty:
                    await asyncio.sleep(0.005)
                    continue
                if ev["token"] is not None:
                    yield f"data: {json.dumps({'token': ev['token'], 'text': ev['text']})}\n\n"
                if ev["done"]:
                    yield f"data: {json.dumps({'done': True, 'finish_reason': req.finish_reason, 'error': req.error})}\n\n"
                    break
        finally:
            # disconnect OR completion: never leak the KV slot
            if req.state in ("QUEUED", "PREFILL", "DECODE"):
                engine.abort(req)

    return StreamingResponse(frames(), media_type="text/event-stream")


CHAT_TEMPLATE = "{history}Assistant:"           # GPT-2 has no chat template; mechanism demo


@app.post("/v1/chat/completions")
def chat(body: dict):
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        return err(400, "messages must be a non-empty list of {role, content}")
    history = ""
    for m in messages:
        role, content = m.get("role"), m.get("content", "")
        history += {"system": f"System: {content}\n",
                    "user": f"User: {content}\n",
                    "assistant": f"Assistant: {content}\n"}.get(role, "")
    body = dict(body)
    body["prompt"] = CHAT_TEMPLATE.format(history=history)
    out = generate(body)
    if isinstance(out, JSONResponse):
        return out
    return {
        "id": f"chatcmpl-{out['id']}",
        "object": "chat.completion",
        "choices": [{"index": 0,
                     "message": {"role": "assistant", "content": out["text"]},
                     "finish_reason": out["finish_reason"]}],
        "usage": out["usage"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8399, log_level="warning")
