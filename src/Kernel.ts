import { log } from '@graphprotocol/graph-ts'
import { NewAppProxy } from '../types/templates/Kernel/Kernel'
import { DAO, Agreement } from '../types/schema'
import { Agreement as AgreementTemplate } from '../types/templates'

let AGREEMENT_APP_ID = '0x980c281816072b3147b96fa284b7b1e78d51f7df83e33073276b4d7e48b44e8f'

export function handleNewProxyApp(event: NewAppProxy): void {
  let appId = event.params.appId.toHexString()
  log.debug("New app proxy for app ID: {}", [appId])

  if (appId == AGREEMENT_APP_ID) {
    let daoAddress = event.address
    let dao = DAO.load(daoAddress.toHex())
    if (dao == null) {
      dao = new DAO(daoAddress.toHex())
      dao.save()
    }

    let agreementAddress = event.params.proxy
    AgreementTemplate.create(agreementAddress)

    let agreement = new Agreement(agreementAddress.toHex())
    agreement.dao = daoAddress.toHex()
    agreement.save()
  }
}
