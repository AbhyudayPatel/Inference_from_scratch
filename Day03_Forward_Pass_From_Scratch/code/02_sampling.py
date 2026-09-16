"""02 — SAMPLING: logits -> next ID.

The forward pass produces 50,257 unnormalized scores. This file turns them into
choices using exactly the knobs exposed by vLLM/SGLang/OpenAI APIs:
  greedy      -> temperature=0
  temperature -> SamplingParams.temperature
  top-k       -> SamplingParams.top_k
  top-p       -> SamplingParams.top_p (nucleus sampling)

No library sampler: every probability operation is shown.
"""

import importlib.util
import numpy as np

spec = importlib.util.spec_from_file_location("core", r"Day03_Forward_Pass_From_Scratch\code\01_forward.py")
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)


def probs_from_logits(logits, temperature=1.0):
    """stable softmax; temperature stretches/flattens the distribution."""
    z = logits / temperature
    z = z - z.max()
    p = np.exp(z)
    return p / p.sum()


def sample_greedy(logits, rng=None):
    return int(np.argmax(logits))


def sample_temperature(logits, temperature, rng):
    return int(rng.choice(len(logits), p=probs_from_logits(logits, temperature)))


def sample_top_k(logits, k, temperature, rng):
    # Keep only the k largest logits. Everything else has probability zero.
    keep = np.argpartition(logits, -k)[-k:]
    masked = np.full_like(logits, -np.inf)
    masked[keep] = logits[keep]
    return int(rng.choice(len(logits), p=probs_from_logits(masked, temperature)))


def sample_top_p(logits, p, temperature, rng):
    # Sort by probability; retain the smallest prefix whose mass >= p.
    probs = probs_from_logits(logits, temperature)
    order = np.argsort(probs)[::-1]
    cumulative = np.cumsum(probs[order])
    cutoff = np.searchsorted(cumulative, p) + 1
    keep = order[:cutoff]
    masked = np.full_like(logits, -np.inf)
    masked[keep] = logits[keep]
    return int(rng.choice(len(logits), p=probs_from_logits(masked, temperature)))


def generate(prompt, sampler, steps=7, seed=42):
    ids = core.tok.encode(prompt)
    out = []
    rng = np.random.default_rng(seed)
    for _ in range(steps):
        logits = core.forward(ids)[-1]
        nxt = sampler(logits, rng)
        ids.append(nxt)
        out.append(nxt)
    return core.tok.decode(out)


prompt = "The future of artificial intelligence is"
print("prompt:", repr(prompt))
print("\n=== SAME LOGITS, FOUR POLICIES ===")

strategies = [
    ("greedy (argmax)", lambda z, r: sample_greedy(z)),
    ("temperature=0.8", lambda z, r: sample_temperature(z, 0.8, r)),
    ("top-k=40, temp=0.9", lambda z, r: sample_top_k(z, 40, 0.9, r)),
    ("top-p=0.90, temp=0.9", lambda z, r: sample_top_p(z, 0.90, 0.9, r)),
]
for name, fn in strategies:
    completion = generate(prompt, fn, seed=123)
    print(f"{name:<24} -> {ascii(completion)}")

# Show distribution mechanics once, without generating more tokens.
logits = core.forward(core.tok.encode(prompt))[-1]
for temp in (0.5, 1.0, 1.5):
    p = probs_from_logits(logits, temp)
    order = np.argsort(p)[-5:][::-1]
    shown = ", ".join(f"{ascii(core.tok.decode([i]))}:{p[i]:.3f}" for i in order)
    entropy = -float(np.sum(p[p > 0] * np.log(p[p > 0])))
    print(f"temp={temp:.1f}  entropy={entropy:.2f} nats  top-5: {shown}")

print("\n=== ENGINE API MAP ===")
print("greedy         vLLM: SamplingParams(temperature=0)     SGLang: temperature=0")
print("temperature    vLLM: SamplingParams(temperature=T)     OpenAI: temperature=T")
print("top-k          vLLM: SamplingParams(top_k=K)           SGLang: top_k=K")
print("top-p          vLLM: SamplingParams(top_p=P)           OpenAI: top_p=P")
print("seed           vLLM: SamplingParams(seed=N)            reproducibility contract")
print("NOTE: all policies consume THE SAME logits. Sampling changes choice, never model math.")
