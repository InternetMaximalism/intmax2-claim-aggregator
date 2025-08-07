# INTMAX2 Withdrawal Aggregator - System Design

## 1. Overview

The INTMAX2 Withdrawal Aggregator is responsible for consolidating withdrawals and managing requests to the ZKP (Zero-Knowledge Proof). It comprises modular services for collecting withdrawal requests, processing them with ZKP proofs, watching blockchain events, and shared utilities.

### 1.1 Project Structure

```txt
packages/
├── collector/
│   ├── src/
│   │   └── service/
│   └── package.json
├── processor/
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
- **collector**: gathers pending withdrawal processes and groups them.
- **processor**: generates ZKP proofs based on the grouped withdrawals and executes transactions on the contract.
- **watcher**: monitors events, specifically pending withdrawal processes, collects them, and updates their status accordingly.
- **shared**: common types, utilities, blockchain interfaces, and configuration shared across all packages.

## 2 High-Level Architecture

### 2.1 Withdrawal Aggregation Flow

```txt
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │  Collector   │ ─────>│  Processor   │ ─────>│   Watcher    │
  └──────────────┘       └──────────────┘       └──────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
 Group Withdrawals       Generate ZKP &           Monitor Events
                         Execute Tx
         │                       │                       │
         ▼                       ▼                       ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                      Data Sources                           │
    │                                                             │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
    │  │ PostgreSQL  │  │    Redis    │  │   RPC Provider      │  │
    │  │  (Event &   │  │             │  │                     │  │
    │  │ Withdrawal) │  │             │  │                     │  │
    │  └─────────────┘  └─────────────┘  └─────────────────────┘  │
    └─────────────────────────────────────────────────────────────┘
```

The withdrawal aggregation system processes withdrawal requests through three main stages:
1. **Watcher** monitors blockchain events for pending withdrawals and updates database
2. **Collector** groups and organizes withdrawal requests for efficient batch processing
3. **Processor** generates ZKP proofs and executes blockchain transactions

### 2.2 Detailed Workflow

#### Stage 1: Event Detection (Watcher)

The Watcher service continuously monitors blockchain events and detects pending withdrawal processes, updating the PostgreSQL database with the latest withdrawal statuses.

#### Stage 2: Withdrawal Grouping (Collector)

The Collector service implements an intelligent batching mechanism to optimize gas costs:

1. **Threshold-based Grouping**: Withdrawals are grouped based on two key thresholds:
   - **Minimum Wait Time**: Configurable minimum time (default: 5 minutes) before processing a batch
   - **Maximum Group Size**: Maximum number of withdrawals per group (default: 50 withdrawals)
2. **Queue Creation**: When either threshold is exceeded, the Collector creates a withdrawal group and adds it to the Redis job queue for processing
3. **Gas Cost Optimization**: By batching multiple withdrawals together, the system significantly reduces per-withdrawal gas costs

#### Stage 3: ZKP Generation and Execution (Processor)

The Processor service handles the complex proof generation and blockchain submission workflow:

1. **Individual Withdrawal Proofs**: Generate withdrawal proofs for each withdrawal in the group
2. **Wrapped Proof Creation**: Combine individual proofs into a single wrapped proof
3. **Gnark Proof Generation**: Create a Gnark-compatible proof from the wrapped proof
4. **Proof Formatting**: Format the proof data for smart contract compatibility
5. **Blockchain Submission**: Execute `submitWithdrawalProof` transaction on Scroll network
6. **Relayed** – As soon as the transaction in step 5 is accepted, the withdrawals are marked **relayed**.

#### Stage 4: Status Updates (Watcher)

The **Watcher** service monitors submitted transactions and updates withdrawal statuses accordingly, completing the withdrawal lifecycle.
When messages from the Scroll Messenger are relayed to the liquidity contract, the following events are triggered:

- **`WithdrawalClaimable`**: Indicates that funds are available for the user to claim.
- **`DirectWithdrawalSucceeded`**: Indicates that the funds have been automatically transferred to the user.

The Watcher listens for these cross-chain events to update the withdrawal status to `need_claim` or `success` in real time, ensuring accurate status synchronization between L2 withdrawal requests and L1 confirmations.

Additionally, when a user manually claims their funds from the liquidity contract, the **`ClaimedWithdrawalEvent`** is emitted.
Upon detecting this event, the Watcher updates the withdrawal status from `need_claim` to `success`, finalizing the withdrawal process.


| Trigger Event                     | Updated Status | Meaning                                                                                      |
|----------------------------------|----------------|----------------------------------------------------------------------------------------------|
| `WithdrawalClaimable`            | `need_claim`   | Funds are now claimable. The user must manually claim funds via the liquidity contract.     |
| `DirectWithdrawalSucceeded`      | `success`      | Funds were automatically transferred to the user; no further action is needed.              |
| `ClaimedWithdrawalEvent`         | `success`      | User has claimed the funds from the liquidity contract; withdrawal is now complete.         |

### 2.3 Collector Service

```txt
┌──────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Collector    │ ──>│ Group Pending   │ ──>│ Create Job  │
│              │    │ Withdrawals     │    │ Queue       │
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

The Collector service implements intelligent batching to optimize gas costs. It groups withdrawals based on configurable thresholds (minimum wait time and maximum group size) and creates job queues in Redis when thresholds are exceeded.

### 2.4 Processor Service

