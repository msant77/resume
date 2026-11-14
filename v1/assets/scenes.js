/*
 * The first viewport: one continuous live stage, played by assets/loop.js
 * and drawn in depth by assets/hero3d.js (flat HTML/SVG without WebGL, on
 * phones and under reduced motion).
 *
 * No text lives here: every word is in assets/i18n/<locale>.json, found by
 * convention from the ids below (i18n prefix "hero"):
 *   hero.node.<id>.title | short | sub | cap[]   hero.node.<id>.m.<meter>
 *   hero.edge.<id>.title | cap[]                 hero.lane.<id>.title | cap[]
 *   hero.frame (the stage's outer label)         hero.log.<k>
 *
 * The stage is not a sequence of steps. Three lanes run at the same time,
 * each at its own rhythm: Harness (brief -> working copy -> simulator ->
 * inspection), Production (checks -> release -> report, and the report's
 * second output, reported hours) and Speed (parallel fronts -> decision). All three feed one Throughput counter that keeps climbing; the
 * client's team keeps receiving releases and sending validations back.
 * Business value is the frame around all of it. The timeline repeats with no
 * reset: statuses and counters carry over, the session log never ends.
 *
 * Structure:
 *   nodes   things on the stage. role = colour: harness | production |
 *           speed | core (throughput) | client (the client's team).
 *           at = [col, row, colSpan, rowSpan] on wide stages, atNarrow on
 *           narrow ones (flat view); big = the counter drawn large;
 *           link = a URL the pinned caption offers (text: node.<id>.linkText).
 *   lanes   the three regions and the nodes in each.
 *   edges   from -> to; narrowRoute = how the flat view routes it on phones;
 *           over = the 3D link arcs high, over the card between its ends.
 *   events  what happens at t seconds: status, bar ("node.meter": 0-100
 *           over dur), add (counters, kept across loops unless reset),
 *           packet (an edge; back = against its direction), pulse,
 *           log ({n: node, k: key}). {stat} in a text prints a counter.
 */
window.SiteScenes = window.SiteScenes || {};

