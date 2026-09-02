'use client';

import { useState } from 'react';

import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Button } from '@/components/ui/button';

const F = '```';

/** One fixture = a label plus the markdown a model would have produced. */
const CASES: { label: string; md: string }[] = [
  {
    label: 'chart · bar, single series, unit',
    md: `Request latency by endpoint over the last hour.

${F}breeze-ui
{"type":"chart","variant":"bar","title":"p95 latency by endpoint","unit":"ms",
 "data":[{"name":"/chat","value":412},{"name":"/auth","value":96},
         {"name":"/search","value":233},{"name":"/health","value":12}]}
${F}

Note the direct value labels — required relief for the low-contrast slots.`,
  },
  {
    label: 'chart · bar, multi-series, stacked',
    md: `${F}breeze-ui
{"type":"chart","variant":"bar","title":"Tokens by model","unit":"k","stacked":true,
 "x":["Mon","Tue","Wed","Thu","Fri"],
 "series":[{"name":"phi4-mini","data":[12,18,14,22,19]},
           {"name":"qwen2.5","data":[8,6,11,9,14]},
           {"name":"gemma3","data":[3,5,4,7,6]}]}
${F}`,
  },
  {
    label: 'chart · line, multi-series',
    md: `${F}breeze-ui
{"type":"chart","variant":"line","title":"Throughput","subtitle":"requests per minute","unit":"/m",
 "x":["00","04","08","12","16","20"],
 "series":[{"name":"local","data":[20,18,44,61,58,31]},
           {"name":"remote","data":[5,4,12,28,33,14]}]}
${F}`,
  },
  {
    label: 'chart · area, stacked',
    md: `${F}breeze-ui
{"type":"chart","variant":"area","title":"VRAM usage","unit":"GB","stacked":true,
 "x":["t0","t1","t2","t3","t4","t5"],
 "series":[{"name":"weights","data":[4.1,4.1,4.1,4.1,4.1,4.1]},
           {"name":"kv cache","data":[0.3,0.9,1.6,2.4,3.1,3.6]}]}
${F}`,
  },
  {
    label: 'chart · pie',
    md: `${F}breeze-ui
{"type":"chart","variant":"pie","title":"Turns by route",
 "data":[{"name":"prose","value":612},{"name":"chart","value":133},
         {"name":"table","value":88},{"name":"metrics","value":41}]}
${F}`,
  },
  {
    label: 'chart · 8 series (folds to Other at 6)',
    md: `${F}breeze-ui
{"type":"chart","variant":"line","title":"Eight series, palette caps at six",
 "x":["a","b","c","d"],
 "series":[{"name":"one","data":[3,5,4,6]},{"name":"two","data":[2,3,5,4]},
           {"name":"three","data":[5,4,3,5]},{"name":"four","data":[1,2,3,4]},
           {"name":"five","data":[6,5,4,3]},{"name":"six","data":[2,4,2,4]},
           {"name":"seven","data":[1,1,2,2]},{"name":"eight","data":[3,3,1,1]}]}
${F}`,
  },
  {
    label: 'metrics · tones',
    md: `${F}breeze-ui
{"type":"metrics","title":"Last 24h",
 "items":[{"label":"Conversations","value":"1,284","delta":"+12%","tone":"positive"},
          {"label":"p95 latency","value":"412 ms","delta":"+38 ms","tone":"negative"},
          {"label":"Model","value":"gemma3:12b","delta":"unchanged","tone":"neutral"}]}
${F}`,
  },
  {
    label: 'card',
    md: `${F}breeze-ui
{"type":"card","eyebrow":"BOUNDARY","title":"Web search leaves your machine",
 "body":"Every other capability runs against local Ollama. Tavily search is the one genuine egress, and it is off unless you turn it on per message.",
 "footer":"Default: off"}
${F}`,
  },
  {
    label: 'table · sortable, mixed types',
    md: `${F}breeze-ui
{"type":"table","title":"Local models",
 "columns":[{"key":"model","label":"Model"},{"key":"params","label":"Params"},
            {"key":"vram","label":"VRAM GB"},{"key":"vision","label":"Vision"}],
 "rows":[{"model":"phi4-mini","params":"3.8B","vram":3.2,"vision":false},
         {"model":"qwen2.5","params":"7B","vram":5.4,"vision":false},
         {"model":"qwen3","params":"8B","vram":6.1,"vision":false},
         {"model":"gemma3","params":"12B","vram":7.8,"vision":true}]}
${F}`,
  },
  {
    label: 'comparison · booleans',
    md: `${F}breeze-ui
{"type":"comparison","title":"Transport options",
 "columns":["Persists free","Protocol change","Code eval"],
 "rows":[{"name":"Fenced JSON","values":[true,false,false]},
         {"name":"Tool calls","values":[false,true,false]},
         {"name":"Free-form JSX","values":[true,false,true]}]}
${F}`,
  },
  {
    label: 'tabs · chart + table + metrics',
    md: `${F}breeze-ui
{"type":"tabs","label":"BENCHMARK",
 "items":[
  {"label":"Latency","body":[{"type":"chart","variant":"bar","unit":"ms",
    "data":[{"name":"phi4","value":180},{"name":"qwen","value":320},{"name":"gemma","value":610}]}]},
  {"label":"Detail","body":[{"type":"table",
    "columns":[{"key":"m","label":"Model"},{"key":"t","label":"ms"}],
    "rows":[{"m":"phi4","t":180},{"m":"qwen","t":320},{"m":"gemma","t":610}]}]},
  {"label":"Summary","body":[{"type":"metrics",
    "items":[{"label":"Fastest","value":"phi4-mini"},{"label":"Spread","value":"430 ms"}]}]}]}
${F}`,
  },
  {
    label: 'FAIL · truncated mid-stream (must show skeleton)',
    md: `${F}breeze-ui
{"type":"chart","variant":"bar","title":"Still arriv
${F}`,
  },
  {
    label: 'FAIL · unknown widget type',
    md: `${F}breeze-ui
{"type":"scatter3d","title":"Not on the whitelist","data":[]}
${F}`,
  },
  {
    label: 'FAIL · empty data array',
    md: `${F}breeze-ui
{"type":"chart","variant":"bar","title":"Nothing to draw","data":[]}
${F}`,
  },
  {
    label: 'FAIL · ragged comparison rows',
    md: `${F}breeze-ui
{"type":"comparison","columns":["A","B","C"],
 "rows":[{"name":"ok","values":[1,2,3]},{"name":"short","values":[1]}]}
${F}`,
  },
  {
    label: 'FAIL · series length ≠ x length',
    md: `${F}breeze-ui
{"type":"chart","variant":"line","x":["a","b","c"],
 "series":[{"name":"bad","data":[1,2]}]}
${F}`,
  },
  {
    label: 'FAIL · trailing commas (should recover)',
    md: `${F}breeze-ui
{"type":"metrics","items":[{"label":"Recovered","value":"yes",},],}
${F}`,
  },
  {
    label: 'EDGE · single data point',
    md: `${F}breeze-ui
{"type":"chart","variant":"bar","title":"One point","unit":"ms","data":[{"name":"only","value":42}]}
${F}`,
  },
  {
    label: 'EDGE · absurdly long labels',
    md: `${F}breeze-ui
{"type":"metrics","title":"An extremely long widget title that keeps going well past any reasonable column width to see what happens",
 "items":[{"label":"A label so long it has no business being a label at all in any interface","value":"12345678901234","delta":"+999999999","tone":"positive"},
          {"label":"Short","value":"1"}]}
${F}`,
  },
  {
    label: 'EDGE · 40-row table',
    md: `${F}breeze-ui
{"type":"table","title":"Forty rows","columns":[{"key":"i","label":"Index"},{"key":"v","label":"Value"}],
 "rows":[${Array.from({ length: 40 }, (_, i) => `{"i":${i + 1},"v":${Math.round(Math.sin(i) * 500 + 500)}}`).join(',')}]}
${F}`,
  },
  {
    label: 'REGRESSION · normal fences must still highlight',
    md: `A TypeScript fence, which must keep shiki highlighting:

${F}ts
export function seriesColor(index: number): string {
  return index < 6 ? \`var(--series-\${index + 1})\` : 'var(--muted-foreground)';
}
${F}

And a table, plus **bold** and \`inline code\`:

| Slot | Hue |
| ---- | --- |
| 1 | verdigris |
| 2 | brass |`,
  },
];

export function GenUiFixtures() {
  const [only, setOnly] = useState<number | null>(null);
  const shown = only === null ? CASES : [CASES[only]];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="type-display mb-1 text-2xl">Generative UI fixtures</h1>
      <p className="text-muted-foreground mb-4 text-sm">
        {CASES.length} cases. Toggle the theme with the app switch; check both.
      </p>

      <div className="mb-6 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant={only === null ? 'default' : 'outline'}
          onClick={() => setOnly(null)}
        >
          All
        </Button>
        {CASES.map((c, i) => (
          <Button
            key={i}
            size="sm"
            variant={only === i ? 'default' : 'outline'}
            onClick={() => setOnly(i)}
            className="text-xs"
          >
            {i + 1}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-8">
        {shown.map((c, i) => (
          <section key={i}>
            <div className="eyebrow border-hairline mb-2 border-b pb-1.5">{c.label}</div>
            <Message from="assistant">
              <MessageContent>
                <MessageResponse mode="static">{c.md}</MessageResponse>
              </MessageContent>
            </Message>
          </section>
        ))}
      </div>
    </div>
  );
}
