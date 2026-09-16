import React from 'react'
import { LabBanner } from '../../components/ui.jsx'
import S0Hero from './S0_Hero.jsx'
import S1Waste from './S1_Waste.jsx'
import S2Mechanics from './S2_Mechanics.jsx'
import S3Checksum from './S3_Checksum.jsx'
import S4Paged from './S4_Paged.jsx'
import S5Batching from './S5_Batching.jsx'
import S6Errors from './S6_Errors.jsx'
import S7Engines from './S7_Engines.jsx'
import S8FieldGuide from './S8_FieldGuide.jsx'

export default function Day04() {
  return (
    <>
      <S0Hero />
      <LabBanner href="#/lab/day-04"
        title="KV Cache & Batching Labs — run the real Day-4 code"
        desc="naive vs cached race · paged KV pool with copy-on-write · static vs continuous scheduler · the cache bug gallery, all on live data" />
      <S1Waste />
      <S2Mechanics />
      <S3Checksum />
      <S4Paged />
      <S5Batching />
      <S6Errors />
      <S7Engines />
      <S8FieldGuide />
    </>
  )
}
