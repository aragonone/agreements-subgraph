import { log } from '@graphprotocol/graph-ts'
import { NewAppProxy } from '../types/templates/Kernel/Kernel'
import { DAO, Agreement } from '../types/schema'
import { Agreement as AgreementTemplate } from '../types/templates'

let AGREEMENT_APP_ID = '0x1234567812345678123456781234567800000000000000000000000000000000'

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
