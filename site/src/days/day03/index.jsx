import React from 'react'
import { LabBanner } from '../../components/ui.jsx'
import S0 from './S0_Hero.jsx'
import S1 from './S1_Wiring.jsx'
import S2 from './S2_Math.jsx'
import S3Bridge from './S3_LogitBridge.jsx'
import S4Sampling from './S4_Sampling.jsx'
import S3Checksum from './S3_Checksum.jsx'
import S5 from './S5_Errors.jsx'
import S6 from './S6_Performance.jsx'
import S7 from './S7_Engines.jsx'
import S8 from './S8_FieldGuide.jsx'

export default function Day03() {
  return (
    <>
      <S0 />
      <LabBanner href="#/lab/day-03"
        title="The Sampling Lab — your sentence, real GPT-2 logits"
        desc="top-k / top-p / temperature / repetition penalty / seeded draws / 8-token rollouts, computed live by the Day-3 NumPy forward pass" />
      <S1 />
      <S2 />
      <S3Bridge />
      <S3Checksum />
      <S4Sampling />
      <S5 />
      <S6 />
      <S7 />
      <S8 />
    </>
  )
}
