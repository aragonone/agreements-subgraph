import { log } from '@graphprotocol/graph-ts'
import { DeployDAO } from '../types/DAOFactory/DAOFactory'
import { Kernel as KernelTemplate } from '../types/templates'

export function handleDeployDAO(event: DeployDAO): void {
  log.debug("New DAO: {}", [event.params.dao.toHexString()])
  KernelTemplate.create(event.params.dao)
}
