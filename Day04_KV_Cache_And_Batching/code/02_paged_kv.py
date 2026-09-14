"""02 — PagedAttention in miniature: the OS virtual-memory trick, applied to KV.

No GPU, no attention math — this file simulates the MEMORY MANAGER that vLLM made
famous, because the hard part of serving many requests is bookkeeping, not math.

We verify:
  * logical block table -> physical blocks, free list, block = 16 token slots
  * fragmentation: reservation-based allocation wastes most of what it reserves
  * prefix sharing: two requests sharing a prompt prefix reference the SAME blocks
  * copy-on-write: appending to a shared partial block copies it first
  * pool exhaustion: allocation failure is a SCHEDULING event, not a crash

All byte numbers use the real GPT-2 KV cost: 73,728 bytes/token (FP32) or
36,864 bytes/token (FP16/BF16, what engines actually store).
"""
BLOCK = 16                       # token slots per physical block (vLLM default: 16)
KV_FP32 = 73_728                 # bytes per token per layer-stack, FP32
KV_FP16 = 36_864


class Pool:
    """Physical block pool. A block is just a list of token slots (or a refcount)."""

    def __init__(self, n_blocks):
        self.n_blocks = n_blocks
        self.free = list(range(n_blocks))      # free list of physical block ids
        self.slots = {}                        # phys_id -> list of token ids stored
        self.refs = {}                         # phys_id -> reference count

    def alloc(self):
        if not self.free:
            raise OOM("KV pool exhausted -- scheduler must wait, preempt, or swap")
        b = self.free.pop()
        self.slots[b] = []
        self.refs[b] = 1
        return b

    def incref(self, b):
        self.refs[b] += 1

    def decref(self, b):
        self.refs[b] -= 1
        if self.refs[b] == 0:
            del self.slots[b]
            self.free.append(b)                # returns to the free list

    @property
    def used(self):
        return self.n_blocks - len(self.free)


class OOM(Exception):
    pass


