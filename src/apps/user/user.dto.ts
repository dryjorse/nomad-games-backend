export class UserDTO {
  id: string;
  email: string;
  password: string;
  username: string;
  ava: string | null;
  wins: number;
  createdAt: Date;
}

export class UserForAuthorizedDTO extends UserDTO {
  isFriend: boolean;
}

export class UserRatingResponseDTO {
  count: number;
  results: UserForAuthorizedDTO[];
}
