# Juniper Salon — Cancellation Waitlist

This prototype helps Juniper Salon coordinate last-minute appointment cancellations. It uses a durable Temporal Workflow to contact eligible waitlist clients in order, receive simulated responses, reserve the first acceptance pending staff confirmation, and record the outcome.

SMS and Square are deliberately simulated. Square remains the source of truth: the appointment is not marked filled until staff selects **Confirm in Square (simulated)**.

## Important: create a new public repository—do not fork

Your submission must be in a brand-new **public** GitHub repository. **Do not use GitHub’s Fork button.** Forks connect submissions through GitHub’s fork network and can make other participants’ work easier to locate.

Do not add `john-b-yang` or `vishakhpk` as collaborators. Because the repository is public, the assessment team can review it without write access.

Before the timed assessment:

1. Create a new **public** repository in your assigned GitHub organization. Do not initialize it with a README.
2. Clone the starter:

   ```bash
   git clone <STARTER_REPOSITORY_URL> temporal-assessment
   cd temporal-assessment
   ```

3. Point the clone at your new repository:

   ```bash
   git remote remove origin
   git branch -M main
   git remote add origin git@github.com:<YOUR_ORGANIZATION>/<YOUR_REPOSITORY>.git
   git push -u origin main
   ```

4. Confirm that GitHub displays the **Public** label and does not say “forked from” another repository.

If you accidentally create a fork, do not push assessment work to it. Create a new public repository, change your local `origin`, and ask the course team to remove the fork. Do not search for or view other participants’ assessment repositories.

## Verify setup before the timed assessment

Requirements: Node.js 20 or newer and Docker Desktop.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, choose **Start filling this opening**, then use the clearly labeled simulated accept/decline controls. An accepted client is held pending staff confirmation. You can inspect the durable Workflow, its Signals, and its history in the Temporal Web UI at <http://localhost:8233>.

Other commands:

```bash
npm test          # Run the starter Workflow test without Docker
npm run typecheck # Check TypeScript
npm run stop      # Stop the local Temporal service
```

## Repository map

- `src/workflows.ts` — durable cancellation-filling Workflow, response timer, and message handlers
- `src/worker.ts` — Worker and Task Queue configuration
- `src/api.ts` — browser-facing API and Temporal Client
- `src/types.ts` — shared data types
- `public/` — salon-friendly prototype dashboard
- `tests/` — Workflow test example

## Prototype assumptions

- Two eligible clients receive each simulated offer batch.
- Each batch has a durable 10-minute Temporal response timer.
- The first acceptance reserves the opening; it never books the appointment automatically.
- The static sample waitlist demonstrates service, availability, required-stylist, and waitlist-order rules.

You may change any application file. Do not edit generated files in `node_modules`.

## Documentation

- [TypeScript developer guide](https://docs.temporal.io/develop/typescript)
- [Workflows](https://docs.temporal.io/workflows)
- [Activities](https://docs.temporal.io/activities)
- [Signals, Queries, and Updates](https://docs.temporal.io/encyclopedia/workflow-message-passing)
