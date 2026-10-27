// Exam timetabling, the "real-world" puzzle of part 2, and its translation into
// switches and clauses. Under the hood it is 3-colouring: exams are the dots,
// clashes are the lines, slots are the colours.
import type { Clause, Formula } from './sat';
import { clauseValue, failedClauses, literalValue } from './sat';

export const EXAMS = ['Maths', 'Physics', 'Chemistry', 'Biology', 'History', 'French'];
export const SLOTS = [
	{ day: 'Monday', time: 'morning', short: 'Mon morning' },
	{ day: 'Monday', time: 'afternoon', short: 'Mon afternoon' },
	{ day: 'Tuesday', time: 'morning', short: 'Tue morning' },
];

/** Pairs of exams that share students, and how many. */
export const CLASHES: [number, number, number][] = [
	[0, 1, 24],
	[0, 2, 15],
	[1, 2, 18],
	[1, 3, 6],
	[2, 3, 21],
	[2, 4, 4],
	[3, 4, 9],
	[3, 5, 7],
	[4, 5, 12],
];

/**
 * Slot of each exam at the start. One clash (Chemistry and Biology), and no
 * single move removes it: every fix creates another clash. The nearest
 * solution is three moves away. There are 6 solutions, all the same timetable
 * with the slots shuffled: {Maths, Biology}, {Physics, History}, {Chemistry, French}.
 */
export const START = [1, 0, 2, 2, 1, 0];

/** Exam pairs sitting in the same slot. */
export const clashesIn = (t: number[]) => CLASHES.filter(([a, b]) => t[a] === t[b]);

// ---------- The same puzzle as switches ----------

const S = SLOTS.length;
/** Switch "exam e is in slot s". */
export const switchIndex = (e: number, s: number) => e * S + s;

const pos = (v: number) => ({ v, neg: false });
const neg = (v: number) => ({ v, neg: true });
const pairs = <T>(xs: T[]) => xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b] as const));

const slotIdx = SLOTS.map((_, s) => s);
const clauses: Clause[] = [
	// Every exam has a slot…
	...EXAMS.map((_, e) => slotIdx.map((s) => pos(switchIndex(e, s)))),
	// …and only one.
	...EXAMS.flatMap((_, e) => pairs(slotIdx).map(([s, r]) => [neg(switchIndex(e, s)), neg(switchIndex(e, r))])),
	// Two exams that share students are not in the same slot.
	...CLASHES.flatMap(([a, b]) => slotIdx.map((s) => [neg(switchIndex(a, s)), neg(switchIndex(b, s))])),
];

export const TIMETABLE_FORMULA: Formula = {
	vars: EXAMS.flatMap((e) => SLOTS.map((s) => `${e} on ${s.short}`)),
	clauses,
};

export const switchesFor = (t: number[]) => EXAMS.flatMap((_, e) => slotIdx.map((s) => t[e] === s));

// ---------- HTML, shared by the server render and the client ----------

const icon = (ok: boolean) => `<span class="sat-icon" aria-hidden="true">${ok ? '✓' : '✗'}</span>`;

function clashNotes(t: number[], e: number) {
	return clashesIn(t)
		.filter(([a, b]) => a === e || b === e)
		.map(([a, b, n]) => ({ other: EXAMS[a === e ? b : a], n }));
}

export function boardHtml(t: number[]) {
	return SLOTS.map((slot, s) => {
		const cards = EXAMS.map((name, e) => {
			if (t[e] !== s) return '';
			const notes = clashNotes(t, e);
			const why = notes.map(({ other, n }) => `<span class="sat-tt-why">${n} students also sit ${other}</span>`).join('');
			const label = `${name}, ${slot.day} ${slot.time}${notes.length ? `. Clashes with ${notes.map((c) => c.other).join(' and ')}` : ''}`;
			return `<li><button type="button" class="sat-tt-card${notes.length ? ' is-clash' : ''}" data-exam="${e}" aria-label="${label}" aria-pressed="false">${name}${why}</button></li>`;
		}).join('');
		return `<section class="sat-tt-slot" data-slot="${s}">
	<h4 class="sat-tt-slot-name">${slot.day} <span>${slot.time}</span></h4>
	<ul class="sat-tt-cards">${cards}</ul>
	<button type="button" class="sat-tt-drop" data-drop="${s}">Move here</button>
</section>`;
	}).join('');
}

export function gridHtml(t: number[]) {
	const x = switchesFor(t);
	const clashing = new Set(clashesIn(t).flatMap(([a, b]) => [a, b]));
	const head = `<span></span>${SLOTS.map((s) => `<span class="sat-tt-grid-head">${s.day} <span>${s.time}</span></span>`).join('')}`;
	const rows = EXAMS.map((name, e) => {
		const bad = clashing.has(e);
		const cells = SLOTS.map((slot, s) => {
			const on = x[switchIndex(e, s)];
			return `<button type="button" class="sat-tt-sw${on && bad ? ' is-clash' : ''}" role="switch" aria-checked="${on}" data-exam="${e}" data-slot="${s}" aria-label="${name} on ${slot.day} ${slot.time}"><span class="sat-switch-track" aria-hidden="true"><span class="sat-switch-knob"></span></span></button>`;
		}).join('');
		return `<span class="sat-tt-grid-exam${bad ? ' is-clash' : ''}">${name}</span>${cells}`;
	}).join('');
	return head + rows;
}