class Sequence:
    """One request's KV, viewed through a logical block table (like a page table)."""

    def __init__(self, pool):
        self.pool = pool
        self.blocks = []                       # logical idx -> physical block id
        self.n_tokens = 0

    # -- allocation -----------------------------------------------------------
    def _ensure_slot(self):
        if self.n_tokens % BLOCK == 0:
            self.blocks.append(self.pool.alloc())

    def append(self, tok):
        self._ensure_slot()
        phys = self.blocks[-1]
        if self.pool.refs[phys] > 1:           # shared partial block -> copy-on-write
            self.pool.decref(phys)
            newb = self.pool.alloc()
            self.pool.slots[newb] = list(self.pool.slots[phys])
            self.blocks[-1] = newb
            phys = newb
        self.pool.slots[phys].append(tok)
        self.n_tokens += 1

    def extend(self, toks):
        for t in toks:
            self.append(t)

    def fork(self):
        """Share ALL blocks (prefix caching / parallel sampling / beam search)."""
        child = Sequence(self.pool)
        child.blocks = list(self.blocks)
        child.n_tokens = self.n_tokens
        for b in self.blocks:
            self.pool.incref(b)
        return child

    def free(self):
        for b in self.blocks:
            self.pool.decref(b)

    # -- introspection --------------------------------------------------------
    def read(self, pos):
        """Logical position -> physical slot. This indirection is the whole idea."""
        return self.pool.slots[self.blocks[pos // BLOCK]][pos % BLOCK]

    @property
    def reserved(self):
        return len(self.blocks) * BLOCK

    @property
    def waste_slots(self):
        return self.reserved - self.n_tokens


def reservation_waste(lengths, max_len):
    """The old way (FasterTransformer/Orca-style): reserve max_len contiguous slots
    per request up front. Most are never used -> 60-80% waste in the vLLM paper."""
    used = sum(lengths)
    reserved = len(lengths) * max_len
    return used, reserved, 1 - used / reserved


def main():
    print(f"block size: {BLOCK} token slots | KV/token: {KV_FP32:,} B FP32 "
          f"({KV_FP16:,} B FP16)\n")

    # ---- 1. reservation waste (the problem paging solves) --------------------
    lengths = [12, 200, 45, 1024, 30, 600, 80, 310]
    max_len = 1024
    used, reserved, waste = reservation_waste(lengths, max_len)
    print(f"[reservation] 8 requests, lengths {lengths}")
    print(f"  reserved {reserved} slots ({reserved*KV_FP16/1e6:.1f} MB FP16), "
          f"used {used} -> waste {waste:.0%}  (vLLM paper: 60-80% typical)\n")

    # ---- 2. paged allocation grows on demand ---------------------------------
    pool = Pool(n_blocks=64)                   # 64 blocks x 16 slots = 1024 token slots
    a = Sequence(pool)
    a.extend(range(10))                        # 10 tokens -> 1 block, 6 slots idle
    print(f"[paged] seq A: 10 tokens -> {len(a.blocks)} block(s), "
          f"waste {a.waste_slots} slots (<= {BLOCK-1} by construction: last block only)")
    assert a.blocks == [a.blocks[0]] and pool.used == 1 and a.waste_slots == 6

    b = Sequence(pool)
    b.extend(range(40))                        # 40 tokens -> 3 blocks, 8 idle
    print(f"[paged] seq B: 40 tokens -> {len(b.blocks)} blocks, waste {b.waste_slots} slots")
    assert len(b.blocks) == 3 and b.waste_slots == 8

    # logical->physical indirection: token 17 lives in block 1, slot 1
    assert b.read(17) == 17 and b.blocks[17 // BLOCK] == b.blocks[1]
    print(f"  indirection check: logical token 17 -> block#{b.blocks[1]} slot {17%BLOCK} -> value {b.read(17)}")
    frag = sum(s.waste_slots for s in (a, b))
    total = sum(s.reserved for s in (a, b))
    print(f"  pool internal fragmentation: {frag}/{total} slots = {frag/total:.1%} "
          f"(bounded by one partial block per sequence)\n")

    # ---- 3. prefix sharing: same prompt, two requests ------------------------
    sys_prompt = list(range(24))               # "You are a helpful assistant..." = 24 tokens
    shared = Sequence(pool)
    shared.extend(sys_prompt)
    r1 = shared.fork()                         # request 1 shares the prefix blocks
    r2 = shared.fork()                         # request 2 too
    refcounts = [pool.refs[b] for b in shared.blocks]
    print(f"[sharing] 24-token system prompt -> blocks {shared.blocks}, refcounts {refcounts}")
    assert all(rc == 3 for rc in refcounts)    # owner + 2 forks
    before = pool.used
    r1.append(900); r2.append(901)             # both append ONE token
    print(f"  both forked requests append 1 token each: pool blocks {before} -> {pool.used}")
    full, last = shared.blocks[0], shared.blocks[-1]
    print(f"  copy-on-write: FULL prefix block #{full} still shared (refcount {pool.refs[full]}); "
          f"the PARTIAL block was copied for each appender (owner refcount back to {pool.refs[last]})")
    print(f"  new tail blocks are private (r1 block {r1.blocks[-1]}, r2 block {r2.blocks[-1]})")
    assert pool.refs[full] == 3            # 16/16 full block: shared by all three, forever
    assert pool.refs[last] == 1            # partial block: owner keeps original, forks got copies
    assert r1.blocks[-1] != r2.blocks[-1] and r1.blocks[-1] != last
    assert all(shared.read(i) == sys_prompt[i] for i in range(24))   # prefix bytes intact
    print(f"  savings: prefix KV computed+stored once for 3 sequences "
          f"({24*KV_FP16*2/1024:,.0f} KiB saved vs duplicating)\n")

    # ---- 4. freeing returns blocks; exhaustion is graceful --------------------
    shared.free(); r1.free(); r2.free(); a.free(); b.free()
    assert pool.used == 0
    print(f"[free] all sequences freed -> pool back to {len(pool.free)}/{pool.n_blocks} blocks")

    tiny = Pool(n_blocks=2)
    s = Sequence(tiny)
    s.extend(range(2 * BLOCK))                 # fill the whole pool
    try:
        s.append(0)
        print("BUG: allocation should have failed")
    except OOM as e:
        print(f"[oom] 33rd token on a 32-slot pool -> OOM: {e}")
        print("  real engines: wait (queue), preempt (swap victim to CPU / recompute later), or reject")

    print("\nCHECKSUM: PASS -- block table, free list, CoW and refcounts all verified.")


if __name__ == "__main__":
    main()
