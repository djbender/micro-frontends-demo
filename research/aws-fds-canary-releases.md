# AWS FDS: Canary Releases & Traffic Splitting

Source: https://github.com/awslabs/frontend-discovery-service

## Core Principle: Server-Side Version Selection

Version selection happens **server-side** in the Consumer API — the client never sees multiple versions. The API response contains exactly one version per MFE:

```json
{
  "microFrontends": {
    "my-widget": [
      { "url": "https://cdn.example.com/widget-2.0.0.js", "metadata": { "version": "2.0.0" } }
    ]
  }
}
```

The array always has one entry by the time it reaches the client. Single render is guaranteed because there is nothing to choose between.

## Schema

Each version entry in the manifest carries:

```json
{
  "url": "string",
  "fallbackUrl": "string",
  "metadata": {
    "version": "string",
    "integrity": "string"
  },
  "deployment": {
    "traffic": 0,
    "default": false
  }
}
```

- `deployment.traffic` — percentage of users (0–100) that should receive this version
- `deployment.default` — fallback version returned on any selection error

## Server-Side Selection Algorithm

1. Hash `userToken + active version URLs` → deterministic bucket (0–99)
2. Walk versions in order, accumulate `traffic` until bucket is covered — first match wins
3. On any error, return the `deployment.default: true` version

## User Stickiness

Because the hash is `userToken + active versions`, a given user receives the same version for the duration of that deployment — no random flipping between versions across requests.

## Canary Deployment Strategies

The Admin API accepts named strategies:

- `Canary10Percent5Minutes`
- `Linear10PercentEvery1Minute`
- etc.

These drive an AWS Step Functions state machine that gradually updates `traffic` percentages in DynamoDB over time. Example progression for `Linear10PercentEvery1Minute`:

| Minute | New version | Old version |
|--------|-------------|-------------|
| 1      | 10%         | 90%         |
| 2      | 20%         | 80%         |
| ...    | ...         | ...         |
| 10     | 100%        | 0%          |

## Architectural Separation

| API | Responsibility |
|-----|----------------|
| Admin API | Deployment strategies, traffic allocation, multi-version management |
| Consumer API | Returns one pre-selected version URL + metadata per MFE |

The client is intentionally kept dumb — it loads whatever URL it is handed.

## Bucketing Customization

The spec notes that user identification and group assignment is customizable to integrate with existing systems. The default mechanism uses a persistent cookie (`USER_TOKEN`), but the bucketing Lambda (`determineMFE.js`) can be replaced entirely.

## Relevance to This Project

`discovery.local.json` contains all version entries (multiple versions per MFE) because it stands in for the Consumer API response in local dev. The shell therefore performs the version selection that the spec assigns to the server. This is a correct dev-time adaptation — in production, the Consumer API would return a single-entry array and the shell would have nothing to select.
