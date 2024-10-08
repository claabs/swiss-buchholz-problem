import { parentPort, workerData } from 'node:worker_threads';
import {
  SimulationError,
  type Matchup,
  type MessageFromWorkerErrorDetails,
  type MessageFromWorkerFinish,
  type MessageFromWorkerProgress,
  type OpponentCounts,
  type QualElimOutput,
  type SimulationEventMessage,
  type SimulationSettings,
  type TeamResultCounts,
  type TeamStanding,
  type TeamStandingWithDifficulty,
} from '../simulator.js';
import { generateInitialMatchups } from '../initial-matchups.js';
import { generateMidMatchups } from '../mid-matchups.js';

const splitStandingsToRecordGroups = (
  teamsStandings: TeamStandingWithDifficulty[]
): Map<number, TeamStandingWithDifficulty[]> =>
  teamsStandings.reduce((groups, teamStanding) => {
    const winDifferential = teamStanding.wins - teamStanding.losses;
    const recordGroup = groups.get(winDifferential);
    if (recordGroup) {
      recordGroup.push(teamStanding);
    } else {
      groups.set(winDifferential, [teamStanding]);
    }
    return groups;
  }, new Map<number, TeamStandingWithDifficulty[]>());

const calculateDifficulties = (teamsStandings: TeamStanding[]): TeamStandingWithDifficulty[] =>
  teamsStandings.map((team) => {
    const difficulty = team.pastOpponents.reduce((differentialSum, opponentDetail) => {
      const opponentStanding = teamsStandings.find(
        (standing) => standing.name === opponentDetail.teamName
      );
      if (!opponentStanding) return differentialSum;
      const winDifferential = opponentStanding.wins - opponentStanding.losses;
      return differentialSum + winDifferential;
    }, 0);
    return {
      ...team,
      difficulty,
    };
  });

const sortRecordGroup = (recordGroup: TeamStandingWithDifficulty[]): TeamStandingWithDifficulty[] =>
  recordGroup.sort((teamA, teamB) => {
    const difficultyDiff = teamB.difficulty - teamA.difficulty;
    if (difficultyDiff !== 0) return difficultyDiff;
    return teamA.seed - teamB.seed;
  });

export const categorizeResults = (
  results: TeamStanding[],
  qualWins: number,
  elimLosses: number,
  allTeamResults: Map<string, TeamResultCounts>
): Map<string, TeamResultCounts> => {
  results.forEach((teamStanding) => {
    const teamResult: TeamResultCounts = allTeamResults.get(teamStanding.name) || {
      qualified: 0,
      allWins: 0,
      allLosses: 0,
      wins: 0,
      losses: 0,
      opponents: new Map(),
    };
    teamResult.wins += teamStanding.wins;
    teamResult.losses += teamStanding.losses;
    if (teamStanding.wins === qualWins) {
      teamResult.qualified += 1;
      if (teamStanding.losses === 0) {
        teamResult.allWins += 1;
      }
    } else if (teamStanding.losses === elimLosses && teamStanding.wins === 0) {
      teamResult.allLosses += 1;
    }
    teamStanding.pastOpponents.forEach((opponent) => {
      const opponentCounts: OpponentCounts = teamResult.opponents.get(opponent.teamName) || {
        bo1: 0,
        bo3: 0,
        total: 0,
        won: 0,
      };
      opponentCounts.total += 1;
      if (opponent.bestOf === 1) {
        opponentCounts.bo1 += 1;
      } else {
        opponentCounts.bo3 += 1;
      }
      if (opponent.won) opponentCounts.won += 1;
      teamResult.opponents.set(opponent.teamName, opponentCounts);
    });

    allTeamResults.set(teamStanding.name, teamResult);
  });
  return allTeamResults;
};

export const getSeedOrder = (seeding: Record<string, string>) =>
  Object.entries(seeding)
    .sort(([seedA], [seedB]) => parseInt(seedA, 10) - parseInt(seedB, 10))
    .map(([, teamName]) => teamName);

const sixTeamMatchupPriority: [[number, number], [number, number], [number, number]][] = [
  [
    [1, 6],
    [2, 5],
    [3, 4],
  ],
  [
    [1, 6],
    [2, 4],
    [3, 5],
  ],
  [
    [1, 5],
    [2, 6],
    [3, 4],
  ],
  [
    [1, 5],
    [2, 4],
    [3, 6],
  ],
  [
    [1, 4],
    [2, 6],
    [3, 5],
  ],
  [
    [1, 4],
    [2, 5],
    [3, 6],
  ],
  [
    [1, 6],
    [2, 3],
    [4, 5],
  ],
  [
    [1, 5],
    [2, 3],
    [4, 6],
  ],
  [
    [1, 3],
    [2, 6],
    [4, 5],
  ],
  [
    [1, 3],
    [2, 5],
    [4, 6],
  ],
  [
    [1, 4],
    [2, 3],
    [5, 6],
  ],
  [
    [1, 3],
    [2, 4],
    [5, 6],
  ],
  [
    [1, 2],
    [3, 6],
    [4, 5],
  ],
  [
    [1, 2],
    [3, 5],
    [4, 6],
  ],
  [
    [1, 2],
    [3, 4],
    [5, 6],
  ],
];

