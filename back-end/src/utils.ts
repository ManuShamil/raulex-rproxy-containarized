import crypto from 'crypto'
import { GatewayURLStorageValue } from './types'

export function getIdFromGatewayId( gatewayId: string ): number {
    let loweredString = gatewayId.toLowerCase()
    let hash = crypto.createHash(`sha256`)
    hash.update( loweredString )

    let hashBytes = hash.digest()
    let idInt = hashBytes.readUInt32LE(0)

    return idInt
}

export function createURL( forwardTo: string ): GatewayURLStorageValue {
    const charSet = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`
    const length = 32
    const tokenLength = 16

    let newURL = ``
    while ( newURL.length < length )
        newURL += charSet.charAt(Math.floor(Math.random() * charSet.length))
    
    let storage: GatewayURLStorageValue = {
        gatewayId: newURL,
        resolvedId: getIdFromGatewayId( newURL),
        createdAt: Date.now(),
        token: crypto.randomBytes( tokenLength ).toString('hex'),
        forwardTo
    }


    return storage
}