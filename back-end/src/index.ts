import { createClient } from 'redis'
import { createURL } from './utils'

import { RedisGatewayStorageClient } from './redis'
import { GatewayServerBuilder } from './http'

const REDIS_URL = process.env.REDIS_URL || `redis://localhost:6739`

let gatewayServer = new GatewayServerBuilder()
                        .withPort( 8000 )
                        .withRedisURL( REDIS_URL )
                        .build()



gatewayServer.deploy()