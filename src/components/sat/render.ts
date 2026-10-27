// HTML fragments shared by the server render (static/no-JS state) and the
// client updates, so both always show the same thing.
import {
	type Clause,
	type Formula,
	clauseText,
	clauseValue,
	failedClauses,
	literalText,
	literalValue,
} from './sat';

const icon = (ok: boolean) => `<span class="sat-icon" aria-hidden="true">${ok ? '✓' : '✗'}</span>`;

export function switchHtml(name: string, v: number, on: boolean, compact = false) {
	const value = compact ? (on ? '1' : '0') : on ? 'on' : 'off';
	return `<button type="button" class="sat-switch" role="switch" aria-checked="${on}" data-var="${v}" aria-label="${name}">
	<span class="sat-switch-name" aria-hidden="true">${name}</span>
	<span class="sat-switch-track" aria-hidden="true"><span class="sat-switch-knob"></span></span>
	<span class="sat-switch-value" aria-hidden="true">${value}</span>
</button>`;
}

/** Cards for the small worked example: granted wishes are highlighted, refused ones crossed out. */
export function clauseCardsHtml(f: Formula, x: boolean[], noun = 'Rule') {
	return f.clauses
		.map((c, i) => {
			const ok = clauseValue(c, x);
			const lits = c
				.map((l) => {
					const t = literalValue(l, x);
					return `<span class="sat-lit ${t ? 'is-true' : 'is-false'}">${literalText(l, f.vars)}</span>`;
				})
				.join('<span class="sat-or">or</span>');
			return `<li class="sat-clause ${ok ? 'is-sat' : 'is-unsat'}" aria-label="${noun} ${i + 1}, ${clauseText(c, f.vars)}: ${ok ? 'happy' : 'unhappy'}">
	<span class="sat-clause-head" aria-hidden="true">${noun} ${i + 1}</span>
	<span class="sat-clause-body" aria-hidden="true">${lits}</span>
</li>`;
		})
		.join('');
}

/** Compact clause chips for bigger puzzles, with "or" written as ∨: true literals are emphasised. */
export function clauseChipsHtml(f: Formula, x: boolean[]) {
	return f.clauses
		.map((c: Clause) => {
			const ok = clauseValue(c, x);
			const lits = c
				.map((l) => `<span class="${literalValue(l, x) ? 'is-true' : 'is-false'}">${literalText(l, f.vars)}</span>`)
				.join(' <span class="sat-or" aria-label="or">∨</span> ');
			return `<li class="sat-chip ${ok ? 'is-sat' : 'is-unsat'}">${icon(ok)}<span class="sr-only">${ok ? 'happy' : 'unhappy'}: </span>${lits}</li>`;
		})
		.join('');
}

/** "3 of 4 clauses happy" and/or a solved / not solved badge. */
export function verdictHtml(f: Formula, x: boolean[], { noun = 'clause', count = true, status = true } = {}) {
	const failed = failedClauses(f, x).length;
	const m = f.clauses.length;
	const ok = failed === 0;
	const countHtml = `<span class="sat-verdict-count"><strong>${m - failed} of ${m}</strong> ${noun}s happy</span>`;
	const statusHtml = `<span class="sat-verdict-formula ${ok ? 'is-sat' : 'is-unsat'}">${icon(ok)} ${ok ? `<strong>Solved!</strong> Every ${noun} is happy.` : '<strong>Not solved</strong> yet'}</span>`;
	return (count ? countHtml : '') + (status ? statusHtml : '');
}

export function verdictText(f: Formula, x: boolean[], noun = 'clause') {
	const failed = failedClauses(f, x);
	const m = f.clauses.length;
	if (failed.length === 0) return `All ${m} ${noun}s happy. Puzzle solved.`;
	const which = failed.length <= 3 ? ` Unhappy: ${noun} ${failed.map((i) => i + 1).join(', ')}.` : '';
	return `${m - failed.length} of ${m} ${noun}s happy. Not solved yet.${which}`;
}
