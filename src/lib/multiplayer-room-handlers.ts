import {
  applyMultiplayerAction,
  orderedPlayers,
  restoreMultiplayerState,
  type MultiplayerAction,
  type MultiplayerState,
} from './multiplayer'
import type { UsionRoomHandlers } from '../hooks/useUsionRoomEvents'

type HandlerContext = {
  current: () => MultiplayerState
  commit: (state: MultiplayerState) => MultiplayerState
  revealIfReady: (state: MultiplayerState) => void
  applyAction: (message: MultiplayerAction) => MultiplayerState
}

export function createMultiplayerRoomHandlers({
  current,
  commit,
  revealIfReady,
  applyAction,
}: HandlerContext): UsionRoomHandlers {
  return {
    initialize: (config, user) => {
      const enabled = config.mode === 'multiplayer' && Boolean(config.roomId)
      commit({
        ...current(),
        enabled,
        phase: enabled ? 'connecting' : 'inactive',
        connection: enabled ? 'connecting' : 'offline',
        roomId: config.roomId ?? null,
        myId: user.id,
        hostId: config.playerIds?.[0] ?? user.id,
        expectedPlayerIds: config.playerIds ?? [user.id!],
        presentIds: [user.id!],
        players: {
          [user.id!]: { id: user.id!, name: user.name, avatar: user.avatar },
        },
      })
    },
    roomAssigned: (roomId) => {
      commit({
        ...current(),
        enabled: true,
        phase: 'connecting',
        connection: 'connecting',
        roomId,
        hostId: current().myId,
      })
    },
    joined: () => {
      const active = current()
      commit({
        ...active,
        enabled: true,
        phase: active.matchId ? active.phase : 'waiting',
        connection: 'connected',
        error: null,
      })
    },
    playerJoined: (playerIds, myId) => {
      commit({
        ...current(),
        presentIds: orderedPlayers(
          Array.from(new Set([...playerIds, myId])),
          current().hostId,
        ),
      })
    },
    playerLeft: (playerId, playerIds) => {
      const active = current()
      const next = commit({
        ...active,
        presentIds: orderedPlayers(playerIds, active.hostId),
        activePlayerIds: active.activePlayerIds.filter((id) => id !== playerId),
      })
      revealIfReady(next)
    },
    realtime: (message) => {
      if (message.action_type !== 'pano:player') return
      const active = current()
      const data = message.action_data
      const id = typeof data.id === 'string' ? data.id : message.player_id
      const name =
        typeof data.name === 'string' && data.name.trim()
          ? data.name.trim()
          : 'Explorer'
      const seen = Array.isArray(data.seen)
        ? data.seen.filter((value): value is string => typeof value === 'string')
        : null
      commit({
        ...active,
        presentIds: orderedPlayers(
          Array.from(new Set([...active.presentIds, id])),
          active.hostId,
        ),
        players: {
          ...active.players,
          [id]: {
            id,
            name,
            avatar: typeof data.avatar === 'string' ? data.avatar : null,
          },
        },
        seenByPlayer: seen
          ? { ...active.seenByPlayer, [id]: seen }
          : active.seenByPlayer,
      })
    },
    action: applyAction,
    sync: (snapshot, actions) => {
      let recovered = restoreMultiplayerState(current(), snapshot)
      for (const action of actions) {
        recovered = applyMultiplayerAction(recovered, action)
      }
      commit(recovered)
      revealIfReady(recovered)
    },
    connection: (connectionState) => {
      commit({
        ...current(),
        connection:
          connectionState === 'connected' || connectionState === 'reconnected'
            ? 'connected'
            : connectionState === 'rejoining'
              ? 'reconnecting'
              : 'offline',
      })
    },
    error: (error) => {
      commit({
        ...current(),
        phase: 'error',
        connection: 'offline',
        error,
      })
    },
  }
}
