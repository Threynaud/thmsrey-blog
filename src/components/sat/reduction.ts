// Scenarios for the reduction explainer: what each translation between switch
// puzzles and timetables lets us conclude. "Fast" means "without exponential time".

export type Status = 'fast-assumed' | 'fast-too' | 'hard-assumed' | 'hard-too';

export type Scenario = {
	label: string;
	sat: Status;
	tt: Status;
	/** The translation the argument uses. */
	arrow: 'tt-to-sat' | 'sat-to-tt';
	steps: string[];
	conclusion: string;
};

export const SCENARIOS: Scenario[] = [
	{
		label: 'someone finds a fast method for switch puzzles?',
		sat: 'fast-assumed',
		tt: 'fast-too',
		arrow: 'tt-to-sat',
		steps: [
			'Take any timetable.',
			'Translate it into switches, like in the widget above.',
			'Solve the switch puzzle with the fast method.',
			'Read the timetable off the switches: each exam goes in the slot whose switch is on.',
		],
		conclusion: 'Timetables can be solved fast too.',
	},
	{
		label: 'someone finds a fast method for timetables?',
		sat: 'fast-too',
		tt: 'fast-assumed',
		arrow: 'sat-to-tt',
		steps: [
			'Take any switch puzzle.',
			'Translate it into a timetable, with the backwards translation.',
			'Solve the timetable with the fast method.',
			'Read the switch positions off the timetable.',
		],
		conclusion: 'Switch puzzles can be solved fast too.',
	},
	{
		label: 'switch puzzles can’t be solved fast? (the ETH bet)',
		sat: 'hard-assumed',
		tt: 'hard-too',
		arrow: 'sat-to-tt',
		steps: [
			'Suppose timetables could be solved fast.',
			'Then, as in scenario 2, switch puzzles could be solved fast too.',
			'That contradicts the bet.',
		],
		conclusion:
			'If the bet is right, timetables can’t be solved fast either. Nobody proved this about timetables directly: it is borrowed from the bet.',
	},
];

const STATUS: Record<Status, { word: string; note: string; kind: 'fast' | 'hard'; assumed: boolean }> = {
	'fast-assumed': { word: 'Fast', note: 'assumed', kind: 'fast', assumed: true },
	'fast-too': { word: 'Fast too', note: 'follows', kind: 'fast', assumed: false },
	'hard-assumed': { word: 'Hard', note: 'the bet', kind: 'hard', assumed: true },
	'hard-too': { word: 'Hard too', note: 'follows', kind: 'hard', assumed: false },
};

export function statusHtml(s: Status) {
	const { word, note, kind, assumed } = STATUS[s];
	return `<span class="sat-flow-status is-${kind}${assumed ? ' is-assumed' : ''}">${word} <small>(${note})</small></span>`;
}

export function flowStepsHtml(s: Scenario) {
	return `<ol class="sat-flow-steps">${s.steps.map((t) => `<li>${t}</li>`).join('')}</ol>
<p class="sat-flow-conclusion"><span aria-hidden="true">→</span> ${s.conclusion}</p>`;
}
