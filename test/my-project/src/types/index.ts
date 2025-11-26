export interface Request {
    body: Record<string, any>;
    params: Record<string, string>;
    query: Record<string, string>;
}

export interface Response {
    status: (statusCode: number) => Response;
    json: (body: Record<string, any>) => void;
    send: (body: string) => void;
}