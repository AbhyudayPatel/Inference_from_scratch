"""
Part 1 — Parse .safetensors BY HAND (no safetensors library, no torch).

Format:
    [0:8]                uint64 little-endian  -> N = header length in bytes
    [8 : 8+N]            UTF-8 JSON            -> {tensor_name: {dtype, shape, data_offsets}}
    [8+N :]              raw bytes             -> the actual tensor data ("the buffer")

data_offsets = [begin, end] are byte offsets RELATIVE TO THE START OF THE BUFFER
(not the start of the file). Absolute file offset = 8 + N + begin.
"""

import json
import struct
import numpy as np

# safetensors dtype string -> numpy dtype.
# NOTE: BF16 (bfloat16) has NO native numpy dtype — GPT-2 is F32 so we don't
# hit it today, but Llama & friends are BF16. That's a Day-3 problem.
DTYPE_MAP = {
    "F64": np.float64,
    "F32": np.float32,
    "F16": np.float16,
    "I64": np.int64,
    "I32": np.int32,
    "I16": np.int16,
    "I8":  np.int8,
    "U8":  np.uint8,
    "BOOL": np.bool_,
    # "BF16": ???  # not representable in numpy — needs manual bit tricks
}


def read_header(path):
    """Read only the JSON header. Never touches the big byte buffer."""
    with open(path, "rb") as f:
        # Step 1: first 8 bytes -> header length N (little-endian unsigned 64-bit)
        (n,) = struct.unpack("<Q", f.read(8))

        # Step 2: next N bytes -> JSON directory of every tensor in the file
        header = json.loads(f.read(n).decode("utf-8"))

    return header, n


def load_safetensors(path):
    """Load ALL tensors into a dict {name: np.ndarray}.

    Returns (tensors, metadata).
    """
    with open(path, "rb") as f:
        (n,) = struct.unpack("<Q", f.read(8))
        header = json.loads(f.read(n).decode("utf-8"))
        buffer = f.read()  # everything after the header = the raw byte buffer

    metadata = header.pop("__metadata__", None)

    tensors = {}
    for name, info in header.items():
        begin, end = info["data_offsets"]          # relative to buffer start
        raw = buffer[begin:end]                    # slice out this tensor's bytes
        arr = np.frombuffer(raw, dtype=DTYPE_MAP[info["dtype"]])
        tensors[name] = arr.reshape(info["shape"]) # bytes -> shaped array

    return tensors, metadata


def main():
    path = "models/model.safetensors"

    # ---- 1.1: header inventory ------------------------------------------------
    header, n = read_header(path)
    metadata = header.pop("__metadata__", None)

    print(f"header size N = {n} bytes")
    print(f"metadata      = {metadata}")
    print(f"tensor count  = {len(header)}\n")

    print(f"{'TENSOR NAME':<35} {'DTYPE':<6} {'SHAPE':<18} {'BYTES':>12}")
    print("-" * 75)
    total_bytes = 0
    for name, info in sorted(header.items()):
        b, e = info["data_offsets"]
        total_bytes += e - b
        print(f"{name:<35} {info['dtype']:<6} {str(info['shape']):<18} {e-b:>12,}")
    print("-" * 75)
    print(f"total tensor bytes = {total_bytes:,}")

    # ---- 1.2: actually load + param count ------------------------------------
    tensors, _ = load_safetensors(path)
    total_params = sum(t.size for t in tensors.values())
    print(f"\ntotal parameters   = {total_params:,}  (~{total_params/1e6:.1f}M)")
    print(f"FP32 memory check  = {total_params * 4 / 1e6:.0f} MB  "
          f"(params x 4 bytes — matches the file size)")

    # ---- 1.3: architecture is written in the names ----------------------------
    print("\n--- layer 0 inventory (the block diagram, as tensors) ---")
    for name in sorted(k for k in tensors if k.startswith("h.0.")):
        print(f"  {name:<35} {tensors[name].shape}")

    # ---- 1.4: THE CONV1D TRAP -------------------------------------------------
    print("\n--- 1.4 trap demo: GPT-2 uses Conv1D, weight shape is (in, out) ---")
    W = tensors["h.0.attn.c_attn.weight"]          # (768, 2304) = (in, out)
    x = np.random.randn(4, 768).astype(np.float32) # batch of 4 token embeddings
    try:
        y = x @ W.T                                # PyTorch nn.Linear habit -> BOOM
    except ValueError as e:
        print(f"  x @ W.T  -> ValueError: {e}")
    y = x @ W                                      # Conv1D stores (in,out): NO transpose
    print(f"  x @ W    -> ok, out shape {y.shape}  (4 tokens x 2304 fused QKV)")


if __name__ == "__main__":
    main()
