// Shared 3-SAT model used by every widget in the post: one evaluator, one
// source of truth for the example formula and the numbers derived from it.

export type Literal = { v: number; neg: boolean };
export type Clause = Literal[];
export type Formula = { vars: string[]; clauses: Clause[] };

const lit = (v: number, neg = false): Literal => ({ v, neg });

/** Rules: (a on or b on or c on), (a off or b on or c on), (a on or b off or c on), (a on or b on or c off) */
export const EXAMPLE: Formula = {
	vars: ['a', 'b', 'c'],
	clauses: [
		[lit(0), lit(1), lit(2)],
		[lit(0, true), lit(1), lit(2)],
		[lit(0), lit(1, true), lit(2)],
		[lit(0), lit(1), lit(2, true)],
	],
};

export const literalValue = (l: Literal, x: boolean[]) => x[l.v] !== l.neg;
export const clauseValue = (c: Clause, x: boolean[]) => c.some((l) => literalValue(l, x));

/** Indices of the clauses that the assignment leaves unsatisfied. */
export const failedClauses = (f: Formula, x: boolean[]) =>
	f.clauses.flatMap((c, i) => (clauseValue(c, x) ? [] : [i]));

// Written as switch positions ("a off") rather than logic symbols (¬a): the post
// assumes no background, and introduces vocabulary only once it is needed.
export const literalText = (l: Literal, vars: string[]) => `${vars[l.v]} ${l.neg ? 'off' : 'on'}`;
export const clauseText = (c: Clause, vars: string[]) =>
	c.map((l) => literalText(l, vars)).join(' or ');

/** Assignment number i, read as binary with the first variable as the leftmost bit. */
export const assignmentAt = (i: number, n: number) =>
	Array.from({ length: n }, (_, j) => ((i >> (n - 1 - j)) & 1) === 1);
export const indexOf = (x: boolean[]) => x.reduce((i, b) => (i << 1) | (b ? 1 : 0), 0);
export const bits = (x: boolean[]) => x.map((b) => (b ? '1' : '0')).join('');

/** One byte per assignment: 1 if it satisfies every clause. Only for small n. */
export function solutionMap(f: Formula) {
	const n = f.vars.length;
	const map = new Uint8Array(1 << n);
	for (let i = 0; i < map.length; i++) {
		map[i] = failedClauses(f, assignmentAt(i, n)).length === 0 ? 1 : 0;
	}
	return map;
}

function mulberry32(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const VAR_NAMES = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * Random 3-SAT puzzle that is guaranteed to have a solution: pick a hidden
 * assignment first, then only keep clauses it satisfies. Deterministic per seed.
 */
export function plantedFormula(n: number, m: number, seed: number): Formula {
	const rand = mulberry32(seed);
	const hidden = Array.from({ length: n }, () => rand() < 0.5);
	const seen = new Set<string>();
	const clauses: Clause[] = [];
	while (clauses.length < m) {
		const picked = new Set<number>();
		while (picked.size < 3) picked.add(Math.floor(rand() * n));
		const clause = [...picked].sort((p, q) => p - q).map((v) => lit(v, rand() < 0.5));
		const key = clause.map((l) => (l.neg ? -1 : 1) * (l.v + 1)).join(',');
		if (seen.has(key) || !clauseValue(clause, hidden)) continue;
		seen.add(key);
		clauses.push(clause);
	}
	return { vars: VAR_NAMES.slice(0, n), clauses };
}

/** Clause density used for the random puzzles (close to the 3-SAT threshold). */
export const CLAUSES_PER_VAR = 4.26;

/** Puzzle sizes offered in the search widget, and the one it opens on. */
export const PUZZLE_SIZES = [3, 5, 8, 12, 16];
export const DEFAULT_SIZE = 8;

// Default puzzles: few solutions, the first one past the middle of the map,
// so that "try everything" has to do real work before it finds one.
const DEFAULT_SEEDS: Record<number, number> = { 5: 8, 8: 23, 12: 58, 16: 24 };
export const defaultSeed = (n: number) => DEFAULT_SEEDS[n] ?? 1;

/** 3 switches is the worked example; anything bigger is a random puzzle. */
export const puzzleFor = (n: number, seed: number) =>
	n === 3 ? EXAMPLE : plantedFormula(n, Math.round(CLAUSES_PER_VAR * n), seed);

// ---------- Formatting large counts ----------
// Written for readers with no maths background: exact digits and words
// ("40 trillion years"), never scientific notation.

export const fmtInt = (x: number | bigint) => x.toLocaleString('en-US');

/** 2^n written out in full. BigInt keeps it exact at any size. */
export const powerOfTwo = (n: number) => fmtInt(2n ** BigInt(n));

const twoSignificant = (v: number) => fmtInt(Number(v.toPrecision(2)));
const SCALES: [number, string][] = [
	[1e15, 'quadrillion'],
	[1e12, 'trillion'],
	[1e9, 'billion'],
	[1e6, 'million'],
];

/** 3,200,000 → "3.2 million"; below a million, the number in full. */
export function inWords(v: number) {
	for (const [size, name] of SCALES) {
		if (v >= size) return `${Number((v / size).toPrecision(2))} ${name}`;
	}
	return fmtInt(Math.round(v));
}

const YEAR = 365.25 * 24 * 3600;
const UNIVERSE_AGE_YEARS = 13.8e9;

/** Plain-language duration for `log10Seconds` (works far beyond float range). */
export function durationText(log10Seconds: number): string {
	const s = 10 ** log10Seconds;
	const round = (v: number, unit: string) => {
		const text = v < 10 ? v.toFixed(1).replace(/\.0$/, '') : fmtInt(Math.round(v));
		return `${text} ${unit}${text === '1' ? '' : 's'}`;
	};
	if (log10Seconds < -6) return 'less than a millionth of a second';
	if (s < 1e-3) return round(s * 1e6, 'microsecond');
	if (s < 1) return round(s * 1e3, 'millisecond');
	if (s < 60) return round(s, 'second');
	if (s < 3600) return round(s / 60, 'minute');
	if (s < 86400) return round(s / 3600, 'hour');
	if (s < YEAR) return round(s / 86400, 'day');
	const log10Years = log10Seconds - Math.log10(YEAR);
	if (log10Years < 6) return round(10 ** log10Years, 'year');
	const years =
		log10Years < 18
			? `${inWords(10 ** log10Years)} years`
			: `a number of years with ${Math.floor(log10Years) + 1} digits`;
	const ages = log10Years - Math.log10(UNIVERSE_AGE_YEARS);
	if (ages < 0) return years;
	if (ages < 6) return `${years}, about ${twoSignificant(10 ** ages)} times the age of the universe`;
	return `${years}, unimaginably longer than the universe has existed`;
}
