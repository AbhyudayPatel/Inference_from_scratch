"""02 — Unicode code points vs UTF-8 bytes. The foundation of byte-level BPE.

All prints ASCII-safe (backslash escapes) for Windows cp1252 consoles.
"""

samples = [
    ("A", "ASCII"),
    ("\u0905", "Devanagari (Hindi letter)"),
    ("\u4f60", "Chinese (CJK)"),
    ("\U0001f600", "emoji"),
    ("Hello \u0928\u092e\u0938\u094d\u0924\u0947 \U0001f600", "mixed text"),
]

print("char / string        codepoint(s)        UTF-8 bytes (hex)              #bytes")
print("-" * 78)
for s, label in samples:
    b = s.encode("utf-8")
    hexs = " ".join(f"{byte:02x}" for byte in b)
    cps = " ".join(f"U+{ord(ch):04X}" for ch in s)
    print(f"{ascii(s):<22} {cps:<18} {hexs:<30} {len(b)}")

print()
print("=== THE LAWS ===")
print("1. ASCII char  = 1 byte (U+0000..U+007F)")
print("2. Devanagari  = 3 bytes/char (U+0900..U+097F)")
print("3. CJK         = 3 bytes/char")
print("4. emoji       = 4 bytes (U+1F600 > U+FFFF)")
print("5. same text, same meaning -> DIFFERENT byte counts across languages")
print()
for label, s in [("english", "hello world"), ("hindi", "\u0928\u092e\u0938\u094d\u0924\u0947"),
                 ("chinese", "\u4f60\u597d\u4e16\u754c"), ("emoji", "\U0001f600\U0001f680\U0001f525")]:
    print(f"{label:<9} chars={len(s):<3} utf8_bytes={len(s.encode('utf-8'))}")
print()
print("=> a CHAR-level tokenizer needs a vocab entry per Unicode char (100k+ exist).")
print("=> a BYTE-level tokenizer needs exactly 256 base symbols and can spell ANYTHING.")
print("   that is why GPT-2/Qwen/Llama3 do BPE over BYTES, not chars.")
