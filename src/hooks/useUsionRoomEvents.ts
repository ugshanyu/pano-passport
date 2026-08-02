import { useEffect, useRef } from 'react'
import {
  getUsionConfig,
  getUsionCurrentUser,
  getUsionGame,
  type UsionConfig,
  type UsionGameMessage,
} from '../lib/usion'
import { loadSeen } from '../lib/seen-rounds'

type CurrentUser = ReturnType<typeof getUsionCurrentUser>

export type UsionRoomHandlers = {
  initialize: (config: UsionConfig, user: CurrentUser) => void
  roomAssigned: (roomId: string) => void
  joined: () => void
  playerJoined: (playerIds: string[], myId: string) => void
  playerLeft: (playerId: string, playerIds: string[]) => void
  realtime: (message: UsionGameMessage) => void
  action: (message: UsionGameMessage) => void
  sync: (
    snapshot: Record<string, unknown> | undefined,
    actions: UsionGameMessage[],
  ) => void
  connection: (
    state: 'connected' | 'disconnected' | 'rejoining' | 'reconnected',
  ) => void
  error: (message: string) => void
}

export function useUsionRoomEvents(
  embedded: boolean,
  handlers: UsionRoomHandlers,
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!embedded) return
    const game = getUsionGame()
    const config = getUsionConfig()
    const user = getUsionCurrentUser()
    if (!user.id) return

    const announce = () => {
      game.realtime('pano:player', {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        seen: loadSeen(user.id),
      })
    }

    handlersRef.current.initialize(config, user)
    const unsubscribers = [
      game.onRoomAssigned(({ roomId }) => {
        handlersRef.current.roomAssigned(roomId)
      }),
      game.onJoined(() => {
        handlersRef.current.joined()
        announce()
        game.requestSync()
      }),
      game.onPlayerJoined(({ player_ids: playerIds }) => {
        handlersRef.current.playerJoined(playerIds, user.id!)
        announce()
      }),
      game.onPlayerLeft(({ player_id: playerId, player_ids: playerIds }) => {
        handlersRef.current.playerLeft(playerId, playerIds)
      }),
      game.onRealtime((message) => handlersRef.current.realtime(message)),
      game.onAction((message) => handlersRef.current.action(message)),
      game.onSync(({ game_state: snapshot, actions = [] }) => {
        handlersRef.current.sync(snapshot, actions)
      }),
      game.onConnectionState((state) => {
        handlersRef.current.connection(state)
      }),
    ]

    if (config.mode === 'multiplayer' && config.roomId) {
      void game
        .connect()
        .then(() => game.join(config.roomId!))
        .catch((error: unknown) => {
          handlersRef.current.error(
            error instanceof Error
              ? error.message
              : 'Could not join the Usion room.',
          )
        })
    }

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
    }
  }, [embedded])
}
