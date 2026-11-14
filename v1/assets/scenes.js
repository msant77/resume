/*
 * The first viewport: how the work runs, told as what the reader gets.
 * Played by assets/loop.js and drawn in 3D by assets/hero3d.js.
 *
 * No text lives here: every word is in assets/i18n/<locale>.json, found by
 * convention from the ids below (i18n prefix "hero"):
 *   hero.node.<id>.title | short | sub | cap[]   hero.node.<id>.m.<meter>
 *   hero.edge.<id>.title | cap[]                 hero.step.<id> (caption)
 *   hero.legend.<role>                           hero.log.<k>
 * Rail labels are common.rail.<step id>.
 *
 * The story, in seven steps: he decides, writes the brief, the builders
 * build, reviewers audit, everything leaves a trail, the client signs off,
 * then work already delivered.
 *
 * Structure:
 *   nodes   cards. role = colour: client (you) | human (Marco, the lead) |
 *           agent (builders and reviewers) | github (the trail) |
 *           core (delivered); at / order / half = place in the flat layout.
 *   ring    the steps on the 3D carousel (the running one turns to the
 *           front); satellites = fixed cards outside it, each tied by a
 *           leader to its anchor card.
 *   edges   from -> to; across = arc over the ring; flat: false = drawn in
 *           3D only.
 *   steps   the progress rail; focus = the card the camera goes to.
 *   events  what happens at t seconds: status, bar ("node.meter": 0-100
 *           over dur), add (counters, kept across loops unless reset),
 *           packet (an edge), step, pulse, log ({n: node, k: key}).
 *           {stat} in a text prints a counter.
 */
window.SiteScenes = window.SiteScenes || {};

