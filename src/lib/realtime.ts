import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import { useEffect, useRef } from 'react';
import { API_URL, currentAccessToken } from './api';
import type { GroceryItem } from './types';

export interface HouseholdEvents {
  groceryListsChanged?: () => void;
  groceryItemUpserted?: (listId: string, item: GroceryItem) => void;
  groceryItemDeleted?: (listId: string, itemId: string) => void;
  /** Called after the connection drops and comes back, so the screen can reload anything it missed. */
  reconnected?: () => void;
}

/**
 * Listens to live changes in a household while the calling screen is mounted.
 * Handlers can change between renders without reconnecting.
 */
export function useHouseholdEvents(householdId: string | undefined, events: HouseholdEvents) {
  const handlers = useRef(events);
  handlers.current = events;

  useEffect(() => {
    if (!householdId) return;
    let stopped = false;

    const connection: HubConnection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/household`, { accessTokenFactory: currentAccessToken })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('groceryListsChanged', () => handlers.current.groceryListsChanged?.());
    connection.on('groceryItemUpserted', (listId: string, item: GroceryItem) => handlers.current.groceryItemUpserted?.(listId, item));
    connection.on('groceryItemDeleted', (listId: string, itemId: string) => handlers.current.groceryItemDeleted?.(listId, itemId));
    connection.onreconnected(async () => {
      await connection.invoke('JoinHousehold', householdId).catch(() => {});
      handlers.current.reconnected?.();
    });

    (async () => {
      try {
        await connection.start();
        if (stopped) return;
        await connection.invoke('JoinHousehold', householdId);
      } catch {
        // Live updates are a bonus: the screen still works with pull-to-refresh.
      }
    })();

    return () => {
      stopped = true;
      if (connection.state !== HubConnectionState.Disconnected) connection.stop();
    };
  }, [householdId]);
}
