
export interface GatewayURLInfo {
    gatewayId: string
    resolvedId: number
}

export interface GatewayInfo 
extends Pick<GatewayURLInfo, 'gatewayId' | 'resolvedId' > {
    token: string
}

export interface GatewayURLStorageValue 
extends GatewayInfo {
    forwardTo: string
    createdAt: number
}

export interface RequestStorageValue
{
    requestID: string
    createdAt: number
    gateway: Pick<GatewayURLStorageValue, 'gatewayId' | 'resolvedId'>
}

export enum REDIS_NAMESPACE {
    MAIN = 0,
    URLS = 1,
    REQUESTS = 2
}

export interface IForwardableRequest {
    gatewayId: string
    requestId: string
    method: string
    route: string
    body: object | any
}

export interface IForwardedRequest extends IForwardableRequest {}

export type ServiceResponse = Pick<IForwardedRequest, 'gatewayId' | 'requestId' | 'body'>
export interface IServiceResponse extends ServiceResponse {
    status: number
}


export interface ServerToClientEvents {
    onRequestForwarded: ( forwardedRequest: IForwardedRequest ) => void;
}

export interface ClientToServerEvents {
    onResponseFromService: ( response: IServiceResponse ) => void;
}