window.SiteScenes.hero = {
  i18n: 'hero',
  duration: 52,
  cols: 4,
  wideMin: 860,
  logLines: 4,
  legend: [{ role: 'client' }, { role: 'human' }, { role: 'agent' }, { role: 'github' }, { role: 'core' }],
  stats: {
    decisions: { value: 11 },
    plans: { value: 2 },
    briefs: { value: 6 },
    fronts: { value: 3 },
    reqNo: { value: 41 },
    changes: { value: 126 },
    findings: { value: 0, reset: true },
    risky: { value: 2 },
    reports: { value: 18 },
    waiting: { value: 1 },
    closed: { value: 36 }
  },
  ring: ['outcome', 'decide', 'plan', 'brief', 'build', 'review', 'trail', 'validate', 'delivered'],
  satellites: ['second', 'notes'],
  satelliteAnchor: 'review',
  nodes: [
    { id: 'outcome', role: 'client', at: [1, 1], order: 0,
      meters: [{ kind: 'text', key: 't1' }] },
    { id: 'decide', role: 'human', at: [2, 1], order: 1,
      meters: [{ kind: 'stat', stat: 'decisions' }, { kind: 'text', key: 't1' }] },
    { id: 'plan', role: 'human', at: [3, 1], order: 2,
      meters: [{ kind: 'stat', stat: 'plans' }, { kind: 'text', key: 't1' }] },
    { id: 'brief', role: 'human', at: [4, 1], order: 3,
      meters: [{ kind: 'stat', stat: 'briefs' }, { kind: 'text', key: 't1' }] },
    { id: 'notes', role: 'human', small: true, at: [1, 2], order: 7, half: true, anchor: 'trail',
      meters: [{ kind: 'stat', stat: 'reports' }] },
    { id: 'trail', role: 'github', at: [2, 2], order: 8,
      meters: [{ kind: 'stat', stat: 'changes' }, { kind: 'text', key: 't1' }] },
    { id: 'review', role: 'agent', at: [3, 2], order: 5,
      meters: [{ kind: 'bar', id: 'rev' }, { kind: 'text', key: 't1' }] },
    { id: 'build', role: 'agent', at: [4, 2], order: 4,
      meters: [{ kind: 'bar', id: 'code' }, { kind: 'bar', id: 'checks' }, { kind: 'stat', stat: 'fronts' }] },
    { id: 'delivered', role: 'core', at: [1, 3], order: 10,
      meters: [{ kind: 'text', key: 't1' }, { kind: 'text', key: 't2' }, { kind: 'text', key: 't3' }] },
    { id: 'validate', role: 'client', at: [2, 3], order: 9,
      meters: [{ kind: 'stat', stat: 'waiting' }, { kind: 'stat', stat: 'closed' }] },
    { id: 'second', role: 'agent', small: true, at: [3, 3], order: 6, half: true, anchor: 'review',
      meters: [{ kind: 'stat', stat: 'risky' }] }
  ],
  edges: [
    { id: 'o-d', from: 'outcome', to: 'decide' },
    { id: 'd-p', from: 'decide', to: 'plan' },
    { id: 'ok', from: 'outcome', to: 'plan', across: true, flat: false },
    { id: 'p-b', from: 'plan', to: 'brief' },
    { id: 'b-bu', from: 'brief', to: 'build' },
    { id: 'bu-r', from: 'build', to: 'review' },
    { id: 'r-d', from: 'review', to: 'decide', across: true, flat: false },
    { id: 's-r', from: 'second', to: 'review' },
    { id: 'r-t', from: 'review', to: 'trail' },
    { id: 'n-t', from: 'notes', to: 'trail' },
    { id: 't-v', from: 'trail', to: 'validate' },
    { id: 'v-dl', from: 'validate', to: 'delivered' },
    { id: 'dl-o', from: 'delivered', to: 'outcome', flat: false }
  ],
  steps: [
    { id: 'decide', focus: 'decide' },
    { id: 'brief', focus: 'brief' },
    { id: 'build', focus: 'build' },
    { id: 'audit', focus: 'review' },
    { id: 'trail', focus: 'trail' },
    { id: 'validate', focus: 'validate' },
    { id: 'delivered', focus: 'delivered' }
  ],
  events: [
    // decide: your outcome, my questions, decisions in writing
    { t: 0.4, step: 'decide', status: { outcome: 'rodando' }, log: { n: 'outcome', k: 'o1' } },
    { t: 1.8, log: { n: 'outcome', k: 'o2' } },
    { t: 2.6, packet: 'o-d', dur: 1.6 },
    { t: 4.2, status: { outcome: 'concluído', decide: 'rodando' }, add: { decisions: 1 }, log: { n: 'decide', k: 'd1' } },
    { t: 5.6, log: { n: 'decide', k: 'd2' } },
    { t: 6.4, packet: 'd-p', dur: 1.5 },
    // brief: one plan per front, approved by you; one brief per builder
    { t: 7.9, step: 'brief', status: { decide: 'concluído', plan: 'rodando' }, log: { n: 'plan', k: 'p1' } },
    { t: 9.2, status: { outcome: 'rodando' }, packet: 'ok', dur: 1.8, log: { n: 'outcome', k: 'o3' } },
    { t: 11.0, status: { outcome: 'concluído', plan: 'concluído' }, add: { plans: 1 }, log: { n: 'plan', k: 'p2' } },
    { t: 11.6, packet: 'p-b', dur: 1.4, add: { reqNo: 1 } },
    { t: 13.0, status: { brief: 'rodando' }, log: { n: 'brief', k: 'b1' } },
    { t: 13.9, add: { briefs: 1 }, log: { n: 'brief', k: 'b2' } },
    { t: 14.4, packet: 'b-bu', dur: 1.5 },
    // build: builders in parallel, automatic checks on every change
    { t: 15.9, step: 'build', status: { brief: 'concluído', build: 'rodando' }, bar: { 'build.code': 100 }, dur: 3.0,
      log: { n: 'build', k: 'u1' } },
    { t: 16.6, add: { changes: 1 } },
    { t: 17.4, log: { n: 'build', k: 'u2' } },
    { t: 18.8, bar: { 'build.checks': 100 }, dur: 1.6, add: { changes: 1 }, log: { n: 'build', k: 'u3' } },
    { t: 20.6, status: { build: 'concluído' }, packet: 'bu-r', dur: 1.4 },
    // audit: never the author; a second review on risky changes; findings come back to me
    { t: 22.0, step: 'audit', status: { review: 'rodando' }, bar: { 'review.rev': 100 }, dur: 2.0,
      log: { n: 'review', k: 'r1' } },
    { t: 23.6, status: { second: 'rodando' }, packet: 's-r', dur: 1.3, add: { risky: 1 }, log: { n: 'second', k: 's1' } },
    { t: 24.2, add: { findings: 2 } },
    { t: 25.0, status: { second: 'concluído' }, log: { n: 'review', k: 'r2' } },
    { t: 25.4, status: { review: 'concluído' }, packet: 'r-d', dur: 1.8 },
    { t: 27.2, status: { decide: 'rodando' }, add: { decisions: 1 }, log: { n: 'decide', k: 'd3' } },
    // trail: every change points to its request; notes in plain language
    { t: 28.4, step: 'trail', status: { decide: 'concluído' }, packet: 'r-t', dur: 1.4 },
    { t: 29.8, status: { trail: 'rodando' }, log: { n: 'trail', k: 't1' } },
    { t: 31.0, status: { notes: 'rodando' }, packet: 'n-t', dur: 1.3, add: { reports: 1 }, log: { n: 'notes', k: 'n1' } },
    { t: 32.3, status: { notes: 'concluído', trail: 'concluído' }, log: { n: 'trail', k: 't2' } },
    { t: 32.8, packet: 't-v', dur: 1.5, add: { waiting: 1 } },
    // validate: nothing goes live without you; at most three waiting
    { t: 34.3, step: 'validate', status: { validate: 'rodando' }, log: { n: 'validate', k: 'v1' } },
    { t: 36.0, log: { n: 'validate', k: 'v2' } },
    { t: 38.0, status: { validate: 'concluído' }, add: { closed: 1, waiting: -1 }, log: { n: 'validate', k: 'v3' } },
    { t: 38.6, packet: 'v-dl', dur: 1.4 },
    // delivered: work already in the field
    { t: 40.0, step: 'delivered', status: { delivered: 'rodando' }, log: { n: 'delivered', k: 'x1' } },
    { t: 42.0, log: { n: 'delivered', k: 'x2' } },
    { t: 44.0, log: { n: 'delivered', k: 'x3' } },
    { t: 46.0, packet: 'dl-o', dur: 2.4 },
    { t: 48.4, status: { delivered: 'concluído' }, pulse: 'outcome', log: { n: 'outcome', k: 'o4' } }
  ]
};
