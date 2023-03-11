import http from 'http'
import { ExpressApp } from '../express'
import { RedisGatewayStorageClient, RedisRequestStorageClient } from '../redis'
import { WebSocketServer } from '../ws'

export class GatewayServer {
    
    public httpServer: http.Server
    public expressApp: ExpressApp
    public webSocketServer: WebSocketServer
    public gatewayStorageClient: RedisGatewayStorageClient
    public requestStorageClient: RedisRequestStorageClient

    constructor( private iOptions: IGatewayOptions ) {
        this.gatewayStorageClient = new RedisGatewayStorageClient( iOptions.redisURL )
        this.requestStorageClient = new RedisRequestStorageClient( iOptions.redisURL )
        this.expressApp = new ExpressApp( this.gatewayStorageClient, this.requestStorageClient  )
        this.httpServer = http.createServer( this.expressApp.getNativeApp() )
        this.webSocketServer = new WebSocketServer( this )
        this.expressApp.bindWebSocketLate( this.webSocketServer )
    }

    deploy() {
        this.httpServer
            .listen( this.iOptions.port, () => console.log(`back-end: ${ this.iOptions.port }`) )
    }

}

export interface IGatewayOptions {
    redisURL: string
    port: number
}

export class GatewayServerBuilder {
    private options: IGatewayOptions
    constructor() {
        this.options = {} as IGatewayOptions
    }
    withPort( port: number ) {
        this.options.port = port
        return this
    }
    withRedisURL( redisURL: string ) {
        this.options.redisURL = redisURL
        return this
    }
    build() {
        this.options.redisURL = this.options.redisURL || `redis://localhost`
        this.options.port = this.options.port || 8000
        return new GatewayServer( this.options )
    }
}