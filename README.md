# The 2024 Major Swiss Format Flaw

## The Problem

With the introduction of the new [Initial Swiss Matchups rule](https://github.com/ValveSoftware/counter-strike_rules_and_regs/blob/main/major-supplemental-rulebook.md?plain=1#L324-L335) added for the 2024 Copenhagen Major cycle, a flaw with assigning round 3 matchups was created.

There's a 0.6% chance that 1-1 record teams in round 3 cannot find valid matchups. It can cause the round 3 matchups selection to force a rematch, which is not allowed by the [current ruleset](https://github.com/ValveSoftware/counter-strike_rules_and_regs/blob/main/major-supplemental-rulebook.md#swiss-bracket).

 >In round 2 and 3, the highest seeded team faces the lowest seeded team available that does not result in a rematch within the stage.

## Example Matchups

Here's an example round 3 1-1 matchup pool. First we seed based on the [mid-stage seed calculation rules](https://github.com/ValveSoftware/counter-strike_rules_and_regs/blob/main/major-supplemental-rulebook.md#mid-stage-seed-calculation);

 > After the initial matches, seed is determined (in order) by:
 >
 > 1. Current W-L record in the stage
 > 1. Difficulty Score in the current stage
 > 1. Initial seeding of the current stage

| Team | Difficulty | Seed | Previous Opponents |
|------|------------|------|--------------------|
| 1    | 2          | 1    | 1>9, 16>1          |
| 5    | 2          | 5    | 5>13, 12>5         |
| 7    | 2          | 7    | 7>15, 10>7         |
| 11   | 2          | 11   | 11>3, 6>11         |
| 3    | -2         | 3    | 11>3, 3>14         |
| 9    | -2         | 9    | 1>9, 9>8           |
| 13   | -2         | 13   | 5>13, 13>4         |
| 15   | -2         | 15   | 7>15, 15>2         |

Then we follow the [rule for round 3 matchup assignment](https://github.com/ValveSoftware/counter-strike_rules_and_regs/blob/main/major-supplemental-rulebook.md#swiss-bracket):

 >In round 2 and 3, the highest seeded team faces the lowest seeded team available that does not result in a rematch within the stage.

The matchups are created from highest seed first, picking the lowest seed that doesn't result in a rematch:

- **1** is top seed, so they pair with the bottom seed **15** first
- **5** is next highest seed, but already played **13**, so they pair with the next lowest seed, which is **9**
- **7** is next highest seed, and pair with the lowest seed available, which is **13**
- **11** and **3** remain, **but they already played each other in round 1**.

### Resulting flawed matchups

| Team A | Team B |
|--------|--------|
| 1      | 15     |
| 5      | 9      |
| 7      | 13     |
| **11** | **3**  |

This conflicting matchup is **not** present when using the old seeding rules (1v16, 2v15, etc). There is no explanation in the rules how to resolve this scenario.

## Author's Opinion

To fix this, the rules should be updated to either:

1. Revert the Initial Swiss Matchups rule
1. Seed the teams using the Initial Swiss Matchups rule throughout the entire Swiss event
1. Add a rule to resolve the scenario where rematch conflicts appear (e.g. seed 3v5 & seed 4v6)

## Running the simulation

This project has code based on the [cs-buchholz-simulator](https://github.com/claabs/cs-buchholz-simulator), but modified to get better insight as to what match outcomes are most likely to cause the round 3 matchup rematch conflict.

To run on Node 20, just run:

```sh
npm i
npm start
```

It will simulate 600,000 Swiss Buchholz, which is usually enough to generate all 400 unique conflicting scenarios.

It then does some analysis on what scenarios are most likely to trigger the conflict. The results of that analysis can be found in [output](output).

### Analysis

[top-subsets](output/top-subsets.json) shows the top 10 combinations of results by subset length that are most likely to cause a conflict. For example, `16>1,9>8` with the count 120, means that 120 of the 400 conflicting scenarios contain 16 beating 1 and 9 beating 8.

Ultimately, the conditions that cause conflicting scenarios are very varied, so it's hard to make a definite rule describing what causes a round 3 conflict.

### Settings

In `initial-matchups.ts`, you can comment/uncomment the `generateInitialMatchups` definition to test out the original initial matchups rules, and see that it generates no conflicting scenarios.
