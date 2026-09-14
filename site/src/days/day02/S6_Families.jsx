import React from 'react'
import { Callout, Diagram, Tbl, R } from '../../components/ui.jsx'

const ALGOS = `<svg width="700" height="185" viewBox="0 0 700 185">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">three subword algorithms — three different mental models</text>
  <rect x="20" y="34" width="210" height="132" rx="10" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="11" fill="#1d1d1f" x="125" y="56" text-anchor="middle" font-weight="700">BPE</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="125" y="76" text-anchor="middle">start: chars/bytes</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="125" y="91" text-anchor="middle">merge pairs by rank</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="125" y="106" text-anchor="middle">deterministic, greedy</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="125" y="128" text-anchor="middle" font-weight="700">GPT-2 · Llama3 · Qwen</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="125" y="143" text-anchor="middle" font-weight="700">DeepSeek · GLM · Mistral</text>
  <rect x="245" y="34" width="210" height="132" rx="10" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="11" fill="#1d1d1f" x="350" y="56" text-anchor="middle" font-weight="700">WordPiece</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="76" text-anchor="middle">greedy longest-match</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="91" text-anchor="middle">from the LEFT</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="106" text-anchor="middle">"##" = continuation piece</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="350" y="128" text-anchor="middle" font-weight="700">BERT family</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="145" text-anchor="middle">un ##believ ##able</text>
  <rect x="470" y="34" width="210" height="132" rx="10" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="11" fill="#1d1d1f" x="575" y="56" text-anchor="middle" font-weight="700">Unigram</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="575" y="76" text-anchor="middle">start: BIG vocab</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="575" y="91" text-anchor="middle">score ALL segmentations</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="575" y="106" text-anchor="middle">pick best path (Viterbi)</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="575" y="128" text-anchor="middle" font-weight="700">T5 · Gemma · Llama 1/2</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="575" y="145" text-anchor="middle">probabilistic, can sample</text>
</svg>`

export default function S6_Families() {
  return (
    <>
      <h2 id="families">The taxonomy — and who uses what</h2>
      <p className="sub">Goal: when a new model drops, you identify its tokenizer in minutes from the repo files alone.</p>
      <Diagram svg={ALGOS}
        caption="BPE merges bottom-up by rank. WordPiece greedily longest-matches from the left. Unigram scores all segmentations and picks the best path. Different training math, same job." />
      <Callout kind="warn" title="SentencePiece is NOT an algorithm">
        It's a <strong>framework + file format</strong> (<code className="inline">tokenizer.model</code>) that can
        implement BPE <em>or</em> Unigram, operating directly on raw text (no whitespace pre-tokenization —
        spaces become the <code className="inline">▁</code> symbol). "Llama uses SentencePiece" tells you the
        container, not the algorithm — Llama 1/2 run SentencePiece-<em>BPE</em>; Gemma and T5 run
        SentencePiece-<em>Unigram</em>. Check the model file to know which.
      </Callout>
      <h3>The family map</h3>
      <Tbl head={['model family', 'tokenizer', 'byte-level?', 'vocab', 'tell-tale files']}>
        <R cells={['GPT-2 / RoBERTa / GPT-NeoX / Falcon', 'byte-level BPE', 'yes', '50,257', 'vocab.json + merges.txt']} monoCols={[1, 3]} />
        <R cells={['Llama 1 / 2 · Mistral', 'SentencePiece BPE', 'byte fallback', '~32,000', 'tokenizer.model']} monoCols={[1, 3]} />
        <R cells={['Llama 3', 'byte-level BPE (tiktoken-style)', 'yes', '128,256', 'tokenizer.json']} monoCols={[1, 3]} />
        <R cells={['Qwen 1/2/2.5/3 · DeepSeek', 'byte-level BPE', 'yes', '~152,000', 'vocab.json + merges.txt + tokenizer.json']} monoCols={[1, 3]} />
        <R cells={['GLM-4 lineage', 'BPE (tiktoken-style)', 'yes', '~150,000', 'tokenizer.model / tokenizer.json']} monoCols={[1, 3]} />
        <R cells={['Gemma · T5', 'SentencePiece Unigram', 'byte fallback', '256,000 / 32,100', 'tokenizer.model']} monoCols={[1, 3]} />
        <R cells={['BERT', 'WordPiece', 'no', '30,522', 'vocab.txt (one piece per line)']} monoCols={[1, 3]} />
      </Tbl>
      <p className="sub">Exact implementations vary by checkpoint — always inspect the files, never trust the family name. "It's a transformer" implies <em>nothing</em> about the tokenizer.</p>
      <h3>The repo files that tell the truth</h3>
      <Tbl head={['file', 'what it controls']}>
        <R cells={['vocab.json', 'token string → ID (BPE families)']} monoCols={[0]} />
        <R cells={['merges.txt', 'merge rules in RANK order — line number is priority']} monoCols={[0]} />
        <R cells={['tokenizer.json', 'the whole pipeline serialized: normalizer, pre-tokenizer regex, model, decoder, added tokens']} monoCols={[0]} />
        <R cells={['tokenizer.model', 'SentencePiece binary — BPE or Unigram inside, check model_type']} monoCols={[0]} />
        <R cells={['tokenizer_config.json', 'behavior + class + chat_template (Jinja)']} monoCols={[0]} />
        <R cells={['special_tokens_map.json', 'which added token plays BOS/EOS/PAD roles']} monoCols={[0]} />
      </Tbl>
      <div className="divider" />
    </>
  )
}
