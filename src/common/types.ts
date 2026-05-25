export interface IRequest extends Request {
  user: {
    sub: string;
  };
}

export const EnumSocketEvent = {
  GAME_FOUND: 'gameFound',
  PLAYER_JOINED: 'playerJoined',
  GAME_EDITED: 'gameEdited',
  PLAYER_KICKED: 'playerKicked',
  GAME_CLOSED: 'gameClosed',
  PLAYER_LEAVED: 'playerLeaved',
  NOTIFICATION_ARRIVED: 'notificationArrived',
  GAME_STARTED: 'gameStarted',
  RIVAL_MOVED: 'rivalMoved',
  GAME_FINISHED: 'gameFinished',
  RIVAL_GIVED_UP: 'rivalGivedUp',
  DRAW_REQUESTED: 'drawRequested',
  DRAW_DECLINED: 'drawDeclined',
} as const;
export type EnumSocketEvent =
  (typeof EnumSocketEvent)[keyof typeof EnumSocketEvent];
