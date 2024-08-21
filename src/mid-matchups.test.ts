import { generateMidMatchupsFixed } from './mid-matchups.js';
import { TeamStandingWithDifficulty } from './simulator.js';

const badSortedGroup: TeamStandingWithDifficulty[] = [
  {
    name: '4',
    seed: 4,
    wins: 1,
    losses: 1,
    pastOpponents: [
      {
        teamName: '12',
        bestOf: 1,
        won: true,
      },
      {
        teamName: '14',
        bestOf: 1,
        won: false,
      },
    ],
    difficulty: 2,
  },
  {
    name: '5',
    seed: 5,
    wins: 1,
    losses: 1,
    pastOpponents: [
      {
        teamName: '13',
        bestOf: 1,
        won: true,
      },
      {
        teamName: '11',
        bestOf: 1,
        won: false,
      },
    ],
    difficulty: 2,
  },
  {
    name: '8',
    seed: 8,
    wins: 1,
    losses: 1,
    pastOpponents: [
      {
        teamName: '16',
        bestOf: 1,
        won: true,
      },
      {
        teamName: '9',
        bestOf: 1,
        won: false,
      },
    ],
    difficulty: 2,
  },
  {
    name: '15',
    seed: 15,
    wins: 1,
    losses: 1,
    pastOpponents: [
      {
        teamName: '7',
        bestOf: 1,
        won: true,
      },
      {
        teamName: '2',
        bestOf: 1,
        won: false,
      },
    ],
    difficulty: 2,
  },
  {
    name: '7',
    seed: 7,
    wins: 1,
    losses: 1,
    pastOpponents: [
      {
        teamName: '15',
        bestOf: 1,
        won: false,
      },
      {
        teamName: '10',
        bestOf: 1,
        won: true,
      },
    ],
    difficulty: -2,
  },
  {
    name: '12',
    seed: 12,
    wins: 1,
    losses: 1,
    pastOpponents: [
      {
        teamName: '4',
        bestOf: 1,
        won: false,
      },
      {
        teamName: '6',
        bestOf: 1,
        won: true,
      },
    ],
    difficulty: -2,
  },
  {
    name: '13',
    seed: 13,
    wins: 1,
    losses: 1,
    pastOpponents: [
      {
        teamName: '5',
        bestOf: 1,
        won: false,
      },
      {
        teamName: '3',
        bestOf: 1,
        won: true,
      },
    ],
    difficulty: -2,
  },
  {
    name: '16',
    seed: 16,
    wins: 1,
    losses: 1,
    pastOpponents: [
      {
        teamName: '8',
        bestOf: 1,
        won: false,
      },
      {
        teamName: '1',
        bestOf: 1,
        won: true,
      },
    ],
    difficulty: -2,
  },
];

const matchups = generateMidMatchupsFixed(badSortedGroup);

console.log(matchups);
