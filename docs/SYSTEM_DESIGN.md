# INTMAX2 Claim Aggregator - System Design

## 1. Overview

The INTMAX2 Claim Aggregator is responsible for consolidating claims and managing requests to the ZKP (Zero-Knowledge Proof). It comprises modular services for collecting claim requests, processing them with ZKP proofs, dispatching reward distribution periods, watching blockchain events, and shared utilities.

### 1.1 Project Structure

```txt
packages/
├── collector/
│   ├── src/
│   │   └── service/
│   └── package.json
├── dispatcher/
│   ├── src/
│   │   └── service/
│   └── package.json
├── processor/
│   ├── src/
│   │   ├── lib/
│   │   └── service/
│   └── package.json
├── reward/
│   ├── src/
│   │   ├── lib/
│   │   └── service/
│   └── package.json
├── shared/
│   ├── src/
│   │   ├── abi/
│   │   ├── blockchain/
│   │   ├── config/
│   │   ├── db/
│   │   ├── lib/
│   │   ├── typechainTypes/
│   │   └── types/
│   └── package.json
└── watcher/
    ├── src/
    │   └── service/
    └── package.json
```

This mono-repo is organized under the `packages/` directory, with each package focusing on a distinct role:
- **collector**: gathers pending claim processes and groups them.
- **dispatcher**: manages reward distribution periods and analyzes blockchain events for reward eligibility.
- **processor**: generates ZKP proofs based on the grouped claims and executes transactions on the contract.
- **reward**: calculates and manages reward distributions for eligible participants.
- **watcher**: monitors events, specifically pending claim processes, collects them, and updates their status accordingly.
- **shared**: common types, utilities, blockchain interfaces, and configuration shared across all packages.

## 2 High-Level Architecture

### 2.1 Claim Aggregation Flow

```txt
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │  Collector   │ ─────>│  Processor   │ ─────>│  Dispatcher  │ ─────>│   Watcher    │
  └──────────────┘       └──────────────┘       └──────────────┘       └──────────────┘
         │                       │                       │                       │
         ▼                       ▼                       ▼                       ▼
 Group Claims           Generate ZKP &        Analyze Periods &           Monitor Events
                        Execute Tx            Reward Distribution
         │                       │                       │                       │
         ▼                       ▼                       ▼                       ▼
    ┌───────────────────────────────────────────────────────────────────────────────┐
    │                           Data Sources                                        │
    │                                                                               │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐                    │
    │  │ PostgreSQL  │  │    Redis    │  │   RPC Provider      │                    │
    │  │  (Event &   │  │             │  │                     │                    │
    │  │   Claim)    │  │             │  │                     │                    │
    │  └─────────────┘  └─────────────┘  └─────────────────────┘                    │
    └───────────────────────────────────────────────────────────────────────────────┘
```

The claim aggregation system processes claim requests through four main stages:
1. **Collector** groups and organizes claim requests for efficient batch processing
2. **Processor** generates ZKP proofs and executes blockchain transactions
3. **Dispatcher** analyzes reward distribution periods and identifies eligible participants
4. **Watcher** monitors blockchain events for pending claims and updates database

### 2.2 Detailed Workflow

#### Stage 1: Claim Grouping (Collector)

The Collector service implements an intelligent batching mechanism to optimize gas costs:

1. **Threshold-based Grouping**: Claims are grouped based on two key thresholds:
   - **Minimum Wait Time**: Configurable minimum time (default: 5 minutes) before processing a batch
   - **Maximum Group Size**: Maximum number of claims per group (default: 50 claims)
2. **Queue Creation**: When either threshold is exceeded, the Collector creates a claim group and adds it to the Redis job queue for processing
3. **Gas Cost Optimization**: By batching multiple claims together, the system significantly reduces per-claim gas costs

#### Stage 2: ZKP Generation and Execution (Processor)

The Processor service handles the complex proof generation and blockchain submission workflow:

1. **Individual Claim Proofs**: Generate claim proofs for each claim in the group
2. **Wrapped Proof Creation**: Combine individual proofs into a single wrapped proof
3. **Gnark Proof Generation**: Create a Gnark-compatible proof from the wrapped proof
4. **Proof Formatting**: Format the proof data for smart contract compatibility
5. **Blockchain Submission**: Execute `submitClaimProof` transaction on the blockchain
6. **Verified** – As soon as the transaction in step 5 is accepted, the claims are marked **verified**.

#### Stage 3: Period Analysis and Reward Distribution (Dispatcher)

The Dispatcher service analyzes reward distribution periods and identifies eligible participants:

1. **Period Monitoring**: Continuously monitors current reward periods from the claim contract
2. **Event Analysis**: Analyzes blockchain events to determine participant eligibility for rewards
3. **Reward Calculation**: Calculates reward amounts for eligible participants based on contribution metrics
4. **Distribution Preparation**: Prepares reward distribution data for claim processing

