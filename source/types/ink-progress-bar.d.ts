declare module 'ink-progress-bar' {
	import React from 'react';
	import type {TextProps} from 'ink';

	export interface ProgressBarProps extends TextProps {
		columns?: number;
		percent?: number;
		left?: number;
		right?: number;
		character?: string;
		rightPad?: boolean;
	}

	export default class ProgressBar extends React.Component<ProgressBarProps> {}
}
