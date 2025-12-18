import React from "react";
import { Box, useApp, useInput, useStdout } from "ink";
import BigText from "ink-big-text";
import Gradient from "ink-gradient";
import { Text } from "ink";

import WelcomeView from "./components/welcomeview.js";

// function makeAdaptiveBanner(text: string, termWidth?: number): string {
// 	const width = termWidth ?? 80;

// 	if (width > 120) {
// 		return figlet.textSync(text, { font: "Big" });
// 	}

// 	if (width > 80) {
// 		return figlet.textSync(text, { font: "Standard" });
// 	}

// 	if (width > 60) {
// 		return figlet.textSync(text, { font: "Small" });
// 	}

// 	return text; // fallback to plain text
// }


export default function WelcomePage() {
	const { stdout } = useStdout();
	const { exit } = useApp();

	useInput((input) => {
		if (input === "q") {
			exit();
		}
	});
	const width = stdout?.columns;
	// const banner = makeAdaptiveBanner("MINESERVER", width);
	return (
		<Box
			width={width}
			paddingX={2}
			paddingY={2}
			borderStyle="double"
			borderColor="cyan"
			flexDirection="column"
			justifyContent="flex-start"
			alignItems="flex-start"
			gap={2}
		>
			<Gradient name="cristal">
				<BigText text="MINESERVER" />
			</Gradient>
			<Text color="gray">Arrow keys to navigate, Enter to select, press q to quit.</Text>

			<WelcomeView />
		</Box>
    )
}
