import express, { Express } from 'express'
import  cors from 'cors'
import { RedisGatewayStorageClient, RedisRequestStorageClient } from '../redis'
import morgan from 'morgan'
import { IForwardableRequest, IForwardedRequest, IServiceResponse } from '../types'
import { WebSocketServer } from '../ws'

export class ExpressApp {
    
    private expressApp: Express
    private webSocketServer: WebSocketServer | undefined

    constructor( private gatewayStorageClient: RedisGatewayStorageClient,
        private requestStorageClient: RedisRequestStorageClient ) {

        this.expressApp = express()
        this.expressApp.use( express.json() )
        this.expressApp.use( cors( { origin: '*'} ) )

        if ( process.env.DEVELOPMENT ) {
            console.log(`subdomain offset: 1`)
            this.expressApp.set( `subdomain offset`, 1 )
            this.expressApp.use( morgan('dev') )
        }
        
        this.bindGateway()
        this.bindNormalRoutes()
    }

    getNativeApp() {
        return this.expressApp
    }

    bindWebSocketLate( webSocketServer: WebSocketServer) {
        this.webSocketServer = webSocketServer
    }

    sendGatewayResponse( response: IServiceResponse ) {
        return new Promise<boolean>( async resolve => {
            let requestId = response.requestId
            let request = await this.requestStorageClient.deleteRequest( requestId )
            //! TODO

            this.requestStorageClient.getResponseController()
            .getResponseStorage( requestId )

        })
    }

    bindGateway() {
        this.expressApp.use(`*`, async (req, res, next) => {
            let [ gatewayId ] = req.subdomains

            if ( !gatewayId ) {
                next()
                return
            }

            let gateway;
            try {
                gateway = await this.gatewayStorageClient
                        .getURL( gatewayId )
                
                let requestStorageVal = await this.requestStorageClient
                                            .createRequest( gateway )

                //! forward the request to socket io room.
                let method = req.method
                let route = req.originalUrl

                let requestId = requestStorageVal.requestID

                //! construct forwardable reqeust.
                let toForward:IForwardableRequest = {
                    gatewayId,
                    requestId,
                    method,
                    route,
                    body: req.body
                }

                //! emit to room.
                this.webSocketServer?.webSocketServer
                    .to( gatewayId )
                    .emit( 'onRequestForwarded', toForward as IForwardedRequest)
                                        
                

            } catch (e) {

                res.status(404).json({
                    status: 404,
                    data: {
                        message: `Gateway ${gatewayId } not found!`
                    }
                })       
            }
        })
    }

    bindNormalRoutes() {
        this.expressApp.post(`/new`, async ( req, res, next ) => {
            let body = req.body
            let forwardTo = body.forwardTo

            let newGateway = await this.gatewayStorageClient.createURL( forwardTo )
            let newURL = 
                `${newGateway.gatewayId}.${process.env.WEB_URL ||
                    `localhost:${process.env.PORT}`}`

            console.log(`NEW GATEWAY: ${newURL}`)

            res.status(200)
            .json({
                url: newURL,
                ...newGateway
            })
        })
    }

}