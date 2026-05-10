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
} as const;
export type EnumSocketEvent =
  (typeof EnumSocketEvent)[keyof typeof EnumSocketEvent];
