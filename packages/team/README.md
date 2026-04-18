# @reasvyn/auth-team

Team, invitation, and multi-tenant collaboration primitives for Auth-TS.

## Overview

`@reasvyn/auth-team` provides the domain layer for team/workspace management. The root package exports the core types, adapter contract, and utility helpers. The React UI layer is exposed through the `@reasvyn/auth-team/react` subpath.

This package is designed around a bring-your-own-persistence approach. You implement a `TeamAdapter`, and the package handles domain semantics and optional UI composition.

## Key Features

- React provider, hooks, and UI components via subpath export
- Adapter interface for custom storage/ORM backends
- Team and member domain contracts
- Invitation lifecycle support
- Multi-tenant oriented role semantics: `owner`, `admin`, `member`, `viewer`
- Role hierarchy utilities
- Slug and invite token helpers

## Minimum Requirements

### Runtime Requirements

- React >= 18.0.0 for the `/react` subpath
- React DOM >= 18.0.0 for the `/react` subpath
- TailwindCSS >= 3.0.0 for packaged React UI styling

### Tech Stack

- TypeScript 5.x
- Adapter-driven persistence integration
- Optional React UI layer on top of core team primitives

## Quick Start

### 1. Install

```bash
npm install @reasvyn/auth-team
```

### 2. Implement a `TeamAdapter`

```ts
import type { TeamAdapter } from '@reasvyn/auth-team';

export const teamAdapter: TeamAdapter = {
  createTeam: async (data) => db.team.create({ data }),
  getTeam: async (teamId) => db.team.findUnique({ where: { id: teamId } }),
  getTeamBySlug: async (slug) => db.team.findUnique({ where: { slug } }),
  updateTeam: async (teamId, data) => db.team.update({ where: { id: teamId }, data }),
  deleteTeam: async (teamId) => {
    await db.team.delete({ where: { id: teamId } });
  },
  listUserTeams: async (userId) => db.team.findMany({ where: { members: { some: { userId } } } }),
  addMember: async (teamId, userId, role) => db.teamMember.create({ data: { teamId, userId, role } }),
  removeMember: async (teamId, userId) => {
    await db.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
  },
  updateMemberRole: async (teamId, userId, role) =>
    db.teamMember.update({ where: { teamId_userId: { teamId, userId } }, data: { role } }),
  listMembers: async (teamId) => db.teamMember.findMany({ where: { teamId } }),
  getMember: async (teamId, userId) => db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } }),
  createInvitation: async (data) => db.teamInvitation.create({ data }),
  getInvitationByToken: async (token) => db.teamInvitation.findUnique({ where: { token } }),
  getInvitationById: async (invitationId) => db.teamInvitation.findUnique({ where: { id: invitationId } }),
  updateInvitationStatus: async (invitationId, status) => {
    await db.teamInvitation.update({ where: { id: invitationId }, data: { status } });
  },
  listInvitations: async (teamId, status) => db.teamInvitation.findMany({ where: { teamId, ...(status ? { status } : {}) } }),
};
```

### 3. Use the React Layer

```tsx
import { TeamProvider, TeamSwitcher, useTeam } from '@reasvyn/auth-team/react';

function TeamShell({ userId }: { userId: string }) {
  return (
    <TeamProvider adapter={teamAdapter} userId={userId}>
      <TeamSwitcher />
    </TeamProvider>
  );
}
```

## Technical Reference

### Root Exports

- core types such as `Team`, `TeamMember`, `TeamInvitation`, `TeamRole`
- `TeamAdapter`
- utility helpers such as `slugify`, `generateInviteToken`, `isInvitationExpired`, `outranks`, `canChangeRole`

### Role Model

Current team roles:

- `owner`
- `admin`
- `member`
- `viewer`

### `TeamAdapter` Responsibilities

Required adapter groups:

- team CRUD
- member CRUD
- invitation CRUD

Optional:

- `sendInvitationEmail(invitation, team, inviteUrl)`

### React Subpath: `@reasvyn/auth-team/react`

Exports:

- `TeamProvider`
- `TeamContext`
- `useTeam`
- `useTeamMembers`
- `useTeamInvitations`
- `MemberRoleBadge`
- `TeamSwitcher`
- `TeamMembersList`
- `TeamInviteForm`
- `TeamCreateForm`
- `TeamSettingsForm`

## License

MIT

## Contributing

Follow the root [CONTRIBUTING.md](../../CONTRIBUTING.md) when changing role semantics, invitation flows, or adapter expectations.

## Security

Team membership and invitation flows can affect authorization boundaries. Report concerns through the root [SECURITY.md](../../SECURITY.md) or contact [reasvyn@gmail.com](mailto:reasvyn@gmail.com).