#### Stage 4: Status Updates (Watcher)

The Watcher service monitors transactions and events to update claim statuses, completing the claim lifecycle.
It distinguishes between transaction-based and event-based triggers to ensure accurate real-time synchronization of claim status with on-chain activity.

| Trigger Source                             | Updated Status | Meaning                                                                                                        |
| ------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------- |
| `SubmitClaim` Transaction                  | verified       | A user has submitted a claim. Once the transaction is confirmed, the claim is marked as verified.              |
| `ClaimWatcherDirectWithdrawalQueued` Event | relayed        | The Dispatcher has relayed the claim, triggering this event which indicates it is queued for withdrawal.       |
| `DirectWithdrawalSuccessedEventLog` Event  | success        | The message has been successfully relayed via Scroll Messenger, and the claim has been processed and rewarded. |


### 2.3 Collector Service

```txt
┌──────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Collector    │ ──>│ Group Pending   │ ──>│ Create Job  │
│              │    │ Claims          │    │ Queue       │
└──────────────┘    └─────────────────┘    └─────────────┘
                           │                  │
                           ▼                  ▼
                     PostgreSQL           Redis Queue
                           │
                           ▼
              ┌─────────────────────────────┐
              │ Thresholds:                 │
              │ • Min Wait Time: x min      │
              │ • Max Group Size: xx        │
              └─────────────────────────────┘
```

The Collector service implements intelligent batching to optimize gas costs. It groups claims based on configurable thresholds (minimum wait time and maximum group size) and creates job queues in Redis when thresholds are exceeded.

### 2.4 Processor Service

```txt
┌──────────────┐    ┌─────────────────┐    ┌─────────────┐    ┌─────────────┐
│ Processor    │ ──>│ Generate        │ ──>│ Submit to   │ ──>│ Update DB   │
│              │    │ ZKP Proofs      │    │ Blockchain  │    └─────────────┘
└──────────────┘    └─────────────────┘    └─────────────┘           │
                           │                  │                      ▼
                           ▼                  ▼                 PostgreSQL
                   ┌─────────────────┐    Blockchain Network
                   │ ZKP Flow:       │
                   │ 1. Individual   │
                   │ 2. Wrapped      │
                   │ 3. Gnark        │
                   │ 4. Format       │
                   └─────────────────┘
```

The Processor service handles the complex multi-stage ZKP generation workflow, from individual claim proofs to final blockchain submission via `submitClaimProof` transaction.

### 2.5 Dispatcher Service

```txt
┌──────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Dispatcher   │ ──>│ Analyze Periods │ ──>│ Calculate   │
│              │    │ & Events        │    │ Rewards     │
└──────────────┘    └─────────────────┘    └─────────────┘
                           │                  │
                           ▼                  ▼
                    ┌─────────────────┐    PostgreSQL
                    │ Event Analysis: │
                    │ • Period data   │
                    │ • Participant   │
                    │   eligibility   │
                    │ • Contribution  │
                    │   metrics       │
                    └─────────────────┘
```

The Dispatcher service analyzes reward distribution periods and calculates participant eligibility and reward amounts based on blockchain events and contribution metrics.

### 2.6 Watcher Service

```txt
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Watcher     │ ──>│ Monitor Events  │ ──>│ Update DB   │
└─────────────┘    └─────────────────┘    └─────────────┘
                          │                  │
                          ▼                  ▼
                     RPC Provider         PostgreSQL
```

The Watcher service runs continuously to monitor on-chain events for pending claim processes. It fetches events from the RPC provider, parses and transforms them using shared utilities, and writes the structured records into PostgreSQL to maintain an up-to-date index.

### 2.7 Reward Service

```txt
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐    ┌─────────────┐
│ Reward      │ ──>│ Identify Block  │ ──>│ Calculate   │ ──>│ Distribute  │
│             │    │ Builders        │    │ Rewards     │    │ Rewards     │
└─────────────┘    └─────────────────┘    └─────────────┘    └─────────────┘
                          │                  │                  │
                          ▼                  ▼                  ▼
                   ┌─────────────────┐    ┌──────────────┐    Blockchain
                   │ Block Analysis: │    │ Reward       │    Contract
                   │ • Block data    │    │ Calculation  │
                   │ • Builder info  │    │ • Amount     │
                   │ • Performance   │    │ • Timing     │
                   │   metrics       │    │ • Eligibility│
                   └─────────────────┘    └──────────────┘
```

The Reward service operates independently from the main claim aggregation flow to handle block builder reward distribution. It analyzes block production data, calculates appropriate rewards based on builder performance, and executes reward distribution transactions directly to eligible block builders.

