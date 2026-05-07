export interface IRequest extends Request {
  user: {
    sub: string;
  };
}