const matchRecordGroup = (recordGroup: TeamStandingWithDifficulty[]): Matchup[] => {
  const sortedGroup = sortRecordGroup(recordGroup);

  const matchups: Matchup[] = [];
  if (sortedGroup.length === 6) {
    // In other rounds, refer to the following table and select the top-most row that does not result in a rematch:
    let validMatchups: Matchup[] = [];
    const foundValid = sixTeamMatchupPriority.some((seedMatchups) => {
      validMatchups = [];
      return seedMatchups.every((seedMatchup) => {
        const highTeam = sortedGroup[seedMatchup[0] - 1];
        const lowTeam = sortedGroup[seedMatchup[1] - 1];
        if (!(highTeam && lowTeam)) throw new Error('No team matching seed matchup');
        if (!highTeam.pastOpponents.find((opp) => opp.teamName === lowTeam.name)) {
          validMatchups.push({ teamA: highTeam, teamB: lowTeam });
          return true;
        }
        return false;
      });
    });
    if (!foundValid) throw new Error('No valid matchups without rematches!');
    matchups.push(...validMatchups);
  } else if (sortedGroup.every((team) => team.pastOpponents.length === 0)) {
    matchups.push(...generateInitialMatchups(sortedGroup));
  } else {
    matchups.push(...generateMidMatchups(sortedGroup));
  }
  return matchups;
};

/**
 * https://github.com/ValveSoftware/csgo/blob/main/major-supplemental-rulebook.md#mid-stage-seed-calculation
 * @param teamsStandings
 */
const calculateMatchups = (teamsStandings: TeamStanding[]): Matchup[] => {
  // 1. Current W-L record in the stage
  // 2. Difficulty Score in the current stage
  // 3. Initial seeding of the current stage
  const teamsStandingsWithDifficulty = calculateDifficulties(teamsStandings);
  const recordGroups = splitStandingsToRecordGroups(teamsStandingsWithDifficulty);
  const matchups: Matchup[] = Array.from(recordGroups.values()).reduce(
    (acc: Matchup[], recordGroup) => acc.concat(matchRecordGroup(recordGroup)),
    []
  );
  return matchups;
};

const simulateMatchup = (matchup: Matchup, simSettings: SimulationSettings): TeamStanding[] => {
  const teamAWins = Math.random() <= 0.5;
  const { teamA, teamB } = matchup;
  const isQualElim =
    matchup.teamA.wins === simSettings.qualWins - 1 ||
    matchup.teamA.losses === simSettings.elimLosses - 1;
  const bestOf = isQualElim ? 3 : 1;
  teamA.pastOpponents.push({ teamName: teamB.name, bestOf, won: teamAWins });
  teamB.pastOpponents.push({ teamName: teamA.name, bestOf, won: !teamAWins });
  if (teamAWins) {
    teamA.wins += 1;
    teamB.losses += 1;
  } else {
    teamA.losses += 1;
    teamB.wins += 1;
  }
  return [teamA, teamB];
};

const simulateMatchups = (matchups: Matchup[], simSettings: SimulationSettings): TeamStanding[] =>
  matchups.flatMap((matchup) => simulateMatchup(matchup, simSettings));

const extractQualElims = (
  teamsStandings: TeamStanding[],
  simSettings: SimulationSettings
): QualElimOutput =>
  teamsStandings.reduce(
    (acc, team) => {
      if (team.wins >= simSettings.qualWins) acc.qualified.push(team);
      else if (team.losses >= simSettings.elimLosses) acc.eliminated.push(team);
      else acc.competitors.push(team);
      return acc;
    },
    {
      qualified: [] as TeamStanding[],
      eliminated: [] as TeamStanding[],
      competitors: [] as TeamStanding[],
    }
  );

export const simulateEvent = (
  seedOrder: string[],
  simSettings: SimulationSettings
): QualElimOutput => {
  let competitors: TeamStanding[] = seedOrder.map((teamName, index) => ({
    name: teamName,
    seed: index + 1,
    wins: 0,
    losses: 0,
    pastOpponents: [],
  }));
  const qualified: TeamStanding[] = [];
  const eliminated: TeamStanding[] = [];
  const archivedMatchups = [];
  while (competitors.length) {
    const matchups = calculateMatchups(competitors);
    archivedMatchups.push(matchups);
    const standings = simulateMatchups(matchups, simSettings);
    const qualElimResult = extractQualElims(standings, simSettings);
    competitors = qualElimResult.competitors;
    qualified.push(...qualElimResult.qualified);
    eliminated.push(...qualElimResult.eliminated);
  }
  return {
    qualified,
    eliminated,
    competitors,
  };
};

const main = () => {
  if (!parentPort) throw new Error('No parent thread found!');

  const { iterations, seedOrder, simSettings } = workerData as SimulationEventMessage;
  const progressInterval = Math.floor(iterations / 5);
  let allTeamResults = new Map<string, TeamResultCounts>();
  let badEvents = 0;
  for (let i = 0; i < iterations; i += 1) {
    try {
      const { qualified, eliminated } = simulateEvent(seedOrder, simSettings);
      const results = [...qualified, ...eliminated];
      allTeamResults = categorizeResults(
        results,
        simSettings.qualWins,
        simSettings.elimLosses,
        allTeamResults
      );
      if (i % progressInterval === 0) {
        const progressMessage: MessageFromWorkerProgress = {
          data: i,
          type: 'progress',
        };
        parentPort.postMessage(progressMessage);
      }
    } catch (err) {
      if (err instanceof SimulationError) {
        const errorMessage: MessageFromWorkerErrorDetails = {
          type: 'error',
          errorDetail: err.errorDetail,
          roundDetails: err.roundDetails,
        };
        parentPort.postMessage(errorMessage);
      }
      badEvents += 1;
    }
  }

  const finishMessage: MessageFromWorkerFinish = {
    data: allTeamResults,
    errors: badEvents,
    type: 'finish',
  };
  parentPort.postMessage(finishMessage);
  parentPort.close();
};

main();