## 3. Components

### 3.1 Dispatcher Service

- Analyzes reward distribution periods from the claim contract
- Monitors blockchain events to determine participant eligibility for rewards
- Calculates reward amounts based on contribution metrics and participation data
- Identifies eligible participants for each reward period
- Prepares reward distribution data for claim processing

### 3.2 Watcher Service

- Monitors blockchain events for pending claim processes
- Continuously scans for claim-related events via RPC provider
- Updates PostgreSQL database with event data and claim status changes
- Ensures all claim requests are captured and tracked

### 3.3 Collector Service

- Gathers pending claim processes from the PostgreSQL database
- Implements intelligent batching mechanism for gas cost optimization
- Groups claims based on configurable thresholds:
  - **Minimum Wait Time**: Default 5 minutes before processing a batch
  - **Maximum Group Size**: Default 50 claims per group
- Creates job queues in Redis when thresholds are exceeded
- Optimizes claim aggregation to reduce gas costs and improve throughput

### 3.4 Processor Service

- Retrieves claim groups from Redis job queue for processing
- Implements multi-stage Zero-Knowledge Proof generation workflow:
  1. **Individual Claim Proofs**: Generate proofs for each claim in the group
  2. **Wrapped Proof Creation**: Combine individual proofs into a unified wrapped proof
  3. **Gnark Proof Generation**: Create Gnark-compatible proof format
  4. **Proof Formatting**: Format proof data for smart contract compatibility
- Executes `submitClaimProof` transactions on the blockchain
- Handles proof verification and blockchain interaction

### 3.5 Reward Service

- Operates independently from the main claim aggregation system
- Specifically handles block builder reward distribution
- Monitors and analyzes block production data and builder performance metrics
- Calculates reward amounts based on block builder contributions and performance
- Executes direct reward distribution transactions to eligible block builders
- Maintains reward history and tracks builder performance over time
- Provides APIs for block builder reward status and historical data

### 3.6 Shared Library

- `@intmax2-claim-aggregator/shared` contains common constants, types, utilities
- Provides blockchain interfaces, ABI definitions, and database schemas
- Includes logging, configuration management, and utility functions
- Offers typechain types for contract interaction

### 3.7 Database & Persistence

- PostgreSQL with separate databases for events and claims
- Redis for job queue management and caching
- Drizzle ORM for database schema management and migrations
- Structured event logging for audit trails

## 4. Data Flow

1. **Period Analysis**: Dispatcher service analyzes reward distribution periods and identifies eligible participants
2. **Event Monitoring**: Watcher service continuously monitors blockchain for claim-related events
3. **Data Collection**: Detected events are parsed and stored in PostgreSQL event database
4. **Intelligent Batching**: Collector service groups pending claims based on:
   - Minimum wait time threshold (5 minutes)
   - Maximum group size threshold (50 claims)
5. **Queue Management**: Claim groups are added to Redis job queue when thresholds are exceeded
6. **ZKP Generation Pipeline**: Processor service executes multi-stage proof generation:
   - Individual claim proofs
   - Wrapped proof creation
   - Gnark proof generation
   - Proof formatting for smart contract
7. **Blockchain Submission**: Formatted proofs are submitted via `submitClaimProof` transaction on the blockchain
8. **Status Tracking**: Watcher service monitors transaction results and updates claim statuses throughout the entire lifecycle

## 5. Scalability & Reliability

- **Stateless Services**: All services can scale horizontally with proper job queue management
- **Idempotent Operations**: Dispatcher, watcher, collector, and processor operations can be safely retried
- **Database Separation**: Event and claim data are separated for optimized performance
- **Redis Queue**: Manages job distribution and prevents duplicate processing
- **Health Checks & Monitoring**: Services include health endpoints and structured logging
- **Zero-Knowledge Proofs**: Ensures privacy and verification of claim batches

## 6. Security

- **Zero-Knowledge Proofs**: Claim batches are processed with ZKP for privacy and verification
- **Contract Security**: Smart contract interactions are validated and secured
- **Database Access Control**: PostgreSQL access is restricted and properly configured
- **Environment Variables**: Sensitive configuration is managed through environment variables
- **Input Validation**: Strict validation for all claim data and blockchain interactions

## 7. CI/CD & Testing

- **Vitest** unit and integration tests coverage for services and utilities
- **Tasks**: `yarn test`, `yarn check`, `yarn build` in CI pipeline.
- **Docker**: Containerized deployment with docker-compose for local development
- **Database Migrations**: Drizzle-based migrations for event and claim databases

## 8. Observability

- **Structured Logging**: Centralized logs via `logger` utility from shared package
- **Error Notifications**: Critical failures automatically trigger alerts through cloud-based monitoring services.