(function () {
  var D = 18;           // one pass of the timeline, in seconds; it repeats seamlessly
  var events = [];
  function at(t, ev) { ev.t = Math.round(t * 100) / 100; events.push(ev); }

  // Harness: twice a pass. A written brief, an isolated working copy, a rehearsal
  // against stand-ins in the simulator, an independent inspection.
  [0, 9].forEach(function (o, i) {
    at(o + 0.0, { status: { brief: 'rodando' }, add: { briefs: 1 }, bar: { 'copy.work': 0 }, dur: 0.3,
                  log: { n: 'brief', k: 'h1' } });
    at(o + 0.6, { packet: 'h1', dur: 1.2 });
    at(o + 1.8, { status: { brief: 'concluído', copy: 'rodando' }, bar: { 'copy.work': 100 }, dur: 1.7 });
    if (i === 0) at(o + 2.2, { log: { n: 'copy', k: 'c1' } });
    at(o + 3.6, { status: { copy: 'concluído' }, packet: 'h2', dur: 1.0, bar: { 'inspect.rev': 0 } });
    at(o + 4.6, { status: { simulator: 'rodando' }, add: { simRuns: 7 } });
    at(o + 4.9, { log: { n: 'simulator', k: 'g1' } });
    at(o + 5.4, { status: { simulator: 'concluído' }, packet: 'h4', dur: 1.0 });
    at(o + 6.4, { status: { inspect: 'rodando' }, bar: { 'inspect.rev': 100 }, dur: 1.1 });
    if (i === 1) at(o + 6.5, { log: { n: 'inspect', k: 'i1' } });
    at(o + 6.9, { add: { findings: 1 } });
    at(o + 7.6, { status: { inspect: 'concluído' }, packet: 'h3', dur: 1.0 });
    at(o + 8.6, { add: { delivered: 1, fromHarness: 1 }, pulse: 'throughput' });
  });

  // Production: three times a pass. Automatic checks, a release, a session report,
  // and the report's second output: the hours, logged as the work happens.
  [0.2, 6.1, 11.9].forEach(function (o, i) {
    at(o + 0.0, { status: { checks: 'rodando' }, bar: { 'checks.run': 0 }, dur: 0.2 });
    at(o + 0.2, { bar: { 'checks.run': 100 }, dur: 1.4, add: { checks: 12 } });
    if (i === 0) at(o + 1.2, { log: { n: 'checks', k: 'k1' } });
    at(o + 1.7, { status: { checks: 'concluído' }, packet: 'p1', dur: 1.1 });
    at(o + 2.8, { status: { release: 'rodando' }, add: { releases: 1 }, log: { n: 'release', k: 'r1' } });
    at(o + 3.4, { status: { release: 'concluído' }, packet: 'p2', dur: 1.0 });
    at(o + 4.4, { status: { report: 'rodando' }, add: { reports: 1 } });
    if (i === 1) at(o + 4.5, { log: { n: 'report', k: 'n1' } });
    at(o + 4.6, { status: { report: 'concluído' }, packet: 'p3', dur: 1.0 });
    at(o + 4.6, { packet: 'p4', dur: 0.9 });
    at(o + 5.5, { status: { hours: 'rodando' }, add: { hours: 2 } });
    if (i === 2) at(o + 5.55, { log: { n: 'hours', k: 'u1' } });
    at(o + 5.6, { add: { delivered: 1, fromProduction: 1 }, pulse: 'throughput' });
    at(o + 5.9, { status: { hours: 'concluído' } });
  });

  // Speed: four times a pass. Fronts move in parallel; decisions come fast.
  [0, 4.5, 9, 13.5].forEach(function (o, i) {
    at(o + 0.0, { status: { fronts: 'rodando' }, bar: { 'fronts.f1': 0, 'fronts.f2': 0, 'fronts.f3': 0 }, dur: 0.25 });
    at(o + 0.3, { bar: { 'fronts.f1': 100 }, dur: 0.9 });
    at(o + 0.3, { bar: { 'fronts.f2': 100 }, dur: 1.3 });
    at(o + 0.3, { bar: { 'fronts.f3': 100 }, dur: 1.1 });
    at(o + 1.2, { packet: 's1', dur: 0.9 });
    at(o + 2.1, { status: { decision: 'rodando', fronts: 'concluído' }, add: { decisions: 1 } });
    if (i % 2 === 0) at(o + 2.2, { log: { n: 'decision', k: i === 0 ? 'q1' : 'q2' } });
    at(o + 2.9, { status: { decision: 'concluído' }, packet: 's2', dur: 1.0 });
    at(o + 3.9, { add: { delivered: 1, fromSpeed: 1 }, pulse: 'throughput' });
  });

  // Integration: the client's team keeps receiving releases and sending validations back.
  [1.8, 7.8, 13.6].forEach(function (o, i) {
    at(o + 0.0, { packet: 't1', dur: 1.4, status: { team: 'rodando' } });
    if (i !== 1) at(o + 1.4, { log: { n: 'team', k: i === 0 ? 'm1' : 'm2' } });
    at(o + 2.6, { packet: 't1', back: true, dur: 1.4, role: 'client', add: { validations: 1 } });
    at(o + 3.0, { log: { n: 'team', k: 'm3' } });
    at(o + 4.0, { status: { team: 'concluído' } });
  });

  // the log line that says why the loop restarts: it never stops
  at(17.5, { log: { n: 'throughput', k: 'w1' } });

  window.SiteScenes.hero = {
    i18n: 'hero',
    duration: D,
    continuous: true,
    cols: 6,
    narrowCols: 2,
    wideMin: 860,
    logLines: 6,
    stats: {
      briefs: { value: 6 },
      simRuns: { value: 14 },
      hours: { value: 212 },
      findings: { value: 0, reset: true },
      checks: { value: 0 },
      releases: { value: 4 },
      reports: { value: 18 },
      fronts: { value: 3 },
      decisions: { value: 11 },
      validations: { value: 36 },
      delivered: { value: 126 },
      fromHarness: { value: 42 },
      fromProduction: { value: 51 },
      fromSpeed: { value: 33 }
    },
    lanes: [
      { id: 'harness', role: 'harness', nodes: ['brief', 'copy', 'simulator', 'inspect'] },
      { id: 'production', role: 'production', nodes: ['checks', 'release', 'report', 'hours'] },
      { id: 'speed', role: 'speed', nodes: ['fronts', 'decision'] }
    ],
    nodes: [
      { id: 'brief', role: 'harness', at: [1, 1], atNarrow: [1, 1],
        meters: [{ kind: 'stat', stat: 'briefs' }, { kind: 'text', key: 't1' }] },
      { id: 'copy', role: 'harness', at: [2, 1], atNarrow: [2, 1],
        meters: [{ kind: 'bar', id: 'work' }, { kind: 'text', key: 't1' }] },
      { id: 'simulator', role: 'harness', at: [3, 1], atNarrow: [1, 2],
        meters: [{ kind: 'stat', stat: 'simRuns' }, { kind: 'text', key: 't1' }] },
      { id: 'inspect', role: 'harness', at: [4, 1], atNarrow: [2, 2],
        meters: [{ kind: 'bar', id: 'rev' }, { kind: 'stat', stat: 'findings' }] },
      { id: 'checks', role: 'production', at: [1, 2], atNarrow: [1, 3],
        meters: [{ kind: 'stat', stat: 'checks' }, { kind: 'bar', id: 'run' }] },
      { id: 'release', role: 'production', at: [2, 2], atNarrow: [2, 3],
        meters: [{ kind: 'stat', stat: 'releases' }, { kind: 'text', key: 't1' }] },
      { id: 'report', role: 'production', at: [3, 2], atNarrow: [1, 4],
        meters: [{ kind: 'stat', stat: 'reports' }, { kind: 'text', key: 't1' }] },
      { id: 'hours', role: 'production', at: [4, 2], atNarrow: [2, 4], link: 'https://github.com/msant77/spent',
        meters: [{ kind: 'stat', stat: 'hours' }, { kind: 'text', key: 't1' }] },
      { id: 'fronts', role: 'speed', at: [1, 3, 3], atNarrow: [1, 5],
        meters: [{ kind: 'bar', id: 'f1' }, { kind: 'bar', id: 'f2' }, { kind: 'bar', id: 'f3' }] },
      { id: 'decision', role: 'speed', at: [4, 3], atNarrow: [2, 5],
        meters: [{ kind: 'stat', stat: 'decisions' }, { kind: 'text', key: 't1' }] },
      { id: 'throughput', role: 'core', big: true, status: 'rodando', at: [5, 1, 1, 3], atNarrow: [1, 6, 2],
        meters: [{ kind: 'stat', stat: 'delivered', big: true }, { kind: 'stat', stat: 'fromHarness' },
                 { kind: 'stat', stat: 'fromProduction' }, { kind: 'stat', stat: 'fromSpeed' }] },
      { id: 'team', role: 'client', at: [6, 1, 1, 3], atNarrow: [1, 7, 2],
        meters: [{ kind: 'stat', stat: 'validations' }, { kind: 'text', key: 't1' }] }
    ],
    edges: [
      { id: 'h1', from: 'brief', to: 'copy' },
      { id: 'h2', from: 'copy', to: 'simulator' },
      { id: 'h4', from: 'simulator', to: 'inspect' },
      { id: 'h3', from: 'inspect', to: 'throughput', narrowRoute: 'side' },
      { id: 'p1', from: 'checks', to: 'release' },
      { id: 'p2', from: 'release', to: 'report' },
      { id: 'p3', from: 'report', to: 'throughput', narrowRoute: 'side', over: true },
      { id: 'p4', from: 'report', to: 'hours' },
      { id: 's1', from: 'fronts', to: 'decision' },
      { id: 's2', from: 'decision', to: 'throughput', narrowRoute: 'side' },
      { id: 't1', from: 'throughput', to: 'team' }
    ],
    events: events
  };
})();
