import { Matchup, SimulationError, TeamStandingWithDifficulty } from './simulator.js';

export const generateMidMatchupsOriginal = (
  sortedGroup: TeamStandingWithDifficulty[]
): Matchup[] => {
  // Matchups shall be determined by seed. In round 3, the highest seeded team faces the lowest seeded team available that does not result in a rematch within the stage.

  const roundDetails = sortedGroup
    .map(
      (t) =>
        // Cloud9 2 1 win,loss
        `${t.name}\t${t.difficulty}\t${t.seed}\t${t.pastOpponents
          .map((o) => {
            const matchup = [t.name, o.teamName];
            if (!o.won) matchup.reverse();
            return matchup.join('>');
          })
          .join(',')}`
    )
    .join('\n');
  const matchupList = new Set<string>();
  sortedGroup.forEach((t) =>
    t.pastOpponents.forEach((o) => {
      const matchup = [t.name, o.teamName];
      if (!o.won) matchup.reverse();
      matchupList.add(matchup.join('>'));
    })
  );

  const matchups: Matchup[] = [];

  while (sortedGroup.length) {
    const highTeam = sortedGroup.shift();
    if (!highTeam) throw new Error('Missing high seed team');
    const skippedTeams = [];
    let validLowTeam = false;
    let lowTeam: TeamStandingWithDifficulty | undefined;

    while (!validLowTeam) {
      lowTeam = sortedGroup.pop();
      if (!lowTeam) {
        const error = new SimulationError('No valid matchups for seeding found');
        error.errorDetail = matchupList;
        error.roundDetails = roundDetails;
        throw error;
      }
      const lowTeamName = lowTeam.name;
      if (!highTeam.pastOpponents.some((opp) => opp.teamName === lowTeamName)) {
        validLowTeam = true;
      } else {
        skippedTeams.unshift(lowTeam);
      }
    }
    sortedGroup.push(...skippedTeams); // Re-add skipped low seed teams to end of the array

    if (highTeam && lowTeam) {
      matchups.push({
        teamA: highTeam,
        teamB: lowTeam,
      });
    }
  }
  return matchups;
};

export const generateMidMatchupsFixed = (sortedGroup: TeamStandingWithDifficulty[]): Matchup[] => {
  // Matchups shall be determined by seed. In round 3, the highest seeded team faces the lowest seeded team available that does not result in a rematch within the stage.

  const matchupList = new Set<string>();
  sortedGroup.forEach((t) =>
    t.pastOpponents.forEach((o) => {
      const matchup = [t.name, o.teamName];
      if (!o.won) matchup.reverse();
      matchupList.add(matchup.join('>'));
    })
  );

  const matchups: Matchup[] = [];

  const highTeams = sortedGroup.slice(0, sortedGroup.length / 2);
  const lowTeamsReversed = sortedGroup.slice(sortedGroup.length / 2).reverse();

  let walkbacks = 0;

  const disallowedOpponents: string[][] = highTeams.map(() => []);
  let takenLowTeams: string[] = [];
  for (let highIndex = 0; highIndex < highTeams.length; highIndex += 1) {
    const highTeam = highTeams[highIndex];
    if (!highTeam) throw new Error('Missing high seed team');

    for (let lowIndex = 0; lowIndex < lowTeamsReversed.length; lowIndex += 1) {
      const lowTeam = lowTeamsReversed[lowIndex];
      if (!lowTeam) throw new Error('Missing low seed team');
      if (
        disallowedOpponents[highIndex]?.includes(lowTeam.name) ||
        takenLowTeams.includes(lowTeam.name)
      ) {
        continue;
      }
      const alreadyPlayed = highTeam.pastOpponents.some((opp) => opp.teamName === lowTeam.name);
      if (alreadyPlayed) {
        disallowedOpponents[highIndex]?.push(lowTeam.name);
        // If this is the last low team and it's a rematch
        if (lowIndex === lowTeamsReversed.length - 1) {
          // invalidate the previous high team's matchup opponent
          const previousHighOpponent = matchups[highIndex - 1]?.teamB.name;
          if (!previousHighOpponent) throw new Error('Could not get previous high team opponent');
          disallowedOpponents[highIndex - 1]?.push(previousHighOpponent);
          // Make the previous high team's opponent available again
          takenLowTeams = takenLowTeams.filter((name) => name !== previousHighOpponent);
          // and rewind one high team
          highIndex -= 2; // an extra to counteract the loop
          walkbacks += 1;
        }
      } else {
        // Don't push so it can be rewound
        matchups[highIndex] = {
          teamA: highTeam,
          teamB: lowTeam,
        };
        takenLowTeams.push(lowTeam.name);
        break;
      }
    }
  }
  if (walkbacks > 1) console.log('walked back more than once!!!'); // alert if a walkback occurs more than once (it shouldn't)
  return matchups;
};

export const generateMidMatchups = generateMidMatchupsOriginal;
// export const generateMidMatchups = generateMidMatchupsFixed;