/** The clash list shown above the timetable: which exams share students, and how many. */
export function pairsHtml(t: number[]) {
	return CLASHES.map(([a, b, n]) => {
		const bad = t[a] === t[b];
		return `<li class="sat-tt-pair${bad ? ' is-clash' : ''}">${bad ? `${icon(false)}<span class="sr-only">clash: </span>` : ''}${EXAMS[a]} &amp; ${EXAMS[b]}: <span class="sat-tt-pair-n">${n}</span></li>`;
	}).join('');
}

function clauseChip(i: number, x: boolean[]) {
	const f = TIMETABLE_FORMULA;
	const c = f.clauses[i];
	const ok = clauseValue(c, x);
	const lits = c
		.map((l) => `<span class="${literalValue(l, x) ? 'is-true' : 'is-false'}">${f.vars[l.v]} ${l.neg ? 'off' : 'on'}</span>`)
		.join(' <span class="sat-or" aria-label="or">∨</span> ');
	return `<li class="sat-chip ${ok ? 'is-sat' : 'is-unsat'}">${icon(ok)}<span class="sr-only">${ok ? 'happy' : 'unhappy'}: </span>${lits}</li>`;
}

/** Unhappy clauses of the switch version, written like the clause chips of part 1. */
export function unhappyHtml(t: number[]) {
	const x = switchesFor(t);
	return failedClauses(TIMETABLE_FORMULA, x)
		.map((i) => clauseChip(i, x))
		.join('');
}

const E = EXAMS.length;
const ONE_SLOT = E * pairs(slotIdx).length;
/** Every clause, grouped by the timetable rule it translates. */
export const CLAUSE_GROUPS = [
	{ title: 'Every exam has a slot', from: 0, to: E, preview: 2 },
	{ title: 'Only one slot per exam', from: E, to: E + ONE_SLOT, preview: 6 },
	{ title: 'Exams that share students are not at the same time', from: E + ONE_SLOT, to: clauses.length, preview: 6 },
];

/** All clauses by group; groups not in `expanded` show their first few and an "and so on" button. */
export function allClausesHtml(t: number[], expanded: Set<number> = new Set()) {
	const x = switchesFor(t);
	return CLAUSE_GROUPS.map((g, gi) => {
		const total = g.to - g.from;
		const shown = expanded.has(gi) ? total : g.preview;
		const chips = Array.from({ length: shown }, (_, k) => clauseChip(g.from + k, x)).join('');
		const more =
			shown < total
				? `<button type="button" class="sat-tt-more" data-more="${gi}">and so on (${total - shown} more)</button>`
				: '';
		return `<h5 class="sat-tt-group">${g.title} <span>(${total})</span></h5>
<ul class="sat-chips" tabindex="-1">${chips}</ul>${more}`;
	}).join('');
}

const SOLUTION_GROUPS = [
	[0, 3],
	[1, 4],
	[2, 5],
];
const PERMUTATIONS = [
	[0, 1, 2],
	[0, 2, 1],
	[1, 0, 2],
	[1, 2, 0],
	[2, 0, 1],
	[2, 1, 0],
];

/** The clash-free timetable that needs the fewest moves from `t`. */
export function nearestSolution(t: number[]) {
	const candidates = PERMUTATIONS.map((p) => {
		const sol = [...t];
		SOLUTION_GROUPS.forEach((group, i) => group.forEach((e) => (sol[e] = p[i])));
		return sol;
	});
	const moves = (sol: number[]) => sol.filter((s, e) => s !== t[e]).length;
	return candidates.reduce((best, c) => (moves(c) < moves(best) ? c : best));
}

export function ttVerdictHtml(t: number[], view: 'timetable' | 'switches') {
	const n = view === 'timetable' ? clashesIn(t).length : failedClauses(TIMETABLE_FORMULA, switchesFor(t)).length;
	const ok = n === 0;
	const text =
		view === 'timetable'
			? ok
				? '<strong>No clashes.</strong> Everyone can sit all their exams.'
				: `<strong>${n} clash${n > 1 ? 'es' : ''}</strong>`
			: ok
				? `<strong>Solved!</strong> All ${TIMETABLE_FORMULA.clauses.length} clauses are happy.`
				: `<strong>${n} unhappy clause${n > 1 ? 's' : ''}</strong>`;
	return `<span class="sat-verdict-formula ${ok ? 'is-sat' : 'is-unsat'}">${icon(ok)} ${text}</span>`;
}
