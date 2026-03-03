# Platform Vision

## Overview

A web-based party game platform built on top of the Ember framework — essentially a free, more accessible alternative to Jackbox. The goal is to bring people emotionally closer through games, with a focus on friend groups.

## Naming

- **Framework:** Ember (open source, developer-facing)
- **Platform:** Bonfire (consumer-facing — the thing players interact with)
- **Package scope:** `@bonfire/*` (org-scoped under the Bonfire platform, avoids `@ember` npm conflict with Ember.js)

## Positioning

**"Free Jackbox with games that actually bring people closer."**

Jackbox is expensive ($25-40 per pack, $100+ to build a decent library) and skews silly/competitive. This platform targets the underserved niche of social bonding games — not trivia or competition, but games designed to create emotional closeness and genuine connection.

Primary audience: **friend groups**. Games support 2+ players so couples can play too, but marketing focuses on friends.

## Business Model

- **Only the host pays** — players join via room code for free, no account needed. Same model as Jackbox, maximizes accessibility.
- **Host accounts required** for billing. Player accounts are not required to join a game.
- **Free games + premium games** — free games act as a hook, premium games unlocked by a host subscription or one-time purchase.
- **Pricing:** Undercut Jackbox significantly. Target ~$5-8/month or $40-50/year for hosts. One Jackbox pack costs what a full year of this platform would cost.
- **Goal:** Sustainable revenue to cover infrastructure costs, with growth as a secondary goal. This is a cheaper alternative first, a business second.

## Content Moderation

Moderation is at the **game level**, not the session level. What happens inside a session between players is up to them — the platform doesn't police conversations. Games themselves must meet a quality/appropriateness bar:

- No games built entirely around explicit sexual content
- Games should be a platform for connection; the direction players take it is their own
- External game submissions go through a review queue before being published

## Game Library

### In-House Games (Now)
Games are built by us using Ember. Quality and tone are controlled. Intimacy/emotional closeness is the through-line. Goal is to knock out games steadily — a game a week is feasible with Ember's abstractions.

Current games:
- Intimacy Ladder V2

### External Games (Future)
Ember is open source. Developers can build games on top of it and host themselves. If a community game is high quality and gaining traction, it can be onboarded to the platform:
- Developer submits a repo or build artifact
- Goes through review queue
- Gets hosted on platform servers
- Developer benefits from discovery and existing user base

This is a curated model, not an open marketplace. Quality stays consistent.

### UGC / No-Code Builder
Not a priority. May be explored much later if the platform grows enough to warrant it.

## Player Accounts (Future)

Player accounts are not needed to play. As a future feature, optional player accounts could unlock:
- Game history and stats
- Saved funny moments
- Potentially social features

No friend lists or saved sessions planned until the platform has proven demand for them.

## Development Approach

Scaffold the platform **alongside Milestone 8 (second game)** rather than after. Easier to work out infrastructure, configuration, and architecture decisions early while the game library is small. Early issues are cheaper to fix with 2 games than with 10.

The platform is not a separate project — it grows alongside the game library.

## Relationship to Bonfire Framework

The platform (Bonfire) is the consumer-facing product. Ember is the developer-facing framework underneath it. Developers who want to build their own games use Ember directly and can self-host. The platform offers distribution, billing infrastructure, and an existing audience for games that meet the quality bar.

Think: Ember is the engine, Bonfire is the game store.
