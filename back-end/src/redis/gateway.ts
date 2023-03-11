import { RedisClientType } from '@redis/client'
import { AssertionError } from 'assert'
import { createClient } from 'redis'

import { 
    GatewayURLStorageValue,
    REDIS_NAMESPACE
} from '../types'

import { getIdFromGatewayId, createURL } from '../utils'

interface IRedisGatewayStorageClient {
    createURL( forwardTo: string ): Promise<GatewayURLStorageValue>
    URLExists( gatewayId: string ): Promise<boolean>
    deleteURL( gatewayId: string ): Promise<boolean>
    getURL( gatewayId: string): Promise<GatewayURLStorageValue>
}

export class RedisGatewayStorageClient implements IRedisGatewayStorageClient {
    private redisClient: RedisClientType
    private isConnected: boolean

    constructor( url: string ) {
        this.redisClient = createClient({
            url: url,
            database: REDIS_NAMESPACE.URLS
        })
        this.isConnected = false
        this.redisClient.on('connect', () => { 
            this.isConnected = true
            console.log(`CONNECTED TO REDIS GATEWAY STORAGE: ${ url }`)
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

    createURL( forwardTo: string ): Promise<GatewayURLStorageValue> {
        return new Promise<GatewayURLStorageValue>( async ( resolve, reject ) => {

            await this.assertConnection()
            
            let storage:GatewayURLStorageValue = createURL( forwardTo )

            //! save in db.
            let stored = await this.redisClient.SETNX( 
                storage.resolvedId.toString(), 
                JSON.stringify(storage)
            )

            if ( !stored )
                throw new Error(`REDIS: ${storage.gatewayId} already exists!`)

            //! get from db.
            let result = await this.redisClient.GET( 
                storage.resolvedId.toString() 
            )

            if ( result == undefined ) {
                reject(`REDIS: Error creating URL`)
                return
            }

            resolve( JSON.parse(result) )
        })
    }

    URLExists( gatewayId: string ): Promise<boolean> {
        return new Promise<boolean>( async (resolve ) => {

            await this.assertConnection()

            let resolvedId = getIdFromGatewayId( gatewayId )
            let result = await this.redisClient.GET( resolvedId.toString() )
            resolve( result == undefined )
        })
    }

    deleteURL( gatewayId: string ): Promise<boolean> {
        return new Promise<boolean>( async (resolve ) => {

            await this.assertConnection()

            let resolvedId = getIdFromGatewayId( gatewayId )
            let result = await this.redisClient.DEL( resolvedId.toString() )
            resolve( result == 1 ) 
        })
    }

    getURL( gatewayId: string ): Promise<GatewayURLStorageValue> {
        return new Promise<GatewayURLStorageValue>( async ( resolve, reject ) => {
            await this.assertConnection()

            let resolvedId = getIdFromGatewayId( gatewayId )
            let gatewayInfo = await this.redisClient.GET( resolvedId.toString() )

            if ( !gatewayInfo ) {
                reject(`REDIS: Gateway Not found!`)
                return
            }

            resolve( JSON.parse( gatewayInfo ) )
        })
    }
}