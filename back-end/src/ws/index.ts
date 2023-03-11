import io from 'socket.io'
import { ExpressApp } from '../express'
import { GatewayServer } from '../http'

import { ClientToServerEvents, IServiceResponse, ServerToClientEvents } from '../types'

export class WebSocketServer {
    public webSocketServer: io.Server<ClientToServerEvents, ServerToClientEvents>

    constructor( private server: GatewayServer) {
        this.webSocketServer = new io.Server<ClientToServerEvents, ServerToClientEvents>( server.httpServer, 
            {
                cors: {
                    origin: '*',
                    methods: ["GET", "POST"]
                }
            })

        this.bindAuthentication()
        this.bindEvents()
    }


    bindAuthentication() {
        this.webSocketServer.use( async ( socket, next ) => {
            let gatewayId       = socket.handshake.auth.url
            let clientToken     = socket.handshake.auth.token

            //! auth with redis gateway client.
            let gateway = await this.server.gatewayStorageClient.getURL( gatewayId )
            if ( !gateway ) {
                next( new Error(`Gateway: URL doesn't exist.`) )
                return
            }

            if ( gateway.token != clientToken ) {
                next( new Error(`Invalid token provided for ${gateway.gatewayId}`))
                return
            }

            socket.join( gatewayId ) //! possible to force make join client on authentication phase?
            next()
        })
    }

    bindEvents() {
        this.webSocketServer
            .on('onResponseFromService', (response: IServiceResponse) => {
                this.server.expressApp.sendGatewayResponse( response )
        })
    }


}