```txt
┌──────────────┐    ┌─────────────────┐    ┌─────────────┐    ┌─────────────┐
│ Processor    │ ──>│ Generate        │ ──>│ Submit to   │ ──>│ Update DB   │
│              │    │ ZKP Proofs      │    │ Blockchain  │    └─────────────┘
└──────────────┘    └─────────────────┘    └─────────────┘           │
                           │                  │                      ▼
                           ▼                  ▼                 PostgreSQL
                   ┌─────────────────┐    Scroll Network
                   │ ZKP Flow:       │
                   │ 1. Individual   │
                   │ 2. Wrapped      │
                   │ 3. Gnark        │
                   │ 4. Format       │
                   └─────────────────┘
```

The Processor service handles the complex multi-stage ZKP generation workflow, from individual withdrawal proofs to final blockchain submission via `submitWithdrawalProof` transaction.


### 2.3 Watcher Service

```txt
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Watcher     │ ──>│ Monitor Events  │ ──>│ Update DB   │
└─────────────┘    └─────────────────┘    └─────────────┘
                          │                  │
                          ▼                  ▼
                     RPC Provider         PostgreSQL
```

 ┌─────────────┐
│ Update DB   │
  └─────────────┘
  │
    ▼
  ostgreSQL

The Watcher service runs continuously to monitor on-chain events for pending withdrawal processes. It fetches events from the RPC provider, parses and transforms them using shared utilities, and writes the structured records into PostgreSQL to maintain an up-to-date index.

## 3. Components

### 3.1 Watcher Service

- Monitors blockchain events for pending withdrawal processes
- Continuously scans for withdrawal-related events via RPC provider
- Updates PostgreSQL database with event data and withdrawal status changes
- Ensures all withdrawal requests are captured and tracked

### 3.2 Collector Service

- Gathers pending withdrawal processes from the PostgreSQL database
- Implements intelligent batching mechanism for gas cost optimization
- Groups withdrawals based on configurable thresholds:
  - **Minimum Wait Time**: Default 5 minutes before processing a batch
  - **Maximum Group Size**: Default 50 withdrawals per group
- Creates job queues in Redis when thresholds are exceeded
- Optimizes withdrawal aggregation to reduce gas costs and improve throughput

### 3.3 Processor Service

- Retrieves withdrawal groups from Redis job queue for processing
- Implements multi-stage Zero-Knowledge Proof generation workflow:
  1. **Individual Withdrawal Proofs**: Generate proofs for each withdrawal in the group
  2. **Wrapped Proof Creation**: Combine individual proofs into a unified wrapped proof
  3. **Gnark Proof Generation**: Create Gnark-compatible proof format
  4. **Proof Formatting**: Format proof data for smart contract compatibility
- Executes `submitWithdrawalProof` transactions on Scroll network
- Handles proof verification and blockchain interaction

### 3.4 Shared Library

- `@intmax2-withdrawal-aggregator/shared` contains common constants, types, utilities
- Provides blockchain interfaces, ABI definitions, and database schemas
- Includes logging, configuration management, and utility functions
- Offers typechain types for contract interaction

### 3.5 Database & Persistence

- PostgreSQL with separate databases for events and withdrawals
- Redis for job queue management and caching
- Drizzle ORM for database schema management and migrations
- Structured event logging for audit trails

## 4. Data Flow

1. **Event Monitoring**: Watcher service continuously monitors blockchain for withdrawal-related events
2. **Data Collection**: Detected events are parsed and stored in PostgreSQL event database
3. **Intelligent Batching**: Collector service groups pending withdrawals based on:
   - Minimum wait time threshold (5 minutes)
   - Maximum group size threshold (50 withdrawals)
4. **Queue Management**: Withdrawal groups are added to Redis job queue when thresholds are exceeded
5. **ZKP Generation Pipeline**: Processor service executes multi-stage proof generation:
   - Individual withdrawal proofs
   - Wrapped proof creation
   - Gnark proof generation
   - Proof formatting for smart contract
6. **Blockchain Submission**: Formatted proofs are submitted via `submitWithdrawalProof` transaction on Scroll
7. **Status Tracking**: Watcher service monitors transaction results and updates withdrawal statuses throughout the entire lifecycle

## 5. Scalability & Reliability

- **Stateless Services**: All services can scale horizontally with proper job queue management
- **Idempotent Operations**: Watcher, collector, and processor operations can be safely retried
- **Database Separation**: Event and withdrawal data are separated for optimized performance
- **Redis Queue**: Manages job distribution and prevents duplicate processing
- **Health Checks & Monitoring**: Services include health endpoints and structured logging
- **Zero-Knowledge Proofs**: Ensures privacy and verification of withdrawal batches

## 6. Security

- **Zero-Knowledge Proofs**: Withdrawal batches are processed with ZKP for privacy and verification
- **Contract Security**: Smart contract interactions are validated and secured
- **Database Access Control**: PostgreSQL access is restricted and properly configured
- **Environment Variables**: Sensitive configuration is managed through environment variables
- **Input Validation**: Strict validation for all withdrawal data and blockchain interactions

## 7. CI/CD & Testing

- **Vitest** unit and integration tests coverage for services and utilities
- **Tasks**: `yarn test`, `yarn check`, `yarn build` in CI pipeline.
- **Docker**: Containerized deployment with docker-compose for local development
- **Database Migrations**: Drizzle-based migrations for event and withdrawal databases

## 8. Observability

- **Structured Logging**: Centralized logs via `logger` utility from shared package
- **Error Notifications**: Critical failures automatically trigger alerts through cloud-based monitoring services.