import { RedisClientType } from '@redis/client'
import { AssertionError } from 'assert'
import { createClient } from 'redis'

import { v4 } from 'uuid'
import express from 'express'

import { 
    GatewayInfo,
    GatewayURLInfo,
    REDIS_NAMESPACE, RequestStorageValue
} from '../types'


interface IRedisRequestStorageClient {
    createRequest( gateway: GatewayURLInfo ): Promise<RequestStorageValue>
    deleteRequest( request: string ): Promise<boolean>
    getResponseController(): ActiveResponseController
}

interface ActiveResponseStorage {
    counterId?: number
    requestId: string
    request: express.Request
    response: express.Response
}

class ActiveResponseController {
    private counter: number
    private responseMap: Map<number, ActiveResponseStorage>
    constructor() {
        this.counter = 0
        this.responseMap = new Map<number, ActiveResponseStorage>
    }

    public onRequest( iStorage: ActiveResponseStorage ) {
        let counterId = this.counter++
        this.responseMap.set( counterId, {
            counterId,
            ...iStorage
        })
    }

    public getResponseStorage( requestId: number ) {
        return this.responseMap.get( requestId ) 
    }
}

export class RedisRequestStorageClient implements IRedisRequestStorageClient {
    private responseController: ActiveResponseController
    private redisClient: RedisClientType
    private isConnected: boolean

    constructor( url: string ) {
        this.redisClient = createClient({
            url: url,
            database: REDIS_NAMESPACE.REQUESTS
        })
        this.isConnected = false
        this.responseController = new ActiveResponseController()
        this.redisClient.on('connect', () => { 
            this.isConnected = true
            console.log(`CONNECTED TO REDIS REQUEST STORAGE: ${ url }`)
        })
        this.redisClient.connect()
    }

    public async connect() {
        await this.redisClient.connect()
    }

    private async assertConnection() {
        if ( this.isConnected ) return
        throw new AssertionError({ message: `Redis Client not connected!` })
    }

    public createRequest( gateway: GatewayURLInfo ): Promise<RequestStorageValue> {
        return new Promise<RequestStorageValue>( async resolve => {

            await this.assertConnection()

            let newRequestId = v4()
            let storage: RequestStorageValue = {
                requestID: newRequestId,
                createdAt: Date.now(),
                gateway: {
                    gatewayId: gateway.gatewayId,
                    resolvedId: gateway.resolvedId
                }
            }

            let result = await this.redisClient
                                .SET( newRequestId, JSON.stringify( storage ) )

            if (!result)
                throw new Error(`REDIS: Could not create request storage val.`)

            resolve( storage )
        })
    }

    public deleteRequest( requestId: string ): Promise<boolean> {
        return new Promise<boolean>( async resolve => {

            await this.assertConnection()

            let result = await this.redisClient.DEL( requestId )
            if ( !result )
                throw new Error(`REDIS: Couldn't delete request: ${requestId}`)
            resolve( true )
        })
    }

    public getResponseController() {
        return this.responseController
    }
}