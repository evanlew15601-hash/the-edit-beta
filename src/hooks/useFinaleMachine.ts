import { useEffect, useReducer, useCallback } from 'react';
import {
  finaleReducer,
  initialFinaleState,
  FinaleEvent,
  FinaleState,
} from '@/utils/finaleStateMachine';

/**
 * Module-level singleton so the three finale screens
 * (Final3VoteScreen, FinaleScreen, JuryVoteScreen) share one machine
 * even as they mount/unmount during phase transitions.
 *
 * A simple subscriber set lets all mounted screens re-render on dispatch.
 */
let currentState: FinaleState = initialFinaleState;
const subscribers = new Set<(s: FinaleState) => void>();

function dispatchGlobal(event: FinaleEvent) {
  const next = finaleReducer(currentState, event);
  if (next === currentState) return;
  currentState = next;
  subscribers.forEach(cb => cb(currentState));
}

/** Reset the singleton — call when starting a new season. */
export function resetFinaleMachine() {
  currentState = initialFinaleState;
  subscribers.forEach(cb => cb(currentState));
}

export function useFinaleMachine() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const cb = () => forceUpdate();
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  const dispatch = useCallback((event: FinaleEvent) => {
    dispatchGlobal(event);
  }, []);

  return { state: currentState, dispatch };
}
