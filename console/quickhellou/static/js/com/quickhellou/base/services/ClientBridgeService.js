import { BridgeService } from './BridgeService'

export class ClientBridgeService extends BridgeService {
  register() {
    super.register('userRegister', 'client')
  }
